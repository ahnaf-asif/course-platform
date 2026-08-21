-- Settings Queries
-- name: GetReferralSettings :one
SELECT * FROM referral_settings ORDER BY id ASC LIMIT 1;

-- name: UpsertReferralSettings :one
INSERT INTO referral_settings (id, commission_percentage, buyer_discount_percentage, min_payout_amount, is_enabled, terms_and_conditions, updated_at)
VALUES (1, $1, $2, $3, $4, $5, NOW())
ON CONFLICT (id) DO UPDATE
SET commission_percentage = EXCLUDED.commission_percentage,
    buyer_discount_percentage = EXCLUDED.buyer_discount_percentage,
    min_payout_amount = EXCLUDED.min_payout_amount,
    is_enabled = EXCLUDED.is_enabled,
    terms_and_conditions = EXCLUDED.terms_and_conditions,
    updated_at = NOW()
RETURNING *;

-- Referral Codes
-- name: GetReferralCodeByUserID :one
SELECT * FROM referral_codes WHERE user_id = $1 LIMIT 1;

-- name: GetReferralCodeByCode :one
SELECT * FROM referral_codes WHERE code = $1 LIMIT 1;

-- name: CreateReferralCode :one
INSERT INTO referral_codes (user_id, code)
VALUES ($1, $2)
RETURNING *;

-- Referral Earnings & Balances
-- name: CreateReferralEarning :one
INSERT INTO referral_earnings (
    referrer_user_id,
    referred_user_id,
    order_id,
    node_id,
    order_amount,
    commission_percentage,
    commission_earned,
    currency,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetReferralEarningByOrderID :one
SELECT * FROM referral_earnings WHERE order_id = $1 LIMIT 1;

-- name: UpdateReferralEarningStatus :one
UPDATE referral_earnings
SET status = $2
WHERE order_id = $1
RETURNING *;

-- name: GetUserReferralBalances :one
SELECT
    COALESCE((
        SELECT SUM(re.commission_earned)
        FROM referral_earnings re
        WHERE re.referrer_user_id = $1 AND re.status = 'COMMISSION_EARNED'
    ), 0)::numeric(12,2) as total_earned,
    COALESCE((
        SELECT SUM(rp.amount)
        FROM referral_payouts rp
        WHERE rp.user_id = $1 AND rp.status = 'APPROVED'
    ), 0)::numeric(12,2) as total_withdrawn,
    COALESCE((
        SELECT SUM(rp.amount)
        FROM referral_payouts rp
        WHERE rp.user_id = $1 AND rp.status = 'PENDING'
    ), 0)::numeric(12,2) as pending_payout,
    COALESCE((
        SELECT COUNT(*)
        FROM referral_earnings re
        WHERE re.referrer_user_id = $1 AND re.status = 'COMMISSION_EARNED'
    ), 0)::bigint as total_referrals;

-- name: GetReferralEarningsByUser :many
SELECT
    re.id,
    re.order_id,
    re.node_id,
    COALESCE(c.title, n.node_type::text)::text as course_title,
    COALESCE(up.full_name, 'Unknown')::text as referred_user_name,
    u.email as referred_user_email,
    re.order_amount,
    re.commission_percentage,
    re.commission_earned,
    re.currency,
    re.status,
    re.created_at
FROM referral_earnings re
JOIN users u ON re.referred_user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
JOIN nodes n ON re.node_id = n.id
LEFT JOIN courses c ON n.id = c.node_id
WHERE re.referrer_user_id = $1
ORDER BY re.created_at DESC
LIMIT $2 OFFSET $3;

-- Payout Requests
-- name: CreatePayoutRequest :one
INSERT INTO referral_payouts (
    user_id,
    amount,
    currency,
    payment_method,
    account_number,
    account_type,
    status
) VALUES (
    $1, $2, $3, $4, $5, $6, 'PENDING'
)
RETURNING *;

-- name: GetPayoutByID :one
SELECT * FROM referral_payouts WHERE id = $1 LIMIT 1;

-- name: GetPayoutsByUser :many
SELECT * FROM referral_payouts
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- Admin Queries
-- name: AdminListPayouts :many
SELECT
    rp.id,
    rp.user_id,
    COALESCE(up.full_name, 'Unknown')::text as user_name,
    u.email as user_email,
    rp.amount,
    rp.currency,
    rp.payment_method,
    rp.account_number,
    rp.account_type,
    rp.status,
    rp.transaction_ref,
    rp.admin_note,
    rp.processed_at,
    rp.created_at,
    COUNT(*) OVER() as total_count
FROM referral_payouts rp
JOIN users u ON rp.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE
    (sqlc.narg('status')::payout_status IS NULL OR rp.status = sqlc.narg('status'))
    AND (
        sqlc.narg('search')::text IS NULL
        OR u.email ILIKE '%' || sqlc.narg('search') || '%'
        OR up.full_name ILIKE '%' || sqlc.narg('search') || '%'
        OR rp.account_number ILIKE '%' || sqlc.narg('search') || '%'
        OR rp.transaction_ref ILIKE '%' || sqlc.narg('search') || '%'
    )
ORDER BY rp.created_at DESC
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: AdminUpdatePayoutStatus :one
UPDATE referral_payouts
SET
    status = $2,
    transaction_ref = COALESCE($3, transaction_ref),
    admin_note = COALESCE($4, admin_note),
    processed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: AdminListAllReferralEarnings :many
SELECT
    re.id,
    re.referrer_user_id,
    COALESCE(rup.full_name, 'Unknown')::text as referrer_name,
    ru.email as referrer_email,
    re.referred_user_id,
    COALESCE(bup.full_name, 'Unknown')::text as referred_name,
    bu.email as referred_email,
    re.order_id,
    re.node_id,
    COALESCE(c.title, n.node_type::text)::text as course_title,
    re.order_amount,
    re.commission_percentage,
    re.commission_earned,
    re.currency,
    re.status,
    re.created_at,
    COUNT(*) OVER() as total_count
FROM referral_earnings re
JOIN users ru ON re.referrer_user_id = ru.id
LEFT JOIN user_profiles rup ON ru.id = rup.user_id
JOIN users bu ON re.referred_user_id = bu.id
LEFT JOIN user_profiles bup ON bu.id = bup.user_id
JOIN nodes n ON re.node_id = n.id
LEFT JOIN courses c ON n.id = c.node_id
WHERE
    (
        sqlc.narg('search')::text IS NULL
        OR ru.email ILIKE '%' || sqlc.narg('search') || '%'
        OR rup.full_name ILIKE '%' || sqlc.narg('search') || '%'
        OR bu.email ILIKE '%' || sqlc.narg('search') || '%'
        OR bup.full_name ILIKE '%' || sqlc.narg('search') || '%'
        OR c.title ILIKE '%' || sqlc.narg('search') || '%'
    )
ORDER BY re.created_at DESC
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: AdminGetReferralPlatformSummary :one
SELECT
    COALESCE((SELECT SUM(order_amount) FROM referral_earnings WHERE status = 'COMMISSION_EARNED'), 0)::numeric(12,2) as total_referral_sales,
    COALESCE((SELECT SUM(commission_earned) FROM referral_earnings WHERE status = 'COMMISSION_EARNED'), 0)::numeric(12,2) as total_commissions_earned,
    COALESCE((SELECT SUM(amount) FROM referral_payouts WHERE status = 'APPROVED'), 0)::numeric(12,2) as total_commissions_paid,
    COALESCE((SELECT SUM(amount) FROM referral_payouts WHERE status = 'PENDING'), 0)::numeric(12,2) as pending_payout_amount,
    (SELECT COUNT(*)::bigint FROM referral_payouts WHERE status = 'PENDING') as pending_payout_count,
    (SELECT COUNT(DISTINCT referrer_user_id)::bigint FROM referral_earnings) as active_affiliates_count;
