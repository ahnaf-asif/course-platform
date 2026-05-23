-- Orders
-- name: CreateOrder :one
INSERT INTO orders (
    user_id,
    node_id,
    coupon_id,
    amount_paid,
    currency,
    status,
    payment_provider,
    provider_reference
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: UpdateOrderStatus :one
UPDATE orders
SET status = $2
WHERE id = $1
RETURNING *;

-- name: GetOrderByID :one
SELECT * FROM orders
WHERE id = $1 LIMIT 1;

-- name: GetOrdersByUser :many
SELECT * FROM orders
WHERE user_id = $1
ORDER BY created_at DESC;

-- Coupons
-- name: CreateCoupon :one
INSERT INTO coupons (
    code,
    discount_type,
    discount_value,
    max_uses,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetCouponByCode :one
SELECT * FROM coupons
WHERE code = $1 LIMIT 1;

-- name: IncrementCouponUsage :exec
UPDATE coupons
SET used_count = used_count + 1
WHERE id = $1;

-- Payment Gates
-- name: UpsertPaymentGate :one
INSERT INTO payment_gates (
    node_id,
    price,
    currency
) VALUES (
    $1, $2, $3
)
ON CONFLICT (node_id) DO UPDATE
SET
    price = EXCLUDED.price,
    currency = EXCLUDED.currency
RETURNING *;

-- name: GetPaymentGateByNode :one
SELECT * FROM payment_gates
WHERE node_id = $1 LIMIT 1;
