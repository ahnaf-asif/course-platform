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
ORDER BY id;

-- Courses
-- name: CreateCourse :one
INSERT INTO courses (
    node_id,
    title,
    slug,
    description,
    thumbnail_url,
    is_published
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetCourse :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.slug, c.description, c.thumbnail_url, c.is_published
FROM nodes n
JOIN courses c ON n.id = c.node_id
WHERE n.id = $1 LIMIT 1;

-- name: GetCourseBySlug :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.slug, c.description, c.thumbnail_url, c.is_published
FROM nodes n
JOIN courses c ON n.id = c.node_id
WHERE c.slug = $1 OR (CASE WHEN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN n.id = $1::uuid ELSE FALSE END) LIMIT 1;

-- name: ListCourses :many
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.slug, c.description, c.thumbnail_url, c.is_published
FROM nodes n
JOIN courses c ON n.id = c.node_id
ORDER BY n.created_at DESC;

-- name: UpdateCourse :one
UPDATE courses
SET
    title = COALESCE(sqlc.narg('title'), title),
    slug = COALESCE(sqlc.narg('slug'), slug),
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
SELECT n.id, n.parent_id, n.node_type, n.created_at, c.title, c.sequence_order
FROM nodes n
JOIN chapters c ON n.id = c.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateChapter :one
UPDATE chapters
SET
    title = COALESCE(sqlc.narg('title'), title),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order)
WHERE node_id = $1
RETURNING *;

-- Lessons
-- name: CreateLesson :one
INSERT INTO lessons (
    node_id,
    title,
    video_url,
    text_content,
    sequence_order
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetLesson :one
SELECT n.id, n.parent_id, n.node_type, n.created_at, l.title, l.video_url, l.text_content, l.sequence_order
FROM nodes n
JOIN lessons l ON n.id = l.node_id
WHERE n.id = $1 LIMIT 1;

-- name: UpdateLesson :one
UPDATE lessons
SET
    title = COALESCE(sqlc.narg('title'), title),
    video_url = COALESCE(sqlc.narg('video_url'), video_url),
    text_content = COALESCE(sqlc.narg('text_content'), text_content),
    sequence_order = COALESCE(sqlc.narg('sequence_order'), sequence_order)
WHERE node_id = $1
RETURNING *;

-- DELETE HANDLERS (Generic for all nodes)
-- name: DeleteSubject :exec
DELETE FROM nodes WHERE id = $1;

-- name: DeleteChapter :exec
DELETE FROM nodes WHERE id = $1;

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
SELECT id, parent_id, node_type, level FROM tree
ORDER BY level, id;

-- name: GetCourseTreeHydrated :many
WITH RECURSIVE tree AS (
    -- Anchor
    SELECT n.id, n.parent_id, n.node_type, 0 AS level
    FROM nodes n
    WHERE n.id = $1
    
    UNION ALL
    
    -- Recursive step
    SELECT n.id, n.parent_id, n.node_type, t.level + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
)
SELECT 
    t.id, t.parent_id, t.node_type, t.level,
    c.title as course_title,
    s.title as subject_title, s.sequence_order as subject_order,
    ch.title as chapter_title, ch.sequence_order as chapter_order,
    l.title as lesson_title, l.sequence_order as lesson_order,
    l.video_url as lesson_video_url, l.text_content as lesson_text_content,
    EXISTS (SELECT 1 FROM node_quiz nq WHERE nq.node_id = t.id) as has_quizzes
FROM tree t
LEFT JOIN courses c ON t.id = c.node_id
LEFT JOIN subjects s ON t.id = s.node_id
LEFT JOIN chapters ch ON t.id = ch.node_id
LEFT JOIN lessons l ON t.id = l.node_id
ORDER BY t.level, COALESCE(s.sequence_order, ch.sequence_order, l.sequence_order, 0);

-- name: GetCourseTreeHydratedBySlug :many
WITH RECURSIVE tree AS (
    -- Anchor: Match by slug OR by node_id (UUID)
    SELECT n.id, n.parent_id, n.node_type, 0 AS level
    FROM nodes n
    JOIN courses c ON n.id = c.node_id
    WHERE c.slug = $1 OR (CASE WHEN $1 ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN n.id = $1::uuid ELSE FALSE END)
    
    UNION ALL
    
    -- Recursive step
    SELECT n.id, n.parent_id, n.node_type, t.level + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
)
SELECT 
    t.id, t.parent_id, t.node_type, t.level,
    c.title as course_title,
    s.title as subject_title, s.sequence_order as subject_order,
    ch.title as chapter_title, ch.sequence_order as chapter_order,
    l.title as lesson_title, l.sequence_order as lesson_order,
    l.video_url as lesson_video_url, l.text_content as lesson_text_content,
    EXISTS (SELECT 1 FROM node_quiz nq WHERE nq.node_id = t.id) as has_quizzes
FROM tree t
LEFT JOIN courses c ON t.id = c.node_id
LEFT JOIN subjects s ON t.id = s.node_id
LEFT JOIN chapters ch ON t.id = ch.node_id
LEFT JOIN lessons l ON t.id = l.node_id
ORDER BY t.level, COALESCE(s.sequence_order, ch.sequence_order, l.sequence_order, 0);

-- Prerequisites
-- name: AddPrerequisite :exec
INSERT INTO node_prerequisites (node_id, prerequisite_node_id)
VALUES ($1, $2);

-- name: GetPrerequisites :many
SELECT n.* FROM nodes n
JOIN node_prerequisites np ON n.id = np.prerequisite_node_id
WHERE np.node_id = $1;
