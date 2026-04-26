const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 4000;

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const AFFILIATE_URL = process.env.AFFILIATE_SERVICE_URL || 'http://affiliate-service:3002';
const ADMIN_URL = process.env.ADMIN_SERVICE_URL || 'http://admin-service:3003';
const JWT_SECRET = process.env.JWT_SECRET;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(morgan('combined'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, message: { error: 'Rate limit exceeded' } }));

function verifyToken(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
function requireAuth(req, res, next) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = payload.userId; req.userRole = payload.role; next();
}
function requireAdmin(req, res, next) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  if (!['admin','superadmin'].includes(payload.role)) return res.status(403).json({ error: 'Forbidden - Admin only' });
  req.userId = payload.userId; req.userRole = payload.role; next();
}

const proxyOpts = (target, rewrite = null) => {
  const opts = { target, changeOrigin: true, on: { error: (err, req, res) => { console.error(`Proxy error to ${target}:`, err.message); res.status(502).json({ error: 'Service unavailable' }); } } };
  if (rewrite) opts.pathRewrite = rewrite;
  return opts;
};

app.use('/api/auth', createProxyMiddleware(proxyOpts(AUTH_URL, { '^/api/auth': '/auth' })));
app.use('/api/affiliate', requireAuth, createProxyMiddleware(proxyOpts(AFFILIATE_URL, { '^/api/affiliate': '/affiliate' })));
app.use('/api/admin', requireAdmin, createProxyMiddleware(proxyOpts(ADMIN_URL, { '^/api/admin': '/admin' })));

app.get('/health', (req, res) => { res.json({ status: 'ok', service: 'gateway', services: { auth: AUTH_URL, affiliate: AFFILIATE_URL, admin: ADMIN_URL } }); });
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));
