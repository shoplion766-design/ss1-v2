const router = require('express').Router();

const RETENTION = 0.02; // 2% retenue sur chaque bonus

// ─── Helper: appliquer retenue 2% ─────────────────────
function applyRetention(amount) {
  const retained = parseFloat((amount * RETENTION).toFixed(4));
  const net = parseFloat((amount - retained).toFixed(4));
  return { retained, net };
}

// ─── Helper: crédit d'un gain avec retenue ─────────────
async function creditEarning(db, userId, type, amount, sourceUserId, description) {
  const { retained, net } = applyRetention(amount);
  await db.query(`
    INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, source_user_id, description, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'confirmed')`,
    [userId, type, amount, retained, net, sourceUserId || null, description || '']
  );
  // Mettre à jour lifetime_earnings et token_balance net
  await db.query(`
    UPDATE users SET
      lifetime_earnings = lifetime_earnings + $1,
      total_bv = total_bv + $2
    WHERE id=$3`,
    [net, 0, userId]
  );
  return { retained, net };
}

// ─── Dashboard ─────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const userId = req.user.userId;
  try {
    const [userRes, earningsRes, referralsRes, notifRes, topRes] = await Promise.all([
      req.db.query(`
        SELECT u.id, u.first_name, u.last_name, u.email, u.referral_code, u.rank,
               u.total_bv, u.personal_pv, u.token_balance, u.lifetime_earnings,
               u.preferred_currency, u.avatar_url, u.created_at, u.role, u.locality,
               p.name as package_name, p.price_usd, p.slug as package_slug,
               p.bogo_eligible
        FROM users u LEFT JOIN packages p ON u.package_id=p.id WHERE u.id=$1`, [userId]),
      req.db.query(`
        SELECT
          COALESCE(SUM(amount_net) FILTER (WHERE status='confirmed'),0) as confirmed_usd,
          COALESCE(SUM(amount_usd) FILTER (WHERE status='pending'),0)   as pending_usd,
          COALESCE(SUM(amount_net) FILTER (WHERE status='paid'),0)      as paid_usd,
          COALESCE(SUM(amount_retained),0)                              as total_retained,
          COUNT(*) as total_transactions
        FROM earnings WHERE user_id=$1`, [userId]),
      req.db.query(`SELECT COUNT(*) as direct_count FROM users WHERE sponsor_id=$1`, [userId]),
      req.db.query(`SELECT COUNT(*) as unread FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]),
      req.db.query(`
        SELECT u.first_name, u.last_name, u.avatar_url, u.country, u.rank,
               tp.earnings_usd, tp.new_referrals, tp.total_pv
        FROM top_performers tp JOIN users u ON u.id=tp.user_id
        WHERE tp.period=TO_CHAR(NOW(),'YYYY-MM') AND tp.rank=1
        LIMIT 1`),
    ]);
    const monthlyRes = await req.db.query(`
      SELECT TO_CHAR(created_at,'YYYY-MM') as month, SUM(amount_net) as total
      FROM earnings WHERE user_id=$1 AND created_at > NOW()-INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC`, [userId]);
    res.json({
      user: userRes.rows[0],
      earnings: earningsRes.rows[0],
      directReferrals: parseInt(referralsRes.rows[0].direct_count),
      unreadNotifications: parseInt(notifRes.rows[0].unread),
      monthlyEarnings: monthlyRes.rows,
      topPerformer: topRes.rows[0] || null,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Referral Tree ─────────────────────────────────────
router.get('/referrals', async (req, res) => {
  const userId = req.user.userId;
  const depth = Math.min(parseInt(req.query.depth) || 3, 5);
  try {
    const result = await req.db.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.referral_code,
             u.rank, u.status, u.total_bv, u.created_at, u.avatar_url,
             p.name as package_name, rt.depth, u.sponsor_id
      FROM referral_tree rt JOIN users u ON u.id=rt.descendant_id
      LEFT JOIN packages p ON u.package_id=p.id
      WHERE rt.ancestor_id=$1 AND rt.depth>0 AND rt.depth<=$2
      ORDER BY rt.depth ASC, u.created_at DESC`, [userId, depth]);
    const nodes = result.rows;
    const map = {};
    nodes.forEach(n => { map[n.id] = { ...n, children: [] }; });
    const roots = [];
    nodes.forEach(n => {
      if (n.sponsor_id === userId) roots.push(map[n.id]);
      else if (map[n.sponsor_id]) map[n.sponsor_id].children.push(map[n.id]);
    });
    const byLevel = {};
    nodes.forEach(n => {
      if (!byLevel[n.depth]) byLevel[n.depth] = { count: 0, total_bv: 0 };
      byLevel[n.depth].count++;
      byLevel[n.depth].total_bv += parseInt(n.total_bv || 0);
    });
    res.json({ tree: roots, byLevel, total: nodes.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Earnings ──────────────────────────────────────────
router.get('/earnings', async (req, res) => {
  const userId = req.user.userId;
  const { page=1, limit=20, type } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const params = [userId];
    let where = 'e.user_id=$1';
    if (type) { params.push(type); where += ` AND e.type=$${params.length}`; }
    const [rows, count] = await Promise.all([
      req.db.query(`SELECT e.*, u.first_name||' '||u.last_name as source_name
        FROM earnings e LEFT JOIN users u ON u.id=e.source_user_id
        WHERE ${where} ORDER BY e.created_at DESC
        LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, parseInt(limit), offset]),
      req.db.query(`SELECT COUNT(*) FROM earnings e WHERE ${where}`, params),
    ]);
    res.json({ earnings: rows.rows, pagination: {
      total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit)
    }});
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.get('/earnings/summary', async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await req.db.query(`
      SELECT type, SUM(amount_usd) as total_usd, SUM(amount_net) as total_net,
             SUM(amount_retained) as total_retained, COUNT(*) as count
      FROM earnings WHERE user_id=$1 AND status!='pending'
      GROUP BY type ORDER BY total_usd DESC`, [userId]);
    res.json({ summary: result.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await req.db.query(`SELECT
      (SELECT COUNT(*) FROM referral_tree WHERE ancestor_id=$1 AND depth=1) as direct,
      (SELECT COUNT(*) FROM referral_tree WHERE ancestor_id=$1 AND depth=2) as level2,
      (SELECT COUNT(*) FROM referral_tree WHERE ancestor_id=$1 AND depth=3) as level3,
      (SELECT COALESCE(SUM(amount_net),0) FROM earnings WHERE user_id=$1 AND status='confirmed') as confirmed_balance,
      (SELECT COALESCE(SUM(amount_net),0) FROM earnings WHERE user_id=$1 AND status='paid') as total_paid,
      (SELECT lifetime_earnings FROM users WHERE id=$1) as lifetime_earnings,
      (SELECT total_bv FROM users WHERE id=$1) as total_bv`, [userId]);
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Notifications ─────────────────────────────────────
router.get('/notifications', async (req, res) => {
  const userId = req.user.userId;
  const lang = ['fr','en','ar'].includes(req.query.lang) ? req.query.lang : 'fr';
  try {
    const r = await req.db.query(`
      SELECT id, type, is_read, metadata, created_at,
        title_${lang} as title, message_${lang} as message
      FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [userId]);
    res.json({ notifications: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/notifications/read', async (req, res) => {
  const userId = req.user.userId;
  const { ids } = req.body;
  try {
    if (ids === 'all') await req.db.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [userId]);
    else if (Array.isArray(ids) && ids.length > 0)
      await req.db.query('UPDATE notifications SET is_read=true WHERE user_id=$1 AND id=ANY($2::uuid[])', [userId, ids]);
    res.json({ message: 'ok' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Profile ───────────────────────────────────────────
router.patch('/profile', async (req, res) => {
  const userId = req.user.userId;
  const { firstName, lastName, phone, country, city, language, preferredCurrency, locality } = req.body;
  try {
    await req.db.query(`UPDATE users SET
      first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
      phone=COALESCE($3,phone), country=COALESCE($4,country), city=COALESCE($5,city),
      language=COALESCE($6,language), preferred_currency=COALESCE($7,preferred_currency),
      locality=COALESCE($8,locality) WHERE id=$9`,
      [firstName, lastName, phone, country, city, language, preferredCurrency, locality, userId]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/profile/avatar', async (req, res) => {
  const userId = req.user.userId;
  const { avatarUrl } = req.body;
  if (!avatarUrl) return res.status(400).json({ error: 'avatarUrl required' });
  try {
    await req.db.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [avatarUrl, userId]);
    res.json({ message: 'Avatar updated', avatarUrl });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Withdrawal ────────────────────────────────────────
router.post('/withdraw', async (req, res) => {
  const userId = req.user.userId;
  const { amount, method, accountDetails } = req.body;
  if (!amount || isNaN(amount) || parseFloat(amount) < 10)
    return res.status(400).json({ error: 'Minimum $10' });
  if (!method) return res.status(400).json({ error: 'Method required' });
  try {
    const bal = await req.db.query(
      `SELECT COALESCE(SUM(amount_net),0) as available FROM earnings WHERE user_id=$1 AND status='confirmed'`, [userId]);
    if (parseFloat(amount) > parseFloat(bal.rows[0].available))
      return res.status(400).json({ error: `Solde insuffisant ($${parseFloat(bal.rows[0].available).toFixed(2)} disponible)` });
    await req.db.query(
      `INSERT INTO withdrawals (user_id, amount_usd, method, account_details) VALUES ($1,$2,$3,$4)`,
      [userId, amount, method, JSON.stringify(accountDetails || {})]);
    res.json({ message: 'Demande de retrait soumise' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── E-COMMERCE ────────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const r = await req.db.query(`SELECT * FROM products WHERE is_active=true ORDER BY sort_order ASC`);
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/orders', async (req, res) => {
  const userId = req.user.userId;
  const { items, paymentMethod = 'balance' } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'Panier vide' });

  const client = await req.db.connect();
  try {
    await client.query('BEGIN');

    // Calculer total
    let totalUsd = 0, totalPv = 0;
    const enrichedItems = [];
    for (const item of items) {
      const prod = await client.query('SELECT * FROM products WHERE id=$1 AND is_active=true', [item.productId]);
      if (prod.rows.length === 0) throw new Error(`Produit ${item.productId} introuvable`);
      const p = prod.rows[0];
      const qty = parseInt(item.qty) || 1;
      totalUsd += p.price_usd * qty;
      totalPv  += parseFloat(p.pv_points) * qty;
      enrichedItems.push({ productId: p.id, name: p.name, qty, price: p.price_usd, pv: p.pv_points });
    }

    // Vérifier solde
    const bal = await client.query(
      `SELECT COALESCE(SUM(amount_net),0) as available FROM earnings WHERE user_id=$1 AND status='confirmed'`, [userId]);
    if (parseFloat(bal.rows[0].available) < totalUsd)
      throw new Error(`Solde insuffisant ($${parseFloat(bal.rows[0].available).toFixed(2)})`);

    // Trouver stockiste de la localité
    const userRes = await client.query('SELECT locality FROM users WHERE id=$1', [userId]);
    const locality = userRes.rows[0]?.locality;
    let stockistId = null;
    if (locality) {
      const st = await client.query(
        `SELECT id FROM users WHERE role='stockist' AND locality=$1 AND status='active' LIMIT 1`, [locality]);
      if (st.rows.length > 0) stockistId = st.rows[0].id;
    }

    // Bonus PV 20% → membre
    const pvBonus = parseFloat((totalPv * 0.20).toFixed(4));
    // Commission stockiste 6%
    const stockistCommission = parseFloat((totalUsd * 0.06).toFixed(4));

    // Créer commande
    const order = await client.query(`
      INSERT INTO ecommerce_orders (user_id, stockist_id, items, total_usd, total_pv, payment_method, pv_bonus_usd, stockist_commission, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'confirmed') RETURNING id`,
      [userId, stockistId, JSON.stringify(enrichedItems), totalUsd, totalPv, paymentMethod, pvBonus, stockistCommission]);

    // Débiter solde (créer earning négatif simulé via withdrawal interne)
    await client.query(`
      INSERT INTO withdrawals (user_id, amount_usd, method, account_details, status)
      VALUES ($1,$2,'ecommerce_purchase',$3,'paid')`,
      [userId, totalUsd, JSON.stringify({ orderId: order.rows[0].id })]);

    // Créditer bonus PV 20% au membre
    if (pvBonus > 0) {
      const { retained, net } = applyRetention(pvBonus);
      await client.query(`
        INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, description, status)
        VALUES ($1,'ecommerce_pv',$2,$3,$4,$5,'confirmed')`,
        [userId, pvBonus, retained, net, `Bonus PV 20% — commande ${order.rows[0].id.substring(0,8)}`]);
      await client.query(
        'UPDATE users SET lifetime_earnings=lifetime_earnings+$1 WHERE id=$2', [net, userId]);
    }

    // Créditer commission stockiste 6%
    if (stockistId && stockistCommission > 0) {
      const { retained, net } = applyRetention(stockistCommission);
      await client.query(`
        INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, source_user_id, description, status)
        VALUES ($1,'stockist_local',$2,$3,$4,$5,$6,'confirmed')`,
        [stockistId, stockistCommission, retained, net, userId,
         `6% commande ${order.rows[0].id.substring(0,8)} — ${locality || ''}`]);
      await client.query(
        'UPDATE users SET lifetime_earnings=lifetime_earnings+$1 WHERE id=$2', [net, stockistId]);
    }

    await client.query('COMMIT');
    res.json({ success: true, orderId: order.rows[0].id, pvBonus, totalUsd });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error' });
  } finally { client.release(); }
});

router.get('/orders', async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await req.db.query(
      `SELECT * FROM ecommerce_orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`, [userId]);
    res.json({ orders: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── TOKENS ────────────────────────────────────────────
router.get('/tokens/rates', async (req, res) => {
  try {
    const r = await req.db.query('SELECT * FROM currency_rates ORDER BY currency ASC');
    res.json({ rates: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/tokens/generate', async (req, res) => {
  const userId = req.user.userId;
  const { amountUsd, currency = 'USD' } = req.body;
  if (!amountUsd || isNaN(amountUsd) || parseFloat(amountUsd) <= 0)
    return res.status(400).json({ error: 'Montant invalide' });
  try {
    const rateRes = await req.db.query('SELECT * FROM currency_rates WHERE currency=$1', [currency]);
    if (rateRes.rows.length === 0) return res.status(400).json({ error: 'Devise non supportée' });
    const rate = rateRes.rows[0];
    const tokenAmount = parseFloat((parseFloat(amountUsd) * rate.tokens_per_usd).toFixed(4));

    // Vérifier solde
    const bal = await req.db.query(
      `SELECT COALESCE(SUM(amount_net),0) as available FROM earnings WHERE user_id=$1 AND status='confirmed'`, [userId]);
    if (parseFloat(amountUsd) > parseFloat(bal.rows[0].available))
      return res.status(400).json({ error: 'Solde insuffisant' });

    let code, tries = 0;
    while (tries < 5) {
      code = 'SS1-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase();
      const exists = await req.db.query('SELECT id FROM tokens WHERE code=$1', [code]);
      if (exists.rows.length === 0) break;
      tries++;
    }

    const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    await req.db.query(
      `INSERT INTO tokens (user_id, code, amount, currency, rate_to_usd, expires_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, code, tokenAmount, currency, rate.rate_to_usd, expiresAt]);
    await req.db.query('UPDATE users SET token_balance=token_balance+$1 WHERE id=$2', [tokenAmount, userId]);

    res.json({ code, amount: tokenAmount, currency, symbol: rate.symbol, expiresAt });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/tokens/my', async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await req.db.query(
      `SELECT t.*, cr.symbol FROM tokens t
       LEFT JOIN currency_rates cr ON cr.currency=t.currency
       WHERE t.user_id=$1 ORDER BY t.created_at DESC LIMIT 50`, [userId]);
    res.json({ tokens: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── VOUCHERS ──────────────────────────────────────────
router.post('/vouchers/generate', async (req, res) => {
  const userId = req.user.userId;
  const { discountType='percent', discountValue=10, bonusPercent=5, usesLimit=1, expiresInDays=30 } = req.body;
  if (!['percent','fixed'].includes(discountType)) return res.status(400).json({ error: 'Type invalide' });
  if (discountValue <= 0) return res.status(400).json({ error: 'Valeur > 0 requise' });
  try {
    let code, ok = false;
    for (let i = 0; i < 5; i++) {
      code = 'SS1-' + Math.random().toString(36).substring(2,9).toUpperCase();
      const ex = await req.db.query('SELECT id FROM vouchers WHERE code=$1', [code]);
      if (ex.rows.length === 0) { ok = true; break; }
    }
    if (!ok) return res.status(500).json({ error: 'Code unique impossible' });
    const expires = new Date(); expires.setDate(expires.getDate() + parseInt(expiresInDays));
    await req.db.query(
      `INSERT INTO vouchers (sponsor_id, code, discount_type, discount_value, bonus_percent, uses_limit, expires_at, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'member')`,
      [userId, code, discountType, discountValue, bonusPercent, usesLimit, expires]);
    res.json({ code, discountType, discountValue, bonusPercent, usesLimit, expiresAt: expires });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/vouchers/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code requis' });
  try {
    const v = await req.db.query(
      `SELECT id, code, discount_type, discount_value, bonus_percent, uses_limit, uses_count, expires_at
       FROM vouchers WHERE code=$1 AND is_active=true
         AND (expires_at IS NULL OR expires_at>NOW()) AND uses_count<uses_limit`,
      [code.trim().toUpperCase()]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Voucher invalide ou expiré' });
    res.json({ valid: true, voucher: v.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/vouchers/apply', async (req, res) => {
  const { userId, code } = req.body;
  if (!userId || !code) return res.status(400).json({ error: 'Données manquantes' });
  const client = await req.db.connect();
  try {
    await client.query('BEGIN');
    const vRes = await client.query(
      `SELECT * FROM vouchers WHERE code=$1 AND is_active=true
         AND (expires_at IS NULL OR expires_at>NOW()) AND uses_count<uses_limit FOR UPDATE`,
      [code.trim().toUpperCase()]);
    if (vRes.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Voucher invalide' }); }
    const v = vRes.rows[0];
    const used = await client.query('SELECT 1 FROM user_vouchers WHERE user_id=$1', [userId]);
    if (used.rows.length > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Voucher déjà utilisé' }); }
    await client.query('UPDATE vouchers SET uses_count=uses_count+1 WHERE id=$1', [v.id]);
    await client.query('INSERT INTO user_vouchers (user_id, voucher_id) VALUES ($1,$2)', [userId, v.id]);
    if (v.bonus_percent > 0) {
      const pkgRes = await client.query(
        `SELECT p.price_usd FROM users u LEFT JOIN packages p ON u.package_id=p.id WHERE u.id=$1`, [userId]);
      const price = parseFloat(pkgRes.rows[0]?.price_usd || 0);
      const bonus = price > 0 ? parseFloat((price * v.bonus_percent / 100).toFixed(4)) : 10;
      const { retained, net } = applyRetention(bonus);
      await client.query(
        `INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, description, status)
         VALUES ($1,'voucher_bonus',$2,$3,$4,$5,'confirmed')`,
        [v.sponsor_id, bonus, retained, net, `Bonus voucher ${code} (${v.bonus_percent}%)`]);
      await client.query('UPDATE users SET lifetime_earnings=lifetime_earnings+$1 WHERE id=$2', [net, v.sponsor_id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, discount: { type: v.discount_type, value: v.discount_value } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err); res.status(500).json({ error: 'Server error' });
  } finally { client.release(); }
});

router.get('/vouchers/my', async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await req.db.query(
      `SELECT code, discount_type, discount_value, bonus_percent, uses_limit, uses_count,
              expires_at, is_active, source, created_at, (uses_limit-uses_count) as remaining
       FROM vouchers WHERE sponsor_id=$1 ORDER BY created_at DESC`, [userId]);
    res.json({ vouchers: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/vouchers/:code/deactivate', async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await req.db.query(
      `UPDATE vouchers SET is_active=false WHERE code=$1 AND sponsor_id=$2 RETURNING id`,
      [req.params.code, userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Non trouvé' });
    res.json({ message: 'Voucher désactivé' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
