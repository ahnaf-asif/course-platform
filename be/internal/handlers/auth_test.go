package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockStore is a mock implementation of db.Store
type MockStore struct {
	mock.Mock
	generated.Querier // This will satisfy most of the interface with nil methods
}

func (m *MockStore) GetRefreshToken(ctx context.Context, hash string) (generated.RefreshToken, error) {
	args := m.Called(ctx, hash)
	return args.Get(0).(generated.RefreshToken), args.Error(1)
}

func (m *MockStore) RevokeRefreshToken(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStore) RevokeAllTokensByFamily(ctx context.Context, familyID uuid.UUID) error {
	args := m.Called(ctx, familyID)
	return args.Error(0)
}

func (m *MockStore) GetUserByID(ctx context.Context, id uuid.UUID) (generated.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(generated.User), args.Error(1)
}

func (m *MockStore) CreateRefreshToken(ctx context.Context, arg generated.CreateRefreshTokenParams) (generated.RefreshToken, error) {
	args := m.Called(ctx, arg)
	return args.Get(0).(generated.RefreshToken), args.Error(1)
}

func (m *MockStore) WithTx(ctx context.Context, fn func(generated.Querier) error) error {
	return fn(m)
}

func TestAuthHandler_Logout(t *testing.T) {
	e := echo.New()
	mockStore := new(MockStore)
	tokenService := services.NewTokenService("secret", time.Minute, time.Hour)
	h := NewAuthHandler(mockStore, tokenService, nil)

	t.Run("Success", func(t *testing.T) {
		userID := uuid.New()
		tokenID := uuid.New()
		refreshToken := "some-refresh-token"
		hash := tokenService.HashToken(refreshToken)

		req := httptest.NewRequest(http.MethodPost, "/logout", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		// Mock authenticated user
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: userID.String(),
		})

		mockStore.On("GetRefreshToken", mock.Anything, hash).Return(generated.RefreshToken{
			ID:     tokenID,
			UserID: userID,
		}, nil)
		mockStore.On("RevokeRefreshToken", mock.Anything, tokenID).Return(nil)

		err := h.Logout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusNoContent, rec.Code)

		// Verify cookies are cleared
		cookies := rec.Result().Cookies()
		assert.Len(t, cookies, 2)
		for _, cookie := range cookies {
			assert.True(t, cookie.Expires.Before(time.Now()))
			assert.Empty(t, cookie.Value)
		}

		mockStore.AssertExpectations(t)
	})

	t.Run("Missing Cookie", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/logout", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.Logout(c)
		assert.Error(t, err)
		echoErr, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, echoErr.Code)
	})

	t.Run("Token Not Found", func(t *testing.T) {
		refreshToken := "non-existent-token"
		hash := tokenService.HashToken(refreshToken)

		req := httptest.NewRequest(http.MethodPost, "/logout", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: uuid.New().String(),
		})

		mockStore.On("GetRefreshToken", mock.Anything, hash).Return(generated.RefreshToken{}, http.ErrNoLocation)

		err := h.Logout(c)
		assert.Error(t, err)
		echoErr, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, echoErr.Code)
	})
}

func TestAuthHandler_Refresh(t *testing.T) {
	e := echo.New()
	mockStore := new(MockStore)
	tokenService := services.NewTokenService("secret", time.Minute, time.Hour)
	h := NewAuthHandler(mockStore, tokenService, nil)

	t.Run("Success", func(t *testing.T) {
		userID := uuid.New()
		familyID := uuid.New()
		tokenID := uuid.New()
		refreshToken := "valid-refresh-token"
		hash := tokenService.HashToken(refreshToken)

		req := httptest.NewRequest(http.MethodPost, "/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockStore.On("GetRefreshToken", mock.Anything, hash).Return(generated.RefreshToken{
			ID:        tokenID,
			UserID:    userID,
			FamilyID:  familyID,
			IsRevoked: false,
			ExpiresAt: time.Now().Add(time.Hour),
		}, nil)

		mockStore.On("GetUserByID", mock.Anything, userID).Return(generated.User{
			ID:    userID,
			Email: "test@example.com",
			Role:  generated.UserRoleUSER,
		}, nil)

		mockStore.On("RevokeRefreshToken", mock.Anything, tokenID).Return(nil)
		mockStore.On("CreateRefreshToken", mock.Anything, mock.MatchedBy(func(p generated.CreateRefreshTokenParams) bool {
			return p.UserID == userID && p.FamilyID == familyID
		})).Return(generated.RefreshToken{}, nil)

		err := h.Refresh(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		// Check for set-cookie
		cookies := rec.Result().Cookies()
		assert.Len(t, cookies, 2)

		mockStore.AssertExpectations(t)
	})

	t.Run("Token Reuse Detected", func(t *testing.T) {
		familyID := uuid.New()
		refreshToken := "reused-token"
		hash := tokenService.HashToken(refreshToken)

		req := httptest.NewRequest(http.MethodPost, "/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockStore.On("GetRefreshToken", mock.Anything, hash).Return(generated.RefreshToken{
			IsRevoked: true,
			FamilyID:  familyID,
		}, nil)

		mockStore.On("RevokeAllTokensByFamily", mock.Anything, familyID).Return(nil)

		err := h.Refresh(c)
		assert.Error(t, err)
		echoErr, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, echoErr.Code)
		assert.Contains(t, echoErr.Message, "session compromised")

		mockStore.AssertExpectations(t)
	})

	t.Run("Token Expired", func(t *testing.T) {
		refreshToken := "expired-token"
		hash := tokenService.HashToken(refreshToken)

		req := httptest.NewRequest(http.MethodPost, "/refresh", nil)
		req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		mockStore.On("GetRefreshToken", mock.Anything, hash).Return(generated.RefreshToken{
			IsRevoked: false,
			ExpiresAt: time.Now().Add(-time.Hour),
		}, nil)

		err := h.Refresh(c)
		assert.Error(t, err)
		echoErr, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, echoErr.Code)

		mockStore.AssertExpectations(t)
	})
}
