package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/shafins-course/backend/internal/db/generated"
)

type TokenService struct {
	jwtSecret            []byte
	accessTokenDuration  time.Duration
	refreshTokenDuration time.Duration
}

func NewTokenService(secret string, accessDuration, refreshDuration time.Duration) *TokenService {
	return &TokenService{
		jwtSecret:            []byte(secret),
		accessTokenDuration:  accessDuration,
		refreshTokenDuration: refreshDuration,
	}
}

type AuthClaims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (s *TokenService) GenerateAccessToken(user generated.User) (string, error) {
	claims := AuthClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.String(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.accessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		Email: user.Email,
		Role:  string(user.Role),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *TokenService) GenerateRefreshToken() (string, string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}

	token := hex.EncodeToString(b)
	hashString := s.HashToken(token)

	return token, hashString, nil
}

func (s *TokenService) HashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

func (s *TokenService) GetAccessTokenDuration() time.Duration {
	return s.accessTokenDuration
}

func (s *TokenService) GetRefreshTokenDuration() time.Duration {
	return s.refreshTokenDuration
}

func (s *TokenService) GetAccessTokenDurationSeconds() int {
	return int(s.accessTokenDuration.Seconds())
}
