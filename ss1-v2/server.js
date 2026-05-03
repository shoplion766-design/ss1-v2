const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'ss1_jwt_secret';
const generateToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await pool.query('SELECT id, email, fullname, role FROM users WHERE id = $1', [decoded.userId]);
    if (!user.rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = user.rows[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullname, referralCode } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) return res.status(400).json({ error: 'Email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const refCode = uuidv4().slice(0, 8);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, fullname, referral_code, sponsor_code, role)
       VALUES ($1, $2, $3, $4, $5, 'affiliate') RETURNING id`,
      [email, hashed, fullname || email.split('@')[0], refCode, referralCode || null]
    );
    const token = generateToken(result.rows[0].id);
    res.json({ token, user: { id: result.rows[0].id, email, fullname, referralCode: refCode } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT id, email, fullname, password_hash, referral_code, role FROM users WHERE email = $1', [email]);
    if (!user.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user.rows[0].id);
    res.json({ token, user: { id: user.rows[0].id, email, fullname: user.rows[0].fullname, referralCode: user.rows[0].referral_code, role: user.rows[0].role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', auth, (req, res) => res.json(req.user));

app.get('/api/affiliate/stats', auth, async (req, res) => {
  try {
    const referrals = await pool.query('SELECT COUNT(*) FROM users WHERE sponsor_code = (SELECT referral_code FROM users WHERE id = $1)', [req.user.id]);
    const earnings = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM earnings WHERE user_id = $1', [req.user.id]);
    res.json({ referrals: parseInt(referrals.rows[0].count), totalEarnings: parseFloat(earnings.rows[0].total) });
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/affiliate/referrals', auth, async (req, res) => {
  const referrals = await pool.query(
    'SELECT id, email, fullname, created_at FROM users WHERE sponsor_code = (SELECT referral_code FROM users WHERE id = $1)',
    [req.user.id]
  );
  res.json(referrals.rows);
});

app.get('/api/admin/stats', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
  const totalEarnings = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM earnings');
  res.json({ totalUsers: parseInt(totalUsers.rows[0].count), totalEarnings: parseFloat(totalEarnings.rows[0].total) });
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`SS1 Backend running on port ${PORT}`));
