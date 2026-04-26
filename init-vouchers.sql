-- Vouchers v2 — stockistes redistribuent aux membres
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID REFERENCES users(id) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  bonus_percent INT DEFAULT 0,
  uses_limit INT DEFAULT 1,
  uses_count INT DEFAULT 0,
  source VARCHAR(20) DEFAULT 'member' CHECK (source IN ('member','stockist','admin')),
  purchased_price_usd DECIMAL(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_vouchers (
  user_id UUID REFERENCES users(id) PRIMARY KEY,
  voucher_id UUID REFERENCES vouchers(id),
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_sponsor ON vouchers(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code    ON vouchers(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_source  ON vouchers(source);
