package tests

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shafins-course/backend/internal/api"
	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdminDashboardAnalyticsIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	jwtSecret := "secret-jwt-key"
	os.Setenv("JWT_SECRET", jwtSecret)
	defer os.Unsetenv("JWT_SECRET")

	ctx := context.Background()
	conn, cleanup, err := SetupTestDB(ctx)
	require.NoError(t, err)
	defer cleanup()

	store := db.NewStore(conn)
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	tokenService := services.NewTokenService(jwtSecret, time.Minute*15, time.Hour*24)
	server := api.NewServer(store, tokenService, nil, nil, nil, nil, logger)
	e := server.GetEcho()

	// 1. Create Admin User
	adminUser, err := store.CreateUser(ctx, generated.CreateUserParams{
		Email:        "admin.dashboard@example.com",
		PasswordHash: "hashedpass",
		Role:         generated.UserRoleADMIN,
	})
	require.NoError(t, err)

	_, err = store.CreateUserProfile(ctx, generated.CreateUserProfileParams{
		UserID:   adminUser.ID,
		FullName: "Dashboard Admin",
	})
	require.NoError(t, err)

	token, err := tokenService.GenerateAccessToken(adminUser)
	require.NoError(t, err)

	// 2. Call Dashboard Analytics
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/dashboard/analytics", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	t.Logf("Response Status: %d, Body: %s", rec.Code, rec.Body.String())
	assert.Equal(t, http.StatusOK, rec.Code)

	var resp map[string]interface{}
	err = json.Unmarshal(rec.Body.Bytes(), &resp)
	require.NoError(t, err)
	assert.Contains(t, resp, "kpis")
	assert.Contains(t, resp, "daily_revenue_trends")
	assert.Contains(t, resp, "monthly_revenue_trends")
	assert.Contains(t, resp, "daily_user_trends")
	assert.Contains(t, resp, "top_courses")
	assert.Contains(t, resp, "payment_distribution")
	assert.Contains(t, resp, "recent_orders")
	assert.Contains(t, resp, "recent_users")

	// 3. Create a course and order, then test again
	node, err := store.CreateNode(ctx, generated.CreateNodeParams{
		NodeType: generated.NodeTypeCOURSE,
	})
	require.NoError(t, err)

	course, err := store.CreateCourse(ctx, generated.CreateCourseParams{
		NodeID:      node.ID,
		Title:       "Test Masterclass",
		Description: sql.NullString{String: "Test description", Valid: true},
		Slug:        "test-masterclass-" + uuid.New().String()[:8],
	})
	require.NoError(t, err)

	order, err := store.CreateOrder(ctx, generated.CreateOrderParams{
		UserID:            adminUser.ID,
		NodeID:            course.NodeID,
		AmountPaid:        "1500.00",
		Currency:          "BDT",
		Status:            generated.OrderStatusCOMPLETED,
		PaymentProvider:   "sslcommerz",
		ProviderReference: "TEST-TRX-123",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, order.ID)

	rec2 := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/admin/dashboard/analytics", nil)
	req2.Header.Set("Authorization", "Bearer "+token)
	e.ServeHTTP(rec2, req2)
	t.Logf("Response 2 Status: %d, Body: %s", rec2.Code, rec2.Body.String())
	assert.Equal(t, http.StatusOK, rec2.Code)
}
