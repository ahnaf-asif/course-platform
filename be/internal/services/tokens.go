package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
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

// GeneratePasswordResetToken generates a secure 1-hour signed JWT for resetting a password.
func (s *TokenService) GeneratePasswordResetToken(userID uuid.UUID) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID.String(),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "eduverse-auth-reset",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidatePasswordResetToken validates a password reset token and returns the associated user ID.
func (s *TokenService) ValidatePasswordResetToken(tokenStr string) (uuid.UUID, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return uuid.Nil, err
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid || claims.Issuer != "eduverse-auth-reset" {
		return uuid.Nil, errors.New("invalid or expired reset token")
	}

	return uuid.Parse(claims.Subject)
}
