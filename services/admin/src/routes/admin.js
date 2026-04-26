const router = require('express').Router();

// ─── Stats globales ────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [statsRes, growthRes, topRes, stockRes] = await Promise.all([
      req.db.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role='member') as total_members,
        (SELECT COUNT(*) FROM users WHERE role='stockist') as total_stockists,
        (SELECT COUNT(*) FROM users WHERE status='active') as active_members,
        (SELECT COUNT(*) FROM users WHERE created_at>NOW()-INTERVAL'30 days') as new_month,
        (SELECT COALESCE(SUM(amount_usd),0) FROM earnings WHERE status='confirmed') as total_earnings,
        (SELECT COALESCE(SUM(amount_retained),0) FROM earnings) as total_retained,
        (SELECT COALESCE(SUM(total_usd),0) FROM ecommerce_orders WHERE status='confirmed') as ecommerce_volume,
        (SELECT COUNT(*) FROM withdrawals WHERE status='pending') as pending_withdrawals,
        (SELECT COUNT(*) FROM ecommerce_orders WHERE status='confirmed') as total_orders`),
      req.db.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, COUNT(*) as count
        FROM users WHERE role IN ('member','stockist') AND created_at>NOW()-INTERVAL'12 months'
        GROUP BY month ORDER BY month ASC`),
      req.db.query(`SELECT u.first_name, u.last_name, u.email, u.rank, u.avatar_url, u.country,
          COALESCE(SUM(e.amount_net),0) as total_earned,
          (SELECT COUNT(*) FROM users WHERE sponsor_id=u.id) as direct_referrals
        FROM users u LEFT JOIN earnings e ON e.user_id=u.id AND e.status='confirmed'
        WHERE u.role IN ('member','stockist')
        GROUP BY u.id ORDER BY total_earned DESC LIMIT 10`),
      req.db.query(`SELECT u.first_name, u.last_name, u.locality, u.email,
          COUNT(o.id) as orders_handled,
          COALESCE(SUM(e.amount_net),0) as commissions_earned
        FROM users u
        LEFT JOIN ecommerce_orders o ON o.stockist_id=u.id AND o.status='confirmed'
        LEFT JOIN earnings e ON e.user_id=u.id AND e.type='stockist_local'
        WHERE u.role='stockist' AND u.status='active'
        GROUP BY u.id ORDER BY commissions_earned DESC LIMIT 10`),
    ]);
    res.json({ stats: statsRes.rows[0], growth: growthRes.rows, topEarners: topRes.rows, stockists: stockRes.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Users list ────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { page=1, limit=20, search, status, rank, role } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const params = [];
    const conds = ["u.role IN ('member','stockist','admin')"];
    if (search) { params.push(`%${search}%`); conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
    if (status) { params.push(status); conds.push(`u.status=$${params.length}`); }
    if (rank)   { params.push(rank);   conds.push(`u.rank=$${params.length}`); }
    if (role)   { params.push(role);   conds.push(`u.role=$${params.length}`); }
    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      req.db.query(`SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.country, u.city,
          u.referral_code, u.rank, u.status, u.role, u.total_bv, u.lifetime_earnings,
          u.token_balance, u.avatar_url, u.locality, u.created_at,
          p.name as package_name, p.price_usd,
          s.first_name||' '||s.last_name as sponsor_name,
          (SELECT COUNT(*) FROM users WHERE sponsor_id=u.id) as direct_count
        FROM users u LEFT JOIN packages p ON u.package_id=p.id LEFT JOIN users s ON s.id=u.sponsor_id
        WHERE ${where} ORDER BY u.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, parseInt(limit), offset]),
      req.db.query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params),
    ]);
    res.json({ users: rows.rows, pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── User actions ──────────────────────────────────────
router.patch('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['active','suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await req.db.query('UPDATE users SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ message: `User ${status}` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/users/:id/role', async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  const { role } = req.body;
  if (!['member','stockist','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    await req.db.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/users/:id/rank', async (req, res) => {
  const { rank } = req.body;
  try {
    await req.db.query('UPDATE users SET rank=$1 WHERE id=$2', [rank, req.params.id]);
    res.json({ message: 'Rank updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/users/:id/credit', async (req, res) => {
  const { amount, type='award', description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const retained = parseFloat((amount * 0.02).toFixed(4));
  const net = parseFloat((amount - retained).toFixed(4));
  try {
    await req.db.query(`INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, description, status)
      VALUES ($1,$2,$3,$4,$5,$6,'confirmed')`,
      [req.params.id, type, amount, retained, net, description || 'Admin manual credit']);
    await req.db.query('UPDATE users SET lifetime_earnings=lifetime_earnings+$1 WHERE id=$2', [net, req.params.id]);
    res.json({ message: 'Credit added', retained, net });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Top performer (calcul mensuel) ───────────────────
router.post('/top-performer/calculate', async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  const period = req.body.period || new Date().toISOString().substring(0,7);
  try {
    const top = await req.db.query(`
      SELECT u.id, COALESCE(SUM(e.amount_net),0) as earnings_usd,
             COUNT(DISTINCT refs.id) as new_referrals,
             COALESCE(SUM(e2.total_pv),0) as total_pv
      FROM users u
      LEFT JOIN earnings e ON e.user_id=u.id AND e.status='confirmed'
        AND TO_CHAR(e.created_at,'YYYY-MM')=$1
      LEFT JOIN users refs ON refs.sponsor_id=u.id
        AND TO_CHAR(refs.created_at,'YYYY-MM')=$1
      LEFT JOIN ecommerce_orders e2 ON e2.user_id=u.id
        AND TO_CHAR(e2.created_at,'YYYY-MM')=$1
      WHERE u.role IN ('member','stockist') AND u.status='active'
      GROUP BY u.id ORDER BY earnings_usd DESC LIMIT 3`, [period]);
    for (let i = 0; i < top.rows.length; i++) {
      await req.db.query(`INSERT INTO top_performers (user_id, period, earnings_usd, new_referrals, total_pv, rank)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (period, rank) DO UPDATE SET user_id=$1, earnings_usd=$3, new_referrals=$4, total_pv=$5, calculated_at=NOW()`,
        [top.rows[i].id, period, top.rows[i].earnings_usd, top.rows[i].new_referrals, top.rows[i].total_pv, i+1]);
    }
    res.json({ message: `Top performer calculé pour ${period}`, count: top.rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Withdrawals ───────────────────────────────────────
router.get('/withdrawals', async (req, res) => {
  const { status='pending', page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const r = await req.db.query(`SELECT w.*, u.first_name, u.last_name, u.email
      FROM withdrawals w JOIN users u ON u.id=w.user_id
      WHERE w.status=$1 ORDER BY w.created_at DESC LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), offset]);
    res.json({ withdrawals: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/withdrawals/:id', async (req, res) => {
  const { status, adminNote } = req.body;
  if (!['approved','rejected','paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await req.db.query(
      `UPDATE withdrawals SET status=$1, admin_note=$2, processed_at=NOW() WHERE id=$3`,
      [status, adminNote, req.params.id]);
    res.json({ message: 'Withdrawal updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Produits admin ────────────────────────────────────
router.get('/products', async (req, res) => {
  try {
    const r = await req.db.query('SELECT * FROM products ORDER BY sort_order ASC');
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.post('/products', async (req, res) => {
  const { name, slug, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, category } = req.body;
  try {
    const r = await req.db.query(`INSERT INTO products (name, slug, tagline, description, ingredients, price_usd, price_fcfa, pv_points, image_url, category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [name, slug, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, category || 'supplement']);
    res.status(201).json({ id: r.rows[0].id, message: 'Produit créé' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.patch('/products/:id', async (req, res) => {
  const { name, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, isActive } = req.body;
  try {
    await req.db.query(`UPDATE products SET
      name=COALESCE($1,name), tagline=COALESCE($2,tagline), description=COALESCE($3,description),
      ingredients=COALESCE($4,ingredients), price_usd=COALESCE($5,price_usd),
      price_fcfa=COALESCE($6,price_fcfa), pv_points=COALESCE($7,pv_points),
      image_url=COALESCE($8,image_url), is_active=COALESCE($9,is_active) WHERE id=$10`,
      [name, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, isActive, req.params.id]);
    res.json({ message: 'Produit mis à jour' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Vouchers stockiste (admin vend aux stockistes) ───
router.post('/vouchers/create-for-stockist', async (req, res) => {
  const { stockistId, quantity=1, discountValue=10, discountType='percent', bonusPercent=5, pricePerVoucher=5 } = req.body;
  try {
    const stockist = await req.db.query(`SELECT id FROM users WHERE id=$1 AND role='stockist'`, [stockistId]);
    if (stockist.rows.length === 0) return res.status(404).json({ error: 'Stockiste non trouvé' });
    const codes = [];
    for (let i = 0; i < parseInt(quantity); i++) {
      const code = 'STCK-' + Math.random().toString(36).substring(2,10).toUpperCase();
      await req.db.query(`INSERT INTO vouchers (sponsor_id, code, discount_type, discount_value, bonus_percent, uses_limit, source, purchased_price_usd)
        VALUES ($1,$2,$3,$4,$5,1,'stockist',$6)`,
        [stockistId, code, discountType, discountValue, bonusPercent, pricePerVoucher]);
      codes.push(code);
    }
    res.json({ message: `${codes.length} vouchers créés`, codes });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ─── Notify ────────────────────────────────────────────
router.post('/notify', async (req, res) => {
  const { userId, type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, metadata } = req.body;
  try {
    if (userId === 'all') {
      await req.db.query(`INSERT INTO notifications (user_id, type, title_fr, title_en, title_ar, message_fr, message_en, message_ar, metadata)
        SELECT id,$1,$2,$3,$4,$5,$6,$7,$8 FROM users WHERE role IN ('member','stockist') AND status='active'`,
        [type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, JSON.stringify(metadata || {})]);
    } else {
      await req.db.query(`INSERT INTO notifications (user_id, type, title_fr, title_en, title_ar, message_fr, message_en, message_ar, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [userId, type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, JSON.stringify(metadata || {})]);
    }
    res.json({ message: 'Notification envoyée' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
