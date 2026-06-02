package services

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTokenService(t *testing.T) {
	secret := "test-secret"
	accessDuration := 15 * time.Minute
	refreshDuration := 7 * 24 * time.Hour
	s := NewTokenService(secret, accessDuration, refreshDuration)

	t.Run("NewTokenService", func(t *testing.T) {
		assert.Equal(t, []byte(secret), s.jwtSecret)
		assert.Equal(t, accessDuration, s.accessTokenDuration)
		assert.Equal(t, refreshDuration, s.refreshTokenDuration)
	})

	t.Run("GenerateAccessToken", func(t *testing.T) {
		user := generated.User{
			ID:    uuid.New(),
			Email: "test@example.com",
			Role:  generated.UserRoleUSER,
		}

		tokenStr, err := s.GenerateAccessToken(user)
		require.NoError(t, err)
		require.NotEmpty(t, tokenStr)

		// Parse and validate the token
		token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})

		require.NoError(t, err)
		claims, ok := token.Claims.(*AuthClaims)
		require.True(t, ok)
		assert.Equal(t, user.ID.String(), claims.Subject)
		assert.Equal(t, user.Email, claims.Email)
		assert.Equal(t, string(user.Role), claims.Role)
		assert.WithinDuration(t, time.Now().Add(accessDuration), claims.ExpiresAt.Time, 5*time.Second)
	})

	t.Run("GenerateRefreshToken", func(t *testing.T) {
		token, hash, err := s.GenerateRefreshToken()
		require.NoError(t, err)
		assert.Len(t, token, 64) // 32 bytes hex encoded
		assert.Len(t, hash, 64)  // sha256 hex encoded

		expectedHash := s.HashToken(token)
		assert.Equal(t, expectedHash, hash)
	})

	t.Run("HashToken", func(t *testing.T) {
		token := "my-secret-token"
		hash1 := s.HashToken(token)
		hash2 := s.HashToken(token)
		assert.Equal(t, hash1, hash2)
		assert.NotEmpty(t, hash1)
	})

	t.Run("Durations", func(t *testing.T) {
		assert.Equal(t, accessDuration, s.GetAccessTokenDuration())
		assert.Equal(t, refreshDuration, s.GetRefreshTokenDuration())
		assert.Equal(t, int(accessDuration.Seconds()), s.GetAccessTokenDurationSeconds())
	})
}
