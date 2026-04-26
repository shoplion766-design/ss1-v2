-- SS1 Platform — Schema complet v2
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Packages
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  price_fcfa DECIMAL(12,2),
  bv_points INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]',
  bogo_eligible BOOLEAN DEFAULT false,
  bogo_pack_slug VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  country VARCHAR(100),
  city VARCHAR(100),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  sponsor_id UUID REFERENCES users(id),
  package_id UUID REFERENCES packages(id),
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'stockist', 'admin', 'superadmin')),
  rank VARCHAR(50) DEFAULT 'INVEST',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  total_bv INTEGER DEFAULT 0,
  personal_pv DECIMAL(10,2) DEFAULT 0,
  token_balance DECIMAL(14,4) DEFAULT 0,
  lifetime_earnings DECIMAL(14,4) DEFAULT 0,
  preferred_currency VARCHAR(10) DEFAULT 'USD',
  avatar_url TEXT,
  language VARCHAR(5) DEFAULT 'fr',
  email_verified BOOLEAN DEFAULT false,
  locality VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tree (closure table)
CREATE TABLE referral_tree (
  ancestor_id UUID REFERENCES users(id),
  descendant_id UUID REFERENCES users(id),
  depth INTEGER NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

-- Earnings / Commissions
CREATE TABLE earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(60) NOT NULL CHECK (type IN (
    'retail_bonus','direct_sponsorship','upgrade_bonus',
    'matching_bonus','personal_purchase','seat_kit',
    'seat_product','seat_stockist','seat_cosmetic',
    'pool_bonus','ss1_cycle_bonus','award','voucher_bonus',
    'ecommerce_pv','stockist_local','bogo_bonus','token_purchase'
  )),
  amount_usd DECIMAL(10,4) NOT NULL,
  amount_retained DECIMAL(10,4) DEFAULT 0,
  amount_net DECIMAL(10,4) NOT NULL,
  amount_fcfa DECIMAL(12,2),
  source_user_id UUID REFERENCES users(id),
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tokens (jetons internes)
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  code VARCHAR(64) UNIQUE NOT NULL,
  amount DECIMAL(14,4) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  rate_to_usd DECIMAL(14,6) DEFAULT 1.0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','used','expired','cancelled')),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produits boutique
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  tagline VARCHAR(200),
  description TEXT,
  ingredients TEXT,
  price_usd DECIMAL(10,2) NOT NULL,
  price_fcfa DECIMAL(12,2),
  pv_points DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  category VARCHAR(50) DEFAULT 'supplement',
  stock_qty INTEGER DEFAULT 999,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commandes e-commerce
CREATE TABLE ecommerce_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  stockist_id UUID REFERENCES users(id),
  items JSONB NOT NULL DEFAULT '[]',
  total_usd DECIMAL(10,2) NOT NULL,
  total_pv DECIMAL(10,2) DEFAULT 0,
  total_fcfa DECIMAL(12,2),
  payment_method VARCHAR(50) DEFAULT 'balance',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled')),
  pv_bonus_usd DECIMAL(10,4) DEFAULT 0,
  stockist_commission DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount_usd DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) NOT NULL,
  account_details JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title_fr TEXT, title_en TEXT, title_ar TEXT,
  message_fr TEXT, message_en TEXT, message_ar TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Top performer snapshot (calculé 1x/mois par cron)
CREATE TABLE top_performers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  period VARCHAR(7) NOT NULL, -- YYYY-MM
  earnings_usd DECIMAL(14,4) DEFAULT 0,
  new_referrals INTEGER DEFAULT 0,
  total_pv DECIMAL(14,2) DEFAULT 0,
  rank INTEGER DEFAULT 1,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(period, rank)
);

-- ─── SEED PACKAGES ────────────────────────────────────
INSERT INTO packages (name, slug, price_usd, price_fcfa, bv_points, bogo_eligible, bogo_pack_slug, sort_order, description) VALUES
  ('INVEST',    'invest',    200,  120000,  200,  false, null,       1, 'Pack entrée — 200 BV'),
  ('KING',      'king',      1760, 1056000, 1760, false, null,       2, 'Pack premium — 1760 BV'),
  ('STOCKIST',  'stockist',  4650, 2790000, 4650, true,  'invest',   3, 'Pack stockiste — reçoit 1 INVEST gratuit'),
  ('AMBASSADOR','ambassador',7700, 4620000, 7700, true,  'king',     4, 'Pack ambassadeur — reçoit 1 KING gratuit');

-- ─── SEED PRODUCTS ────────────────────────────────────
INSERT INTO products (name, slug, tagline, ingredients, price_usd, price_fcfa, pv_points, image_url, sort_order) VALUES
  ('GLUCO-GUARD',    'gluco-guard',    'Glycemic Balance',   'Berberine, Cinnamon, Chromium, Alpha-Lipoic Acid, Zinc',        55, 33000, 5.5, '/product-gluco-guard.jpg',    1),
  ('PROSTA-CARE',    'prosta-care',    'Prostate Support',   'Saw Palmetto, Nettle, Zinc, Selenium, Lycopene',                55, 33000, 5.5, '/product-prosta-care.jpg',    2),
  ('RENAL-RESTORE',  'renal-restore',  'Kidney & Detox',     'Cranberry, Dandelion, Nettle, Magnesium',                       55, 33000, 5.5, '/product-renal-restore.jpg',  3),
  ('CELL-SHIELD',    'cell-shield',    'Immune Defense',     'Vitamin C, Zinc, Elderberry, Echinacea, Beta-Glucan',           55, 33000, 5.5, '/product-cell-shield.jpg',    4);

-- ─── SEED ADMIN ───────────────────────────────────────
INSERT INTO users (email, password_hash, first_name, last_name, referral_code, role, status, email_verified, preferred_currency)
VALUES ('admin@ss1.io', crypt('Admin@SS12024!', gen_salt('bf',12)), 'Admin', 'SS1', 'SS1ADMIN', 'superadmin', 'active', true, 'USD');

-- ─── CURRENCY RATES (table pour taux de change) ───────
CREATE TABLE currency_rates (
  currency VARCHAR(10) PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(50) NOT NULL,
  rate_to_usd DECIMAL(14,6) NOT NULL DEFAULT 1.0,
  tokens_per_usd DECIMAL(14,4) DEFAULT 1.0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO currency_rates (currency, symbol, name, rate_to_usd, tokens_per_usd) VALUES
  ('USD', '$',    'US Dollar',          1.000000, 1.0),
  ('EUR', '€',    'Euro',               1.080000, 1.08),
  ('XAF', 'FCFA', 'Franc CFA',          0.001613, 0.001613),
  ('GBP', '£',    'British Pound',      1.270000, 1.27),
  ('AED', 'AED',  'UAE Dirham',         0.272000, 0.272),
  ('MAD', 'MAD',  'Moroccan Dirham',    0.099000, 0.099);

-- ─── INDEXES ──────────────────────────────────────────
CREATE INDEX idx_users_sponsor       ON users(sponsor_id);
CREATE INDEX idx_users_referral      ON users(referral_code);
CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_earnings_user       ON earnings(user_id);
CREATE INDEX idx_earnings_type       ON earnings(type);
CREATE INDEX idx_earnings_status     ON earnings(status);
CREATE INDEX idx_referral_anc        ON referral_tree(ancestor_id);
CREATE INDEX idx_referral_desc       ON referral_tree(descendant_id);
CREATE INDEX idx_notif_user          ON notifications(user_id, is_read);
CREATE INDEX idx_withdrawals_user    ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status  ON withdrawals(status);
CREATE INDEX idx_tokens_user         ON tokens(user_id);
CREATE INDEX idx_tokens_status       ON tokens(status);
CREATE INDEX idx_eco_orders_user     ON ecommerce_orders(user_id);
CREATE INDEX idx_top_perf_period     ON top_performers(period, rank);

-- ─── TRIGGER updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
