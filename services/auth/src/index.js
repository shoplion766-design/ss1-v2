const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const authRoutes = require('./routes/auth');
const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

let redisClient = null;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
  redisClient.on('error', (err) => console.error('Redis error:', err));
}

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/auth/login', rateLimit({ windowMs: 15*60*1000, max: 10, message: { error: 'Too many login attempts' } }));
app.use('/auth/register', rateLimit({ windowMs: 60*60*1000, max: 5, message: { error: 'Too many registrations' } }));
app.use((req, res, next) => {
  req.db = pool;
  req.redis = redisClient;
  next();
});
app.use('/auth', authRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth' }));
app.use((err, req, res, next) => {
  console.error('Auth service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
app.listen(PORT, () => console.log(`✅ Auth service running on port ${PORT}`));
