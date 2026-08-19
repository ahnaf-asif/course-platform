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
    UNION
    SELECT 1 FROM enrollments e
    WHERE e.user_id = $2
      AND e.node_id IN (SELECT a_out.id FROM ancestors a_out)
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
WITH RECURSIVE course_nodes AS (
    SELECT n.id as course_id, n.id as node_id
    FROM nodes n
    WHERE n.node_type = 'COURSE'
    UNION ALL
    SELECT cn.course_id, child.id as node_id
    FROM nodes child
    JOIN course_nodes cn ON child.parent_id = cn.node_id
),
user_engagements AS (
    -- Completed orders
    SELECT cn.course_id, o.created_at as engaged_at
    FROM orders o
    JOIN course_nodes cn ON o.node_id = cn.node_id
    WHERE o.user_id = $1 AND o.status = 'COMPLETED'

    UNION ALL

    -- Explicit enrollments
    SELECT cn.course_id, e.enrolled_at as engaged_at
    FROM enrollments e
    JOIN course_nodes cn ON e.node_id = cn.node_id
    WHERE e.user_id = $1

    UNION ALL

    -- Progress recorded
    SELECT cn.course_id, p.updated_at as engaged_at
    FROM progress p
    JOIN course_nodes cn ON p.node_id = cn.node_id
    WHERE p.user_id = $1
),
enrolled_courses AS (
    SELECT course_id, MIN(engaged_at)::timestamptz as enrolled_at
    FROM user_engagements
    GROUP BY course_id
)
SELECT 
    n.id,
    n.parent_id,
    n.node_type,
    n.created_at,
    c.title,
    c.slug,
    c.description,
    c.thumbnail_url,
    c.is_published,
    pg.price,
    pg.currency,
    ec.enrolled_at::timestamptz as enrolled_at
FROM enrolled_courses ec
JOIN nodes n ON ec.course_id = n.id
JOIN courses c ON n.id = c.node_id
LEFT JOIN payment_gates pg ON n.id = pg.node_id
ORDER BY ec.enrolled_at DESC;

-- name: AdminListOrders :many
SELECT 
    o.id,
    o.user_id,
    COALESCE(up.full_name, 'Unknown')::text as user_name,
    u.email as user_email,
    o.node_id,
    COALESCE(c.title, n.node_type::text)::text as course_title,
    COALESCE(c.slug, '')::text as course_slug,
    o.amount_paid,
    o.currency,
    o.status,
    o.payment_provider,
    o.provider_reference,
    o.coupon_id,
    cp.code as coupon_code,
    cp.discount_type as coupon_discount_type,
    cp.discount_value as coupon_discount_value,
    o.created_at,
    COUNT(*) OVER() as total_count
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
JOIN nodes n ON o.node_id = n.id
LEFT JOIN courses c ON n.id = c.node_id
LEFT JOIN coupons cp ON o.coupon_id = cp.id
WHERE 
    (sqlc.narg('status')::order_status IS NULL OR o.status = sqlc.narg('status'))
    AND (sqlc.narg('payment_provider')::text IS NULL OR o.payment_provider = sqlc.narg('payment_provider'))
    AND (
        sqlc.narg('search')::text IS NULL 
        OR u.email ILIKE '%' || sqlc.narg('search') || '%'
        OR up.full_name ILIKE '%' || sqlc.narg('search') || '%'
        OR c.title ILIKE '%' || sqlc.narg('search') || '%'
        OR o.provider_reference ILIKE '%' || sqlc.narg('search') || '%'
        OR o.id::text ILIKE '%' || sqlc.narg('search') || '%'
    )
ORDER BY o.created_at DESC
LIMIT sqlc.arg('limit')
OFFSET sqlc.arg('offset');

-- name: AdminGetOrderSummary :one
SELECT
    COUNT(*)::bigint as total_orders,
    COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN amount_paid ELSE 0 END), 0)::numeric(12,2) as total_revenue,
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::bigint as completed_orders,
    COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::bigint as pending_orders,
    COUNT(CASE WHEN status = 'REFUNDED' THEN 1 END)::bigint as refunded_orders
FROM orders;

-- name: AdminGetOrderByID :one
SELECT 
    o.id,
    o.user_id,
    COALESCE(up.full_name, 'Unknown')::text as user_name,
    u.email as user_email,
    u.role as user_role,
    o.node_id,
    n.node_type,
    COALESCE(c.title, n.node_type::text)::text as course_title,
    COALESCE(c.slug, '')::text as course_slug,
    COALESCE(c.thumbnail_url, '')::text as course_thumbnail_url,
    o.amount_paid,
    o.currency,
    o.status,
    o.payment_provider,
    o.provider_reference,
    o.coupon_id,
    cp.code as coupon_code,
    cp.discount_type as coupon_discount_type,
    cp.discount_value as coupon_discount_value,
    o.created_at
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
JOIN nodes n ON o.node_id = n.id
LEFT JOIN courses c ON n.id = c.node_id
LEFT JOIN coupons cp ON o.coupon_id = cp.id
WHERE o.id = $1
LIMIT 1;
