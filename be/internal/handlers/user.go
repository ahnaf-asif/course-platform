package handlers

import (
	"database/sql"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"reflect"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
	"time"
)

type UserHandler struct {
	store        db.Store
	cacheService *services.CacheService
	validate     *validator.Validate
	logger       *slog.Logger
	isProduction bool
}

func NewUserHandler(store db.Store, cacheService *services.CacheService, logger *slog.Logger) *UserHandler {
	v := validator.New()
	env := os.Getenv("ENV")

	v.RegisterTagNameFunc(func(fld reflect.StructField) string {
		name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
		if name == "-" {
			return ""
		}
		return name
	})

	return &UserHandler{
		store:        store,
		cacheService: cacheService,
		validate:     v,
		logger:       logger,
		isProduction: env == "production",
	}
}

func (h *UserHandler) getUserCacheKey(id string) string {
	return "user:profile:" + id
}

type UserProfileResponse struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	Role      string  `json:"role"`
	FullName  string  `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
	Bio       *string `json:"bio"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

func (h *UserHandler) GetMe(c echo.Context) error {
	authUser := internalMiddleware.GetAuthUser(c)
	userID := authUser.ID

	// Try to get from cache
	var cachedResp UserProfileResponse
	err := h.cacheService.Get(c.Request().Context(), h.getUserCacheKey(userID), &cachedResp)
	if err == nil {
		return c.JSON(http.StatusOK, cachedResp)
	}

	uID, err := uuid.Parse(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	row, err := h.store.GetUserWithProfile(c.Request().Context(), uID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		h.logger.Error("Failed to get user with profile", "error", err, "user_id", uID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := UserProfileResponse{
		ID:        row.ID.String(),
		Email:     row.Email,
		Role:      string(row.Role),
		FullName:  row.FullName.String,
		CreatedAt: row.CreatedAt.String(),
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}
	if row.Bio.Valid {
		resp.Bio = &row.Bio.String
	}
	if row.UpdatedAt.Valid {
		resp.UpdatedAt = row.UpdatedAt.Time.String()
	}

	// Save to cache (TTL 1 hour)
	_ = h.cacheService.Set(c.Request().Context(), h.getUserCacheKey(userID), resp, time.Hour)

	return c.JSON(http.StatusOK, resp)
}

type UpdateUserProfileRequest struct {
	Email     *string `json:"email" validate:"omitempty,email,max=255"`
	FullName  *string `json:"full_name" validate:"omitempty,max=100"`
	AvatarURL *string `json:"avatar_url" validate:"omitempty,url"`
	Bio       *string `json:"bio" validate:"omitempty,max=500"`
}

func (h *UserHandler) UpdateMe(c echo.Context) error {
	authUser := internalMiddleware.GetAuthUser(c)
	userID := authUser.ID
	uID, err := uuid.Parse(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	var req UpdateUserProfileRequest
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

	err = h.store.WithTx(c.Request().Context(), func(q generated.Querier) error {
		if req.Email != nil {
			_, err := q.UpdateUser(c.Request().Context(), generated.UpdateUserParams{
				ID:    uID,
				Email: sql.NullString{String: *req.Email, Valid: true},
			})
			if err != nil {
				return err
			}
		}

		params := generated.UpdateUserProfileParams{
			UserID: uID,
		}

		if req.FullName != nil {
			params.FullName = sql.NullString{String: *req.FullName, Valid: true}
		}
		if req.AvatarURL != nil {
			params.AvatarUrl = sql.NullString{String: *req.AvatarURL, Valid: true}
		}
		if req.Bio != nil {
			params.Bio = sql.NullString{String: *req.Bio, Valid: true}
		}

		_, err := q.UpdateUserProfile(c.Request().Context(), params)
		return err
	})

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return echo.NewHTTPError(http.StatusConflict, "Email already exists")
		}
		h.logger.Error("Failed to update user profile", "error", err, "user_id", uID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Invalidate cache
	_ = h.cacheService.Delete(c.Request().Context(), h.getUserCacheKey(userID))

	// Fetch updated profile
	row, err := h.store.GetUserWithProfile(c.Request().Context(), uID)
	if err != nil {
		h.logger.Error("Failed to get user after profile update", "error", err, "user_id", uID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := UserProfileResponse{
		ID:        row.ID.String(),
		Email:     row.Email,
		Role:      string(row.Role),
		FullName:  row.FullName.String,
		CreatedAt: row.CreatedAt.String(),
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}
	if row.Bio.Valid {
		resp.Bio = &row.Bio.String
	}
	if row.UpdatedAt.Valid {
		resp.UpdatedAt = row.UpdatedAt.Time.String()
	}

	// Re-cache updated profile
	_ = h.cacheService.Set(c.Request().Context(), h.getUserCacheKey(userID), resp, time.Hour)

	return c.JSON(http.StatusOK, resp)
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8,max=72"`
}

func (h *UserHandler) UpdatePassword(c echo.Context) error {
	authUser := internalMiddleware.GetAuthUser(c)
	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	var req UpdatePasswordRequest
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

	user, err := h.store.GetUserByID(c.Request().Context(), userID)
	if err != nil {
		h.logger.Error("Failed to get user for password update", "error", err, "user_id", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid old password")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to hash password")
	}

	_, err = h.store.UpdateUser(c.Request().Context(), generated.UpdateUserParams{
		ID:           userID,
		PasswordHash: sql.NullString{String: string(hashedPassword), Valid: true},
	})
	if err != nil {
		h.logger.Error("Failed to update password", "error", err, "user_id", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Invalidate cache
	_ = h.cacheService.Delete(c.Request().Context(), h.getUserCacheKey(authUser.ID))

	return c.NoContent(http.StatusNoContent)
}

// Admin User Management

func (h *UserHandler) ListUsers(c echo.Context) error {
	rows, err := h.store.ListUsersWithProfiles(c.Request().Context())
	if err != nil {
		h.logger.Error("Failed to list users with profiles", "error", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := make([]UserProfileResponse, 0, len(rows))
	for _, row := range rows {
		item := UserProfileResponse{
			ID:        row.ID.String(),
			Email:     row.Email,
			Role:      string(row.Role),
			FullName:  row.FullName.String,
			CreatedAt: row.CreatedAt.String(),
		}

		if row.AvatarUrl.Valid {
			item.AvatarURL = &row.AvatarUrl.String
		}
		if row.Bio.Valid {
			item.Bio = &row.Bio.String
		}
		if row.UpdatedAt.Valid {
			item.UpdatedAt = row.UpdatedAt.Time.String()
		}
		resp = append(resp, item)
	}

	return c.JSON(http.StatusOK, resp)
}

type UpdateUserRoleRequest struct {
	Role string `json:"role" validate:"required,oneof=ADMIN USER"`
}

func (h *UserHandler) UpdateUserRole(c echo.Context) error {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	var req UpdateUserRoleRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, map[string]interface{}{"errors": h.formatValidationErrors(err)})
	}

	_, err = h.store.UpdateUser(c.Request().Context(), generated.UpdateUserParams{
		ID:   userID,
		Role: generated.NullUserRole{UserRole: generated.UserRole(req.Role), Valid: true},
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "User not found")
		}
		h.logger.Error("Failed to update user role", "error", err, "user_id", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	// Invalidate cache
	_ = h.cacheService.Delete(c.Request().Context(), h.getUserCacheKey(userID.String()))

	// Return updated user
	row, err := h.store.GetUserWithProfile(c.Request().Context(), userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal server error")
	}

	resp := UserProfileResponse{
		ID:        row.ID.String(),
		Email:     row.Email,
		Role:      string(row.Role),
		FullName:  row.FullName.String,
		CreatedAt: row.CreatedAt.String(),
	}

	if row.AvatarUrl.Valid {
		resp.AvatarURL = &row.AvatarUrl.String
	}
	if row.Bio.Valid {
		resp.Bio = &row.Bio.String
	}
	if row.UpdatedAt.Valid {
		resp.UpdatedAt = row.UpdatedAt.Time.String()
	}

	return c.JSON(http.StatusOK, resp)
}

func (h *UserHandler) formatValidationErrors(err error) []map[string]string {
	errors := make([]map[string]string, 0)
	for _, err := range err.(validator.ValidationErrors) {
		errors = append(errors, map[string]string{
			"field":   err.Field(),
			"message": err.Tag(),
		})
	}
	return errors
}
