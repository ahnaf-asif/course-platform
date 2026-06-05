package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	store        db.Store
	tokenService *services.TokenService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewAuthHandler(store db.Store, tokenService *services.TokenService, logger *slog.Logger) *AuthHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	// Register function to use JSON tag name in validation errors
	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &AuthHandler{
		store:        store,
		tokenService: tokenService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,max=72"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (h *AuthHandler) setTokenCookies(c echo.Context, accessToken, refreshToken string) {
	// Set access token cookie
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(h.tokenService.GetAccessTokenDuration()),
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction,
		SameSite: http.SameSiteLaxMode,
	})

	// Set refresh token cookie
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(h.tokenService.GetRefreshTokenDuration()),
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) clearTokenCookies(c echo.Context) {
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction,
		SameSite: http.SameSiteLaxMode,
	})
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		Path:     "/",
		HttpOnly: true,
		Secure:   h.isProduction,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *AuthHandler) Logout(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Refresh token cookie missing")
	}

	refreshToken := cookie.Value
	authUser := internalMiddleware.GetAuthUser(c)
	hash := h.tokenService.HashToken(refreshToken)

	tokenRow, err := h.store.GetRefreshToken(c.Request().Context(), hash)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Refresh token not found")
	}

	if tokenRow.UserID.String() != authUser.ID {
		return echo.NewHTTPError(http.StatusNotFound, "Refresh token not owned by user")
	}

	if err := h.store.RevokeRefreshToken(c.Request().Context(), tokenRow.ID); err != nil {
		h.logger.Error("Logout error", "error", err, "user_id", authUser.ID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to revoke token")
	}

	h.clearTokenCookies(c)
	return c.NoContent(http.StatusNoContent)
}

type RefreshResponseProd struct {
	Status string `json:"status"`
}

func (h *AuthHandler) Refresh(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Refresh token cookie missing")
	}

	refreshToken := cookie.Value
	hash := h.tokenService.HashToken(refreshToken)
	tokenRow, err := h.store.GetRefreshToken(c.Request().Context(), hash)
	if err != nil {
		h.clearTokenCookies(c)
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired refresh token")
	}

	if tokenRow.IsRevoked {
		// Token reuse detected! Revoke all tokens in the family.
		err = h.store.RevokeAllTokensByFamily(c.Request().Context(), tokenRow.FamilyID)
		if err != nil {
			h.logger.Error("Failed to revoke token family", "error", err, "family_id", tokenRow.FamilyID)
		}
		h.clearTokenCookies(c)
		return echo.NewHTTPError(http.StatusUnauthorized, "session compromised, please log in again")
	}

	if tokenRow.ExpiresAt.Before(time.Now()) {
		h.clearTokenCookies(c)
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired refresh token")
	}

	user, err := h.store.GetUserByID(c.Request().Context(), tokenRow.UserID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid or expired refresh token")
	}

	var accessToken, newRefreshToken string
	var newRefreshHash string

	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		// Revoke old token
		if err := q.RevokeRefreshToken(c.Request().Context(), tokenRow.ID); err != nil {
			return err
		}

		// Generate new tokens
		var err error
		accessToken, err = h.tokenService.GenerateAccessToken(user)
		if err != nil {
			return err
		}

		newRefreshToken, newRefreshHash, err = h.tokenService.GenerateRefreshToken()
		if err != nil {
			return err
		}

		// Store new refresh token in the same family
		_, err = q.CreateRefreshToken(c.Request().Context(), generated.CreateRefreshTokenParams{
			UserID:    user.ID,
			TokenHash: newRefreshHash,
			ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
			FamilyID:  tokenRow.FamilyID,
		})
		return err
	})

	if err != nil {
		h.logger.Error("Token refresh error", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to refresh token")
	}

	h.setTokenCookies(c, accessToken, newRefreshToken)

	return c.JSON(http.StatusOK, LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    h.tokenService.GetAccessTokenDurationSeconds(),
	})
}

type LoginResponseProd struct {
	Status string `json:"status"`
}

func (h *AuthHandler) Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		errors := make([]map[string]string, 0)
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, map[string]string{
				"field":   err.Field(),
				"message": err.Tag(),
			})
		}
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": errors})
	}

	user, err := h.store.GetUserByEmail(c.Request().Context(), req.Email)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid credentials")
	}

	accessToken, err := h.tokenService.GenerateAccessToken(user)
	if err != nil {
		h.logger.Error("Failed to generate access token", "error", err, "user_id", user.ID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate access token")
	}

	refreshToken, refreshHash, err := h.tokenService.GenerateRefreshToken()
	if err != nil {
		h.logger.Error("Failed to generate refresh token", "error", err, "user_id", user.ID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to generate refresh token")
	}

	_, err = h.store.CreateRefreshToken(c.Request().Context(), generated.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: refreshHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
		FamilyID:  uuid.NullUUID{},
	})
	if err != nil {
		h.logger.Error("Failed to store refresh token", "error", err, "user_id", user.ID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to store refresh token")
	}

	h.setTokenCookies(c, accessToken, refreshToken)

	return c.JSON(http.StatusOK, LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    h.tokenService.GetAccessTokenDurationSeconds(),
	})
}

type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email,max=255"`
	Password string `json:"password" validate:"required,min=8,max=72"`
	FullName string `json:"full_name" validate:"required,max=100"`
}

type UserResponse struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

func (h *AuthHandler) Register(c echo.Context) error {
	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		errors := make([]map[string]string, 0)
		for _, err := range err.(validator.ValidationErrors) {
			errors = append(errors, map[string]string{
				"field":   err.Field(),
				"message": err.Tag(),
			})
		}
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": errors})
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to hash password")
	}

	var user generated.User
	var profile generated.UserProfile

	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		var err error
		user, err = q.CreateUser(c.Request().Context(), generated.CreateUserParams{
			Email:        req.Email,
			PasswordHash: string(hashedPassword),
			Role:         generated.UserRoleUSER,
		})
		if err != nil {
			return err
		}

		profile, err = q.CreateUserProfile(c.Request().Context(), generated.CreateUserProfileParams{
			UserID:   user.ID,
			FullName: req.FullName,
		})
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return echo.NewHTTPError(http.StatusConflict, "Email already exists")
		}
		h.logger.Error("Registration error", "error", err, "email", req.Email)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to register user")
	}

	return c.JSON(http.StatusCreated, UserResponse{
		ID:        user.ID.String(),
		Email:     user.Email,
		FullName:  profile.FullName,
		Role:      string(user.Role),
		CreatedAt: user.CreatedAt.String(),
	})
}
