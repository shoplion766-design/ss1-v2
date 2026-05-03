const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'ss1_jwt_super_secret_2024_xK9mP2';
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: 'Too many login attempts' } }));
app.use('/api/auth/register', rateLimit({ windowMs: 60*60*1000, max: 5, message: { error: 'Too many registrations' } }));

// ─── Helpers ───────────────────────────────────────────
function generateTokens(userId, role) {
  const access = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign({ userId }, JWT_REFRESH, { expiresIn: '30d' });
  return { access, refresh };
}

function generateReferralCode(firstName, lastName) {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${firstName.substring(0,2).toUpperCase()}${lastName.substring(0,2).toUpperCase()}${rand}`;
}

async function resolvePackageId(packageId) {
  if (!packageId) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(packageId)) return packageId;
  const result = await pool.query('SELECT id FROM packages WHERE LOWER(name)=LOWER($1)', [packageId]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

const RETENTION = 0.02;
function applyRetention(amount) {
  const retained = parseFloat((amount * RETENTION).toFixed(4));
  const net = parseFloat((amount - retained).toFixed(4));
  return { retained, net };
}

// ─── Middleware Auth ───────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!['admin','superadmin'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden - Admin only' });
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// ════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(2).required(),
    lastName: Joi.string().min(2).required(),
    phone: Joi.string().optional().allow(''),
    country: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    referralCode: Joi.string().optional().allow(''),
    packageId: Joi.string().optional(),
    language: Joi.string().valid('fr','en','ar').default('fr'),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { email, password, firstName, lastName, phone, country, city, referralCode, packageId, language } = value;
  try {
    const resolvedPackageId = await resolvePackageId(packageId);
    if (packageId && !resolvedPackageId) return res.status(400).json({ error: 'Invalid package' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
    let sponsorId = null;
    if (referralCode) {
      const sponsor = await pool.query('SELECT id FROM users WHERE referral_code=$1', [referralCode]);
      if (sponsor.rows.length === 0) return res.status(400).json({ error: 'Invalid referral code' });
      sponsorId = sponsor.rows[0].id;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const myReferralCode = generateReferralCode(firstName, lastName);
    const userId = uuidv4();
    await pool.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, phone, country, city, referral_code, sponsor_id, package_id, language)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [userId, email, passwordHash, firstName, lastName, phone, country, city, myReferralCode, sponsorId, resolvedPackageId || null, language]);
    if (sponsorId) {
      await pool.query('INSERT INTO referral_tree (ancestor_id, descendant_id, depth) VALUES ($1,$2,0)', [userId, userId]);
      await pool.query(`INSERT INTO referral_tree (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, $1, depth+1 FROM referral_tree WHERE descendant_id=$2`, [userId, sponsorId]);
    } else {
      await pool.query('INSERT INTO referral_tree (ancestor_id, descendant_id, depth) VALUES ($1,$2,0)', [userId, userId]);
    }
    const { access, refresh } = generateTokens(userId, 'member');
    await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')', [userId, refresh]);
    res.status(201).json({ message: 'Account created successfully', accessToken: access, refreshToken: refresh, user: { id: userId, email, firstName, lastName, referralCode: myReferralCode, role: 'member' } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const result = await pool.query('SELECT id, email, password_hash, first_name, last_name, role, status, referral_code, language FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const { access, refresh } = generateTokens(user.id, user.role);
    await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')', [user.id, refresh]);
    res.json({ accessToken: access, refreshToken: refresh, user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, referralCode: user.referral_code, language: user.language } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH);
    const stored = await pool.query('SELECT id FROM refresh_tokens WHERE token=$1 AND expires_at>NOW()', [refreshToken]);
    if (stored.rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await pool.query('SELECT id, role FROM users WHERE id=$1', [payload.userId]);
    if (user.rows.length === 0) return res.status(401).json({ error: 'User not found' });
    const { access, refresh } = generateTokens(user.rows[0].id, user.rows[0].role);
    await pool.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')', [user.rows[0].id, refresh]);
    res.json({ accessToken: access, refreshToken: refresh });
  } catch (err) { res.status(401).json({ error: 'Invalid refresh token' }); }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await pool.query(`SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.country, u.city,
      u.referral_code, u.role, u.rank, u.status, u.total_bv, u.personal_pv, u.language, u.created_at,
      p.name as package_name, p.price_usd as package_price
      FROM users u LEFT JOIN packages p ON u.package_id=p.id WHERE u.id=$1`, [req.user.userId]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await pool.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]).catch(() => {});
  res.json({ message: 'Logged out' });
});

app.post('/api/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, userId: payload.userId, role: payload.role });
  } catch { res.json({ valid: false }); }
});

// ════════════════════════════════════════════════════════
// AFFILIATE ROUTES
// ════════════════════════════════════════════════════════

app.get('/api/affiliate/dashboard', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const [userRes, earningsRes, referralsRes, notifRes] = await Promise.all([
      pool.query(`SELECT u.id, u.first_name, u.last_name, u.email, u.referral_code, u.rank,
        u.total_bv, u.personal_pv, u.token_balance, u.lifetime_earnings, u.preferred_currency, u.avatar_url, u.created_at, u.role,
        p.name as package_name, p.price_usd, p.slug as package_slug
        FROM users u LEFT JOIN packages p ON u.package_id=p.id WHERE u.id=$1`, [userId]),
      pool.query(`SELECT COALESCE(SUM(amount_net) FILTER (WHERE status='confirmed'),0) as confirmed_usd,
        COALESCE(SUM(amount_usd) FILTER (WHERE status='pending'),0) as pending_usd,
        COALESCE(SUM(amount_net) FILTER (WHERE status='paid'),0) as paid_usd,
        COALESCE(SUM(amount_retained),0) as total_retained, COUNT(*) as total_transactions
        FROM earnings WHERE user_id=$1`, [userId]),
      pool.query(`SELECT COUNT(*) as direct_count FROM users WHERE sponsor_id=$1`, [userId]),
      pool.query(`SELECT COUNT(*) as unread FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]),
    ]);
    const monthlyRes = await pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, SUM(amount_net) as total
      FROM earnings WHERE user_id=$1 AND created_at>NOW()-INTERVAL '6 months'
      GROUP BY month ORDER BY month ASC`, [userId]);
    res.json({ user: userRes.rows[0], earnings: earningsRes.rows[0], directReferrals: parseInt(referralsRes.rows[0].direct_count), unreadNotifications: parseInt(notifRes.rows[0].unread), monthlyEarnings: monthlyRes.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/referrals', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const depth = Math.min(parseInt(req.query.depth) || 3, 5);
  try {
    const result = await pool.query(`SELECT u.id, u.first_name, u.last_name, u.email, u.referral_code,
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
    res.json({ tree: roots, total: nodes.length });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/earnings', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { page=1, limit=20, type } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const params = [userId];
    let where = 'e.user_id=$1';
    if (type) { params.push(type); where += ` AND e.type=$${params.length}`; }
    const [rows, count] = await Promise.all([
      pool.query(`SELECT e.*, u.first_name||' '||u.last_name as source_name
        FROM earnings e LEFT JOIN users u ON u.id=e.source_user_id
        WHERE ${where} ORDER BY e.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM earnings e WHERE ${where}`, params),
    ]);
    res.json({ earnings: rows.rows, pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/earnings/summary', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(`SELECT type, SUM(amount_usd) as total_usd, SUM(amount_net) as total_net,
      SUM(amount_retained) as total_retained, COUNT(*) as count
      FROM earnings WHERE user_id=$1 AND status!='pending' GROUP BY type ORDER BY total_usd DESC`, [userId]);
    res.json({ summary: result.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/stats', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await pool.query(`SELECT
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

app.get('/api/affiliate/notifications', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const lang = ['fr','en','ar'].includes(req.query.lang) ? req.query.lang : 'fr';
  try {
    const r = await pool.query(`SELECT id, type, is_read, metadata, created_at,
      title_${lang} as title, message_${lang} as message
      FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [userId]);
    res.json({ notifications: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/affiliate/notifications/read', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { ids } = req.body;
  try {
    if (ids === 'all') await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [userId]);
    else if (Array.isArray(ids) && ids.length > 0)
      await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1 AND id=ANY($2::uuid[])', [userId, ids]);
    res.json({ message: 'ok' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/affiliate/profile', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { firstName, lastName, phone, country, city, language, preferredCurrency } = req.body;
  try {
    await pool.query(`UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name),
      phone=COALESCE($3,phone), country=COALESCE($4,country), city=COALESCE($5,city),
      language=COALESCE($6,language), preferred_currency=COALESCE($7,preferred_currency) WHERE id=$8`,
      [firstName, lastName, phone, country, city, language, preferredCurrency, userId]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/affiliate/withdraw', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  const { amount, method, accountDetails } = req.body;
  if (!amount || isNaN(amount) || parseFloat(amount) < 10) return res.status(400).json({ error: 'Minimum $10' });
  if (!method) return res.status(400).json({ error: 'Method required' });
  try {
    const bal = await pool.query(`SELECT COALESCE(SUM(amount_net),0) as available FROM earnings WHERE user_id=$1 AND status='confirmed'`, [userId]);
    if (parseFloat(amount) > parseFloat(bal.rows[0].available))
      return res.status(400).json({ error: `Solde insuffisant ($${parseFloat(bal.rows[0].available).toFixed(2)} disponible)` });
    await pool.query(`INSERT INTO withdrawals (user_id, amount_usd, method, account_details) VALUES ($1,$2,$3,$4)`,
      [userId, amount, method, JSON.stringify(accountDetails || {})]);
    res.json({ message: 'Demande de retrait soumise' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/products', requireAuth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products WHERE is_active=true ORDER BY sort_order ASC');
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/affiliate/vouchers/my', requireAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const r = await pool.query(`SELECT code, discount_type, discount_value, bonus_percent, uses_limit, uses_count,
      expires_at, is_active, source, created_at, (uses_limit-uses_count) as remaining
      FROM vouchers WHERE sponsor_id=$1 ORDER BY created_at DESC`, [userId]);
    res.json({ vouchers: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/affiliate/vouchers/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code requis' });
  try {
    const v = await pool.query(`SELECT id, code, discount_type, discount_value, bonus_percent, uses_limit, uses_count, expires_at
      FROM vouchers WHERE code=$1 AND is_active=true AND (expires_at IS NULL OR expires_at>NOW()) AND uses_count<uses_limit`,
      [code.trim().toUpperCase()]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Voucher invalide ou expiré' });
    res.json({ valid: true, voucher: v.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ════════════════════════════════════════════════════════
// ADMIN ROUTES
// ════════════════════════════════════════════════════════

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [statsRes, growthRes, topRes] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*) FROM users WHERE role='member') as total_members,
        (SELECT COUNT(*) FROM users WHERE role='stockist') as total_stockists,
        (SELECT COUNT(*) FROM users WHERE status='active') as active_members,
        (SELECT COUNT(*) FROM users WHERE created_at>NOW()-INTERVAL'30 days') as new_month,
        (SELECT COALESCE(SUM(amount_usd),0) FROM earnings WHERE status='confirmed') as total_earnings,
        (SELECT COALESCE(SUM(amount_retained),0) FROM earnings) as total_retained,
        (SELECT COUNT(*) FROM withdrawals WHERE status='pending') as pending_withdrawals`),
      pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, COUNT(*) as count
        FROM users WHERE role IN ('member','stockist') AND created_at>NOW()-INTERVAL'12 months'
        GROUP BY month ORDER BY month ASC`),
      pool.query(`SELECT u.first_name, u.last_name, u.email, u.rank, u.country,
        COALESCE(SUM(e.amount_net),0) as total_earned,
        (SELECT COUNT(*) FROM users WHERE sponsor_id=u.id) as direct_referrals
        FROM users u LEFT JOIN earnings e ON e.user_id=u.id AND e.status='confirmed'
        WHERE u.role IN ('member','stockist')
        GROUP BY u.id ORDER BY total_earned DESC LIMIT 10`),
    ]);
    res.json({ stats: statsRes.rows[0], growth: growthRes.rows, topEarners: topRes.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const { page=1, limit=20, search, status, rank, role } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const params = [];
    const conds = ["u.role IN ('member','stockist','admin')"];
    if (search) { params.push(`%${search}%`); conds.push(`(u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }
    if (status) { params.push(status); conds.push(`u.status=$${params.length}`); }
    if (rank) { params.push(rank); conds.push(`u.rank=$${params.length}`); }
    if (role) { params.push(role); conds.push(`u.role=$${params.length}`); }
    const where = conds.join(' AND ');
    const [rows, count] = await Promise.all([
      pool.query(`SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.country, u.city,
        u.referral_code, u.rank, u.status, u.role, u.total_bv, u.lifetime_earnings,
        u.token_balance, u.avatar_url, u.created_at, p.name as package_name,
        s.first_name||' '||s.last_name as sponsor_name,
        (SELECT COUNT(*) FROM users WHERE sponsor_id=u.id) as direct_count
        FROM users u LEFT JOIN packages p ON u.package_id=p.id LEFT JOIN users s ON s.id=u.sponsor_id
        WHERE ${where} ORDER BY u.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
        [...params, parseInt(limit), offset]),
      pool.query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params),
    ]);
    res.json({ users: rows.rows, pagination: { total: parseInt(count.rows[0].count), page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['active','suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query('UPDATE users SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ message: `User ${status}` });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/users/:id/rank', requireAdmin, async (req, res) => {
  const { rank } = req.body;
  try {
    await pool.query('UPDATE users SET rank=$1 WHERE id=$2', [rank, req.params.id]);
    res.json({ message: 'Rank updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/users/:id/credit', requireAdmin, async (req, res) => {
  const { amount, type='award', description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  const { retained, net } = applyRetention(amount);
  try {
    await pool.query(`INSERT INTO earnings (user_id, type, amount_usd, amount_retained, amount_net, description, status)
      VALUES ($1,$2,$3,$4,$5,$6,'confirmed')`,
      [req.params.id, type, amount, retained, net, description || 'Admin manual credit']);
    await pool.query('UPDATE users SET lifetime_earnings=lifetime_earnings+$1 WHERE id=$2', [net, req.params.id]);
    res.json({ message: 'Credit added', retained, net });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/withdrawals', requireAdmin, async (req, res) => {
  const { status='pending', page=1, limit=20 } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  try {
    const r = await pool.query(`SELECT w.*, u.first_name, u.last_name, u.email
      FROM withdrawals w JOIN users u ON u.id=w.user_id
      WHERE w.status=$1 ORDER BY w.created_at DESC LIMIT $2 OFFSET $3`,
      [status, parseInt(limit), offset]);
    res.json({ withdrawals: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.patch('/api/admin/withdrawals/:id', requireAdmin, async (req, res) => {
  const { status, adminNote } = req.body;
  if (!['approved','rejected','paid'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query(`UPDATE withdrawals SET status=$1, admin_note=$2, processed_at=NOW() WHERE id=$3`,
      [status, adminNote, req.params.id]);
    res.json({ message: 'Withdrawal updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/notify', requireAdmin, async (req, res) => {
  const { userId, type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, metadata } = req.body;
  try {
    if (userId === 'all') {
      await pool.query(`INSERT INTO notifications (user_id, type, title_fr, title_en, title_ar, message_fr, message_en, message_ar, metadata)
        SELECT id,$1,$2,$3,$4,$5,$6,$7,$8 FROM users WHERE role IN ('member','stockist') AND status='active'`,
        [type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, JSON.stringify(metadata || {})]);
    } else {
      await pool.query(`INSERT INTO notifications (user_id, type, title_fr, title_en, title_ar, message_fr, message_en, message_ar, metadata)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [userId, type, titleFr, titleEn, titleAr, msgFr, msgEn, msgAr, JSON.stringify(metadata || {})]);
    }
    res.json({ message: 'Notification envoyée' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM products ORDER BY sort_order ASC');
    res.json({ products: r.rows });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/admin/products', requireAdmin, async (req, res) => {
  const { name, slug, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, category } = req.body;
  try {
    const r = await pool.query(`INSERT INTO products (name, slug, tagline, description, ingredients, price_usd, price_fcfa, pv_points, image_url, category)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [name, slug, tagline, description, ingredients, priceUsd, priceFcfa, pvPoints, imageUrl, category || 'supplement']);
    res.status(201).json({ id: r.rows[0].id, message: 'Produit créé' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// ─── Health ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ss1-unified', version: '2.0.0' }));
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => console.log(`✅ SS1 Unified Backend running on port ${PORT}`));
