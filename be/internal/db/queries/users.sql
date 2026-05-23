-- name: CreateUser :one
INSERT INTO users (
    email,
    password_hash,
    role
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: CreateUserProfile :one
INSERT INTO user_profiles (
    user_id,
    full_name,
    avatar_url,
    bio
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetUserProfile :one
SELECT * FROM user_profiles
WHERE user_id = $1 LIMIT 1;

-- name: UpdateUserProfile :one
UPDATE user_profiles
SET
    full_name = COALESCE(sqlc.narg('full_name'), full_name),
    avatar_url = COALESCE(sqlc.narg('avatar_url'), avatar_url),
    bio = COALESCE(sqlc.narg('bio'), bio),
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (
    user_id,
    token_hash,
    expires_at
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetRefreshToken :one
SELECT * FROM refresh_tokens
WHERE token_hash = $1 LIMIT 1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET is_revoked = TRUE
WHERE id = $1;

-- name: DeleteExpiredRefreshTokens :exec
DELETE FROM refresh_tokens
WHERE expires_at < NOW() OR is_revoked = TRUE;
