const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3003;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

app.use((req, res, next) => {
  req.db = pool;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
});

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

app.use('/admin', requireAdmin, adminRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'admin' }));

app.use((err, req, res, next) => {
  console.error('Admin service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`✅ Admin service running on port ${PORT}`));
