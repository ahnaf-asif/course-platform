-- Create Enums
CREATE TYPE referral_earning_status AS ENUM ('COMMISSION_EARNED', 'REFUNDED_REVOKED');
CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 1. Referral Settings Table
CREATE TABLE referral_settings (
    id SERIAL PRIMARY KEY,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    buyer_discount_percentage NUMERIC(5, 2) NOT NULL DEFAULT 5.00,
    min_payout_amount NUMERIC(10, 2) NOT NULL DEFAULT 500.00,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    terms_and_conditions TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial default settings if empty
INSERT INTO referral_settings (commission_percentage, buyer_discount_percentage, min_payout_amount, is_enabled, terms_and_conditions)
VALUES (10.00, 5.00, 500.00, TRUE, 'Refer friends and earn 10% commission on every course purchased through your unique referral code while your friends get a 5% discount.')
ON CONFLICT DO NOTHING;

-- 2. Referral Codes Table
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);

-- 3. Add referral_code column to orders table for tracking
ALTER TABLE orders ADD COLUMN referral_code VARCHAR(6);

-- 4. Referral Earnings Table
CREATE TABLE referral_earnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    order_amount NUMERIC(10, 2) NOT NULL,
    commission_percentage NUMERIC(5, 2) NOT NULL,
    commission_earned NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    status referral_earning_status NOT NULL DEFAULT 'COMMISSION_EARNED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_user_id);
CREATE INDEX idx_referral_earnings_referred ON referral_earnings(referred_user_id);
CREATE INDEX idx_referral_earnings_created_at ON referral_earnings(created_at);

-- 5. Referral Payouts Table
CREATE TABLE referral_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'bkash',
    account_number VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL',
    status payout_status NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100),
    admin_note TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_referral_payouts_user_id ON referral_payouts(user_id);
CREATE INDEX idx_referral_payouts_status ON referral_payouts(status);
CREATE INDEX idx_referral_payouts_created_at ON referral_payouts(created_at);
