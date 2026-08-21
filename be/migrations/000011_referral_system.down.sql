DROP TABLE IF EXISTS referral_payouts;
DROP TABLE IF EXISTS referral_earnings;
ALTER TABLE orders DROP COLUMN IF EXISTS referral_code;
DROP TABLE IF EXISTS referral_codes;
DROP TABLE IF EXISTS referral_settings;
DROP TYPE IF EXISTS payout_status;
DROP TYPE IF EXISTS referral_earning_status;
