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

-- name: CheckUserAccessToNode :one
WITH RECURSIVE ancestors AS (
    -- Anchor: start from the specific node
    SELECT n_anchor.id, n_anchor.parent_id, n_anchor.node_type
    FROM nodes n_anchor
    WHERE n_anchor.id = $1
    UNION ALL
    -- Recursive step: traverse up to the parent
    SELECT n_child.id, n_child.parent_id, n_child.node_type
    FROM nodes n_child
    JOIN ancestors a ON n_child.id = a.parent_id
)
SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = $2
      AND o.status = 'COMPLETED'
      AND o.node_id IN (SELECT a_out.id FROM ancestors a_out)
) as has_access;

-- name: GetOrderByTranID :one
SELECT * FROM orders
WHERE id = $1 LIMIT 1;

-- name: GetActiveOrderByUserAndNode :one
SELECT * FROM orders
WHERE user_id = $1 AND node_id = $2 AND status = 'COMPLETED'
LIMIT 1;

-- name: UpdateOrderReferenceAndStatus :one
UPDATE orders
SET status = $2, provider_reference = $3
WHERE id = $1
RETURNING *;

-- name: DeletePaymentGate :exec
DELETE FROM payment_gates
WHERE node_id = $1;

-- name: GetEnrolledCoursesByUser :many
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.slug, c.description, c.thumbnail_url, c.is_published,
       pg.price, pg.currency, o.created_at as enrolled_at
FROM orders o
JOIN nodes n ON o.node_id = n.id
JOIN courses c ON n.id = c.node_id
LEFT JOIN payment_gates pg ON n.id = pg.node_id
WHERE o.user_id = $1 AND o.status = 'COMPLETED'
ORDER BY o.created_at DESC;

