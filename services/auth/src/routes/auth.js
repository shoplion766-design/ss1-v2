const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';

// Helper: résoudre packageId (UUID ou nom)
async function resolvePackageId(pool, packageId) {
  if (!packageId) return null;
  // Si c'est déjà un UUID valide, le retourner
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(packageId)) return packageId;
  // Sinon, chercher par nom (case insensitive)
  const result = await pool.query('SELECT id FROM packages WHERE LOWER(name) = LOWER($1)', [packageId]);
  if (result.rows.length === 0) return null;
  return result.rows[0].id;
}

function generateReferralCode(firstName, lastName) {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${firstName.substring(0, 2).toUpperCase()}${lastName.substring(0, 2).toUpperCase()}${rand}`;
}

function generateTokens(userId, role) {
  const access = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '15m' });
  const refresh = jwt.sign({ userId }, JWT_REFRESH, { expiresIn: '30d' });
  return { access, refresh };
}

// Register
router.post('/register', async (req, res) => {
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
    language: Joi.string().valid('fr', 'en', 'ar').default('fr'),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  let { email, password, firstName, lastName, phone, country, city, referralCode, packageId, language } = value;

  try {
    // Résoudre l'ID du package (UUID ou nom)
    const resolvedPackageId = await resolvePackageId(req.db, packageId);
    if (packageId && !resolvedPackageId) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    const exists = await req.db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    let sponsorId = null;
    if (referralCode) {
      const sponsor = await req.db.query('SELECT id FROM users WHERE referral_code=$1', [referralCode]);
      if (sponsor.rows.length === 0) return res.status(400).json({ error: 'Invalid referral code' });
      sponsorId = sponsor.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const myReferralCode = generateReferralCode(firstName, lastName);
    const userId = uuidv4();

    await req.db.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, country, city,
        referral_code, sponsor_id, package_id, language)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [userId, email, passwordHash, firstName, lastName, phone, country, city,
        myReferralCode, sponsorId, resolvedPackageId || null, language]);

    if (sponsorId) {
      await req.db.query(
        'INSERT INTO referral_tree (ancestor_id, descendant_id, depth) VALUES ($1,$2,0)',
        [userId, userId]
      );
      await req.db.query(`
        INSERT INTO referral_tree (ancestor_id, descendant_id, depth)
        SELECT ancestor_id, $1, depth+1
        FROM referral_tree WHERE descendant_id=$2
      `, [userId, sponsorId]);
    } else {
      await req.db.query(
        'INSERT INTO referral_tree (ancestor_id, descendant_id, depth) VALUES ($1,$2,0)',
        [userId, userId]
      );
    }

    const { access, refresh } = generateTokens(userId, 'member');
    await req.db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')',
      [userId, refresh]
    );

    res.status(201).json({
      message: 'Account created successfully',
      accessToken: access,
      refreshToken: refresh,
      user: { id: userId, email, firstName, lastName, referralCode: myReferralCode, role: 'member' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login (inchangé)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await req.db.query(
      'SELECT id, email, password_hash, first_name, last_name, role, status, referral_code, language FROM users WHERE email=$1',
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { access, refresh } = generateTokens(user.id, user.role);
    await req.db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')',
      [user.id, refresh]
    );

    res.json({
      accessToken: access,
      refreshToken: refresh,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        referralCode: user.referral_code,
        language: user.language
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Refresh token (inchangé)
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH);
    const stored = await req.db.query(
      'SELECT id FROM refresh_tokens WHERE token=$1 AND expires_at>NOW()',
      [refreshToken]
    );
    if (stored.rows.length === 0) return res.status(401).json({ error: 'Invalid refresh token' });

    const user = await req.db.query('SELECT id, role FROM users WHERE id=$1', [payload.userId]);
    if (user.rows.length === 0) return res.status(401).json({ error: 'User not found' });

    const { access, refresh } = generateTokens(user.rows[0].id, user.rows[0].role);
    await req.db.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
    await req.db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,NOW()+INTERVAL\'30 days\')',
      [user.rows[0].id, refresh]
    );

    res.json({ accessToken: access, refreshToken: refresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Me (inchangé)
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await req.db.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.country, u.city,
             u.referral_code, u.role, u.rank, u.status, u.total_bv, u.personal_pv,
             u.language, u.created_at,
             p.name as package_name, p.price_usd as package_price
      FROM users u
      LEFT JOIN packages p ON u.package_id = p.id
      WHERE u.id=$1
    `, [payload.userId]);

    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (inchangé)
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await req.db.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]).catch(() => {});
  }
  res.json({ message: 'Logged out' });
});

// Verify (inchangé)
router.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, userId: payload.userId, role: payload.role });
  } catch {
    res.json({ valid: false });
  }
});

module.exports = router;
