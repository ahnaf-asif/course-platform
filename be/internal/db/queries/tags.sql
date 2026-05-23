-- name: CreateTag :one
INSERT INTO tags (
    name,
    slug
) VALUES (
    $1, $2
)
RETURNING *;

-- name: GetTagBySlug :one
SELECT * FROM tags
WHERE slug = $1 LIMIT 1;

-- name: ListTags :many
SELECT * FROM tags
ORDER BY name ASC;

-- name: AttachTagToNode :exec
INSERT INTO node_tags (node_id, tag_id)
VALUES ($1, $2)
ON CONFLICT (node_id, tag_id) DO NOTHING;

-- name: DetachTagFromNode :exec
DELETE FROM node_tags
WHERE node_id = $1 AND tag_id = $2;

-- name: ListTagsByNode :many
SELECT t.* FROM tags t
JOIN node_tags nt ON t.id = nt.tag_id
WHERE nt.node_id = $1
ORDER BY t.name ASC;

-- name: ListNodesByTag :many
SELECT n.* FROM nodes n
JOIN node_tags nt ON n.id = nt.node_id
WHERE nt.tag_id = $1
ORDER BY n.created_at DESC;
