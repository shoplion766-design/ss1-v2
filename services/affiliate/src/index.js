const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const affiliateRoutes = require('./routes/affiliate');

const app = express();
const PORT = process.env.PORT || 3002;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => console.error('Unexpected pool error', err));

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  req.db = pool;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Routes publiques (validate voucher sans auth)
app.post('/affiliate/vouchers/validate', affiliateRoutes);

// Routes protégées
app.use('/affiliate', requireAuth, affiliateRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'affiliate' }));

// Error handler global
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`✅ Affiliate service running on port ${PORT}`));
