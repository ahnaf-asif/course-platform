-- Enrollments
-- name: CreateEnrollment :one
INSERT INTO enrollments (
    user_id,
    node_id
) VALUES (
    $1, $2
)
ON CONFLICT (user_id, node_id) DO UPDATE
SET enrolled_at = enrollments.enrolled_at
RETURNING *;

-- name: GetEnrollment :one
SELECT * FROM enrollments
WHERE user_id = $1 AND node_id = $2;

-- name: ListEnrollmentsByUser :many
SELECT * FROM enrollments
WHERE user_id = $1
ORDER BY enrolled_at DESC;

-- Progress
-- name: UpsertProgress :one
INSERT INTO progress (
    user_id,
    node_id,
    status
) VALUES (
    $1, $2, $3
)
ON CONFLICT (user_id, node_id) DO UPDATE
SET
    status = CASE 
        WHEN progress.status = 'COMPLETED' AND EXCLUDED.status = 'STARTED' THEN progress.status 
        ELSE EXCLUDED.status 
    END,
    updated_at = NOW()
RETURNING *;

-- name: GetProgress :one
SELECT * FROM progress
WHERE user_id = $1 AND node_id = $2;

-- name: ListProgressByUser :many
SELECT * FROM progress
WHERE user_id = $1
ORDER BY updated_at DESC;

-- Certificates
-- name: CreateCertificate :one
INSERT INTO certificates (
    user_id,
    node_id,
    certificate_url
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetCertificate :one
SELECT * FROM certificates
WHERE id = $1;

-- Reviews
-- name: CreateReview :one
INSERT INTO reviews (
    user_id,
    node_id,
    rating,
    comment
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListReviewsByCourse :many
SELECT r.*, up.full_name, up.avatar_url
FROM reviews r
JOIN user_profiles up ON r.user_id = up.user_id
WHERE r.node_id = $1
ORDER BY r.created_at DESC;

-- Announcements
-- name: CreateAnnouncement :one
INSERT INTO announcements (
    node_id,
    title,
    body
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: ListAnnouncementsByCourse :many
SELECT * FROM announcements
WHERE node_id = $1
ORDER BY created_at DESC;

-- Notifications
-- name: CreateNotification :one
INSERT INTO notifications (
    user_id,
    type,
    message
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: MarkNotificationRead :exec
UPDATE notifications
SET is_read = TRUE
WHERE id = $1;

-- name: ListUnreadNotifications :many
SELECT * FROM notifications
WHERE user_id = $1 AND is_read = FALSE
ORDER BY created_at DESC;
