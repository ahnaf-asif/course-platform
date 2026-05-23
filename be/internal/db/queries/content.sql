-- Nodes
-- name: CreateNode :one
INSERT INTO nodes (
    parent_id,
    node_type
) VALUES (
    $1, $2
)
RETURNING *;

-- name: GetNodeWithType :one
SELECT * FROM nodes
WHERE id = $1 LIMIT 1;

-- name: GetChildNodes :many
SELECT * FROM nodes
WHERE parent_id = $1
ORDER BY created_at;

-- Courses
-- name: CreateCourse :one
INSERT INTO courses (
    node_id,
    title,
    description,
    thumbnail_url,
    is_published
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetCourse :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.description, c.thumbnail_url, c.is_published
FROM nodes n
JOIN courses c ON n.id = c.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateCourse :one
UPDATE courses
SET
    title = COALESCE(sqlc.narg('title'), title),
    description = COALESCE(sqlc.narg('description'), description),
    thumbnail_url = COALESCE(sqlc.narg('thumbnail_url'), thumbnail_url),
    is_published = COALESCE(sqlc.narg('is_published'), is_published)
WHERE node_id = $1
RETURNING *;

-- name: DeleteCourse :exec
DELETE FROM nodes WHERE id = $1;

-- Subjects
-- name: CreateSubject :one
INSERT INTO subjects (
    node_id,
    title,
    sequence_order
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetSubject :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, s.title, s.sequence_order
FROM nodes n
JOIN subjects s ON n.id = s.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateSubject :one
UPDATE subjects
SET
    title = COALESCE(sqlc.narg('title'), title),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order)
WHERE node_id = $1
RETURNING *;

-- name: DeleteSubject :exec
DELETE FROM nodes WHERE id = $1;

-- Chapters
-- name: CreateChapter :one
INSERT INTO chapters (
    node_id,
    title,
    sequence_order
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetChapter :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, ch.title, ch.sequence_order
FROM nodes n
JOIN chapters ch ON n.id = ch.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateChapter :one
UPDATE chapters
SET
    title = COALESCE(sqlc.narg('title'), title),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order)
WHERE node_id = $1
RETURNING *;

-- name: DeleteChapter :exec
DELETE FROM nodes WHERE id = $1;

-- Lessons
-- name: CreateLesson :one
INSERT INTO lessons (
    node_id,
    title,
    text_content,
    video_url,
    sequence_order
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetLesson :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, l.title, l.text_content, l.video_url, l.sequence_order
FROM nodes n
JOIN lessons l ON n.id = l.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateLesson :one
UPDATE lessons
SET
    title = COALESCE(sqlc.narg('title'), title),
    text_content = COALESCE(sqlc.narg('text_content'), text_content),
    video_url = COALESCE(sqlc.narg('video_url'), video_url),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order)
WHERE node_id = $1
RETURNING *;

-- name: DeleteLesson :exec
DELETE FROM nodes WHERE id = $1;

-- Tree Traversal
-- name: GetCourseTree :many
WITH RECURSIVE tree AS (
    -- Anchor: Get the root course node
    SELECT n.id, n.parent_id, n.node_type, 0 AS level
    FROM nodes n
    WHERE n.id = $1
    
    UNION ALL
    
    -- Recursive step: Get children
    SELECT n.id, n.parent_id, n.node_type, t.level + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
)
SELECT * FROM tree
ORDER BY level, id;

-- Prerequisites
-- name: AddPrerequisite :exec
INSERT INTO node_prerequisites (node_id, prerequisite_node_id)
VALUES ($1, $2);

-- name: GetPrerequisites :many
SELECT n.* FROM nodes n
JOIN node_prerequisites np ON n.id = np.prerequisite_node_id
WHERE np.node_id = $1;
