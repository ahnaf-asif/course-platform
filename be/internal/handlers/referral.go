package handlers

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"github.com/shafins-course/backend/internal/db"
	"github.com/shafins-course/backend/internal/db/generated"
	internalMiddleware "github.com/shafins-course/backend/internal/middleware"
	"github.com/shafins-course/backend/internal/services"
)

type ReferralHandler struct {
	store        db.Store
	emailService services.EmailService
	logger       *slog.Logger
	validate     *validator.Validate
}

func NewReferralHandler(store db.Store, logger *slog.Logger) *ReferralHandler {
	return &ReferralHandler{
		store:    store,
		logger:   logger,
		validate: validator.New(),
	}
}

func (h *ReferralHandler) SetEmailService(emailService services.EmailService) {
	h.emailService = emailService
}

const referralCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateReferralCode() (string, error) {
	result := make([]byte, 6)
	charsetLen := big.NewInt(int64(len(referralCharset)))
	for i := 0; i < 6; i++ {
		num, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			return "", err
		}
		result[i] = referralCharset[num.Int64()]
	}
	return string(result), nil
}

func (h *ReferralHandler) GetOrCreateReferralCode(ctx context.Context, userID uuid.UUID) (string, error) {
	rc, err := h.store.GetReferralCodeByUserID(ctx, userID)
	if err == nil {
		return rc.Code, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	for i := 0; i < 5; i++ {
		code, err := GenerateReferralCode()
		if err != nil {
			return "", err
		}
		newRC, err := h.store.CreateReferralCode(ctx, generated.CreateReferralCodeParams{
			UserID: userID,
			Code:   code,
		})
		if err == nil {
			return newRC.Code, nil
		}
	}
	return "", errors.New("failed to generate unique referral code after retries")
}

// Student Endpoints

type ReferralOverviewResponse struct {
	Code                    string  `json:"code"`
	TotalEarned             float64 `json:"total_earned"`
	TotalWithdrawn          float64 `json:"total_withdrawn"`
	PendingPayout           float64 `json:"pending_payout"`
	AvailableBalance        float64 `json:"available_balance"`
	TotalReferrals          int64   `json:"total_referrals"`
	CommissionPercentage    float64 `json:"commission_percentage"`
	BuyerDiscountPercentage float64 `json:"buyer_discount_percentage"`
	MinPayoutAmount         float64 `json:"min_payout_amount"`
	IsEnabled               bool    `json:"is_enabled"`
	TermsAndConditions      string  `json:"terms_and_conditions"`
}

func (h *ReferralHandler) GetReferralOverview(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	code, err := h.GetOrCreateReferralCode(ctx, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get referral code: "+err.Error())
	}

	balances, err := h.store.GetUserReferralBalances(ctx, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get balances: "+err.Error())
	}

	settings, err := h.store.GetReferralSettings(ctx)
	if err != nil {
		// Fallback default settings
		settings = generated.ReferralSetting{
			CommissionPercentage:    "10.00",
			BuyerDiscountPercentage: "5.00",
			MinPayoutAmount:         "500.00",
			IsEnabled:               true,
			TermsAndConditions:      "",
		}
	}

	totalEarned, _ := strconv.ParseFloat(balances.TotalEarned, 64)
	totalWithdrawn, _ := strconv.ParseFloat(balances.TotalWithdrawn, 64)
	pendingPayout, _ := strconv.ParseFloat(balances.PendingPayout, 64)
	commissionPct, _ := strconv.ParseFloat(settings.CommissionPercentage, 64)
	buyerDiscountPct, _ := strconv.ParseFloat(settings.BuyerDiscountPercentage, 64)
	minPayout, _ := strconv.ParseFloat(settings.MinPayoutAmount, 64)

	availBalance := totalEarned - totalWithdrawn - pendingPayout
	if availBalance < 0 {
		availBalance = 0
	}

	return c.JSON(http.StatusOK, ReferralOverviewResponse{
		Code:                    code,
		TotalEarned:             totalEarned,
		TotalWithdrawn:          totalWithdrawn,
		PendingPayout:           pendingPayout,
		AvailableBalance:        availBalance,
		TotalReferrals:          balances.TotalReferrals,
		CommissionPercentage:    commissionPct,
		BuyerDiscountPercentage: buyerDiscountPct,
		MinPayoutAmount:         minPayout,
		IsEnabled:               settings.IsEnabled,
		TermsAndConditions:      settings.TermsAndConditions,
	})
}

type ReferralEarningItem struct {
	ID                   string  `json:"id"`
	OrderID              string  `json:"order_id"`
	NodeID               string  `json:"node_id"`
	CourseTitle          string  `json:"course_title"`
	ReferredUserName     string  `json:"referred_user_name"`
	ReferredUserEmail    string  `json:"referred_user_email"`
	OrderAmount          float64 `json:"order_amount"`
	CommissionPercentage float64 `json:"commission_percentage"`
	CommissionEarned     float64 `json:"commission_earned"`
	Currency             string  `json:"currency"`
	Status               string  `json:"status"`
	CreatedAt            string  `json:"created_at"`
}

func (h *ReferralHandler) GetReferralEarnings(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := h.store.GetReferralEarningsByUser(ctx, generated.GetReferralEarningsByUserParams{
		ReferrerUserID: userID,
		Limit:          int32(limit),
		Offset:         int32(offset),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get referral earnings: "+err.Error())
	}

	items := make([]ReferralEarningItem, 0, len(rows))
	for _, r := range rows {
		orderAmt, _ := strconv.ParseFloat(r.OrderAmount, 64)
		commPct, _ := strconv.ParseFloat(r.CommissionPercentage, 64)
		commEarned, _ := strconv.ParseFloat(r.CommissionEarned, 64)

		items = append(items, ReferralEarningItem{
			ID:                   r.ID.String(),
			OrderID:              r.OrderID.String(),
			NodeID:               r.NodeID.String(),
			CourseTitle:          r.CourseTitle,
			ReferredUserName:     r.ReferredUserName,
			ReferredUserEmail:    r.ReferredUserEmail,
			OrderAmount:          orderAmt,
			CommissionPercentage: commPct,
			CommissionEarned:     commEarned,
			Currency:             r.Currency,
			Status:               string(r.Status),
			CreatedAt:            r.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, items)
}

type PayoutItem struct {
	ID             string  `json:"id"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	PaymentMethod  string  `json:"payment_method"`
	AccountNumber  string  `json:"account_number"`
	AccountType    string  `json:"account_type"`
	Status         string  `json:"status"`
	TransactionRef *string `json:"transaction_ref,omitempty"`
	AdminNote      *string `json:"admin_note,omitempty"`
	ProcessedAt    *string `json:"processed_at,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

func (h *ReferralHandler) GetReferralPayouts(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	rows, err := h.store.GetPayoutsByUser(ctx, generated.GetPayoutsByUserParams{
		UserID: userID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get payouts: "+err.Error())
	}

	items := make([]PayoutItem, 0, len(rows))
	for _, r := range rows {
		amt, _ := strconv.ParseFloat(r.Amount, 64)
		var txRef *string
		if r.TransactionRef.Valid {
			txRef = &r.TransactionRef.String
		}
		var adminNote *string
		if r.AdminNote.Valid {
			adminNote = &r.AdminNote.String
		}
		var procAt *string
		if r.ProcessedAt.Valid {
			f := r.ProcessedAt.Time.Format(time.RFC3339)
			procAt = &f
		}

		items = append(items, PayoutItem{
			ID:             r.ID.String(),
			Amount:         amt,
			Currency:       r.Currency,
			PaymentMethod:  r.PaymentMethod,
			AccountNumber:  r.AccountNumber,
			AccountType:    r.AccountType,
			Status:         string(r.Status),
			TransactionRef: txRef,
			AdminNote:      adminNote,
			ProcessedAt:    procAt,
			CreatedAt:      r.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, items)
}

type CreatePayoutRequest struct {
	Amount        float64 `json:"amount" validate:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" validate:"required"`
	AccountNumber string  `json:"account_number" validate:"required,min=11,max=15"`
	AccountType   string  `json:"account_type" validate:"required,oneof=PERSONAL AGENT"`
}

func (h *ReferralHandler) CreatePayoutRequest(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	var req CreatePayoutRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	// Validate phone number format
	cleanPhone := strings.TrimSpace(req.AccountNumber)
	if !strings.HasPrefix(cleanPhone, "01") || len(cleanPhone) != 11 {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid bKash phone number (must be 11 digits starting with 01)")
	}

	// Check referral settings
	settings, err := h.store.GetReferralSettings(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get referral settings")
	}
	if !settings.IsEnabled {
		return echo.NewHTTPError(http.StatusBadRequest, "Referral program is currently paused")
	}

	minPayout, _ := strconv.ParseFloat(settings.MinPayoutAmount, 64)
	if req.Amount < minPayout {
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("Minimum payout amount is ৳%.2f", minPayout))
	}

	var createdPayout generated.ReferralPayout
	txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
		balances, err := q.GetUserReferralBalances(ctx, userID)
		if err != nil {
			return err
		}

		totalEarned, _ := strconv.ParseFloat(balances.TotalEarned, 64)
		totalWithdrawn, _ := strconv.ParseFloat(balances.TotalWithdrawn, 64)
		pendingPayout, _ := strconv.ParseFloat(balances.PendingPayout, 64)
		availBalance := totalEarned - totalWithdrawn - pendingPayout

		if req.Amount > availBalance {
			return fmt.Errorf("exceeds_balance: requested amount (৳%.2f) exceeds available balance (৳%.2f)", req.Amount, availBalance)
		}

		amountStr := fmt.Sprintf("%.2f", req.Amount)
		p, err := q.CreatePayoutRequest(ctx, generated.CreatePayoutRequestParams{
			UserID:        userID,
			Amount:        amountStr,
			Currency:      "BDT",
			PaymentMethod: strings.ToLower(req.PaymentMethod),
			AccountNumber: cleanPhone,
			AccountType:   strings.ToUpper(req.AccountType),
		})
		if err != nil {
			return err
		}
		createdPayout = p
		return nil
	})

	if txErr != nil {
		if strings.HasPrefix(txErr.Error(), "exceeds_balance:") {
			return echo.NewHTTPError(http.StatusBadRequest, strings.TrimPrefix(txErr.Error(), "exceeds_balance: "))
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create payout request: "+txErr.Error())
	}

	amt, _ := strconv.ParseFloat(createdPayout.Amount, 64)
	return c.JSON(http.StatusCreated, PayoutItem{
		ID:            createdPayout.ID.String(),
		Amount:        amt,
		Currency:      createdPayout.Currency,
		PaymentMethod: createdPayout.PaymentMethod,
		AccountNumber: createdPayout.AccountNumber,
		AccountType:   createdPayout.AccountType,
		Status:        string(createdPayout.Status),
		CreatedAt:     createdPayout.CreatedAt.Format(time.RFC3339),
	})
}

// Admin Endpoints

type AdminReferralSettingsResponse struct {
	ID                      int32   `json:"id"`
	CommissionPercentage    float64 `json:"commission_percentage"`
	BuyerDiscountPercentage float64 `json:"buyer_discount_percentage"`
	MinPayoutAmount         float64 `json:"min_payout_amount"`
	IsEnabled               bool    `json:"is_enabled"`
	TermsAndConditions      string  `json:"terms_and_conditions"`
	UpdatedAt               string  `json:"updated_at"`
}

func (h *ReferralHandler) AdminGetReferralSettings(c echo.Context) error {
	ctx := c.Request().Context()
	settings, err := h.store.GetReferralSettings(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get settings: "+err.Error())
	}

	commPct, _ := strconv.ParseFloat(settings.CommissionPercentage, 64)
	buyerDiscountPct, _ := strconv.ParseFloat(settings.BuyerDiscountPercentage, 64)
	minPayout, _ := strconv.ParseFloat(settings.MinPayoutAmount, 64)

	return c.JSON(http.StatusOK, AdminReferralSettingsResponse{
		ID:                      settings.ID,
		CommissionPercentage:    commPct,
		BuyerDiscountPercentage: buyerDiscountPct,
		MinPayoutAmount:         minPayout,
		IsEnabled:               settings.IsEnabled,
		TermsAndConditions:      settings.TermsAndConditions,
		UpdatedAt:               settings.UpdatedAt.Format(time.RFC3339),
	})
}

type UpdateReferralSettingsRequest struct {
	CommissionPercentage    float64 `json:"commission_percentage" validate:"required,gte=0,lte=100"`
	BuyerDiscountPercentage float64 `json:"buyer_discount_percentage" validate:"required,gte=0,lte=100"`
	MinPayoutAmount         float64 `json:"min_payout_amount" validate:"required,gte=0"`
	IsEnabled               bool    `json:"is_enabled"`
	TermsAndConditions      string  `json:"terms_and_conditions"`
}

func (h *ReferralHandler) AdminUpdateReferralSettings(c echo.Context) error {
	ctx := c.Request().Context()
	var req UpdateReferralSettingsRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	updated, err := h.store.UpsertReferralSettings(ctx, generated.UpsertReferralSettingsParams{
		CommissionPercentage:    fmt.Sprintf("%.2f", req.CommissionPercentage),
		BuyerDiscountPercentage: fmt.Sprintf("%.2f", req.BuyerDiscountPercentage),
		MinPayoutAmount:         fmt.Sprintf("%.2f", req.MinPayoutAmount),
		IsEnabled:               req.IsEnabled,
		TermsAndConditions:      req.TermsAndConditions,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update referral settings: "+err.Error())
	}

	commPct, _ := strconv.ParseFloat(updated.CommissionPercentage, 64)
	buyerDiscountPct, _ := strconv.ParseFloat(updated.BuyerDiscountPercentage, 64)
	minPayout, _ := strconv.ParseFloat(updated.MinPayoutAmount, 64)

	return c.JSON(http.StatusOK, AdminReferralSettingsResponse{
		ID:                      updated.ID,
		CommissionPercentage:    commPct,
		BuyerDiscountPercentage: buyerDiscountPct,
		MinPayoutAmount:         minPayout,
		IsEnabled:               updated.IsEnabled,
		TermsAndConditions:      updated.TermsAndConditions,
		UpdatedAt:               updated.UpdatedAt.Format(time.RFC3339),
	})
}

type AdminReferralSummaryResponse struct {
	TotalReferralSales     float64 `json:"total_referral_sales"`
	TotalCommissionsEarned float64 `json:"total_commissions_earned"`
	TotalCommissionsPaid   float64 `json:"total_commissions_paid"`
	PendingPayoutAmount    float64 `json:"pending_payout_amount"`
	PendingPayoutCount     int64   `json:"pending_payout_count"`
	ActiveAffiliatesCount  int64   `json:"active_affiliates_count"`
}

func (h *ReferralHandler) AdminGetReferralSummary(c echo.Context) error {
	ctx := c.Request().Context()
	summary, err := h.store.AdminGetReferralPlatformSummary(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get referral summary: "+err.Error())
	}

	sales, _ := strconv.ParseFloat(summary.TotalReferralSales, 64)
	earned, _ := strconv.ParseFloat(summary.TotalCommissionsEarned, 64)
	paid, _ := strconv.ParseFloat(summary.TotalCommissionsPaid, 64)
	pendingAmt, _ := strconv.ParseFloat(summary.PendingPayoutAmount, 64)

	return c.JSON(http.StatusOK, AdminReferralSummaryResponse{
		TotalReferralSales:     sales,
		TotalCommissionsEarned: earned,
		TotalCommissionsPaid:   paid,
		PendingPayoutAmount:    pendingAmt,
		PendingPayoutCount:     summary.PendingPayoutCount,
		ActiveAffiliatesCount:  summary.ActiveAffiliatesCount,
	})
}

type AdminPayoutItem struct {
	ID             string  `json:"id"`
	UserID         string  `json:"user_id"`
	UserName       string  `json:"user_name"`
	UserEmail      string  `json:"user_email"`
	Amount         float64 `json:"amount"`
	Currency       string  `json:"currency"`
	PaymentMethod  string  `json:"payment_method"`
	AccountNumber  string  `json:"account_number"`
	AccountType    string  `json:"account_type"`
	Status         string  `json:"status"`
	TransactionRef *string `json:"transaction_ref,omitempty"`
	AdminNote      *string `json:"admin_note,omitempty"`
	ProcessedAt    *string `json:"processed_at,omitempty"`
	CreatedAt      string  `json:"created_at"`
}

type AdminListPayoutsResponse struct {
	Payouts    []AdminPayoutItem `json:"payouts"`
	TotalCount int64             `json:"total_count"`
}

func (h *ReferralHandler) AdminListPayouts(c echo.Context) error {
	ctx := c.Request().Context()

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var statusFilter generated.NullPayoutStatus
	if st := c.QueryParam("status"); st != "" {
		statusFilter = generated.NullPayoutStatus{
			PayoutStatus: generated.PayoutStatus(strings.ToUpper(st)),
			Valid:        true,
		}
	}

	var searchFilter sql.NullString
	if q := strings.TrimSpace(c.QueryParam("search")); q != "" {
		searchFilter = sql.NullString{String: q, Valid: true}
	}

	rows, err := h.store.AdminListPayouts(ctx, generated.AdminListPayoutsParams{
		Status: statusFilter,
		Search: searchFilter,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to list payouts: "+err.Error())
	}

	var totalCount int64
	if len(rows) > 0 {
		totalCount = rows[0].TotalCount
	}

	items := make([]AdminPayoutItem, 0, len(rows))
	for _, r := range rows {
		amt, _ := strconv.ParseFloat(r.Amount, 64)
		var txRef *string
		if r.TransactionRef.Valid {
			txRef = &r.TransactionRef.String
		}
		var adminNote *string
		if r.AdminNote.Valid {
			adminNote = &r.AdminNote.String
		}
		var procAt *string
		if r.ProcessedAt.Valid {
			f := r.ProcessedAt.Time.Format(time.RFC3339)
			procAt = &f
		}

		items = append(items, AdminPayoutItem{
			ID:             r.ID.String(),
			UserID:         r.UserID.String(),
			UserName:       r.UserName,
			UserEmail:      r.UserEmail,
			Amount:         amt,
			Currency:       r.Currency,
			PaymentMethod:  r.PaymentMethod,
			AccountNumber:  r.AccountNumber,
			AccountType:    r.AccountType,
			Status:         string(r.Status),
			TransactionRef: txRef,
			AdminNote:      adminNote,
			ProcessedAt:    procAt,
			CreatedAt:      r.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, AdminListPayoutsResponse{
		Payouts:    items,
		TotalCount: totalCount,
	})
}

type AdminUpdatePayoutStatusRequest struct {
	Status         string  `json:"status" validate:"required,oneof=APPROVED REJECTED"`
	TransactionRef *string `json:"transaction_ref,omitempty"`
	AdminNote      *string `json:"admin_note,omitempty"`
}

func (h *ReferralHandler) AdminUpdatePayoutStatus(c echo.Context) error {
	ctx := c.Request().Context()
	payoutID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid payout ID")
	}

	var req AdminUpdatePayoutStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if err := h.validate.Struct(req); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	existing, err := h.store.GetPayoutByID(ctx, payoutID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return echo.NewHTTPError(http.StatusNotFound, "Payout request not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get payout: "+err.Error())
	}

	if existing.Status != generated.PayoutStatusPENDING {
		return echo.NewHTTPError(http.StatusBadRequest, "Only PENDING payouts can be updated")
	}

	var txRef sql.NullString
	if req.TransactionRef != nil && *req.TransactionRef != "" {
		txRef = sql.NullString{String: *req.TransactionRef, Valid: true}
	}
	var adminNote sql.NullString
	if req.AdminNote != nil && *req.AdminNote != "" {
		adminNote = sql.NullString{String: *req.AdminNote, Valid: true}
	}

	updated, err := h.store.AdminUpdatePayoutStatus(ctx, generated.AdminUpdatePayoutStatusParams{
		ID:             payoutID,
		Status:         generated.PayoutStatus(strings.ToUpper(req.Status)),
		TransactionRef: txRef,
		AdminNote:      adminNote,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update payout status: "+err.Error())
	}

	amt, _ := strconv.ParseFloat(updated.Amount, 64)
	var finalTxRef *string
	if updated.TransactionRef.Valid {
		finalTxRef = &updated.TransactionRef.String
	}
	var finalAdminNote *string
	if updated.AdminNote.Valid {
		finalAdminNote = &updated.AdminNote.String
	}
	var procAt *string
	if updated.ProcessedAt.Valid {
		f := updated.ProcessedAt.Time.Format(time.RFC3339)
		procAt = &f
	}

	if h.emailService != nil {
		txRefVal := ""
		if finalTxRef != nil {
			txRefVal = *finalTxRef
		}
		noteVal := ""
		if finalAdminNote != nil {
			noteVal = *finalAdminNote
		}
		go func(userID uuid.UUID, status, amount, currency, trxID, note string) {
			ctx := context.Background()
			user, err := h.store.GetUserByID(ctx, userID)
			if err != nil {
				return
			}
			_ = h.emailService.SendPayoutStatusEmail(ctx, user.Email, user.Email, status, amount, currency, trxID, note)
		}(updated.UserID, string(updated.Status), strconv.FormatFloat(amt, 'f', 2, 64), updated.Currency, txRefVal, noteVal)
	}

	return c.JSON(http.StatusOK, PayoutItem{
		ID:             updated.ID.String(),
		Amount:         amt,
		Currency:       updated.Currency,
		PaymentMethod:  updated.PaymentMethod,
		AccountNumber:  updated.AccountNumber,
		AccountType:    updated.AccountType,
		Status:         string(updated.Status),
		TransactionRef: finalTxRef,
		AdminNote:      finalAdminNote,
		ProcessedAt:    procAt,
		CreatedAt:      updated.CreatedAt.Format(time.RFC3339),
	})
}

type AdminReferralEarningItem struct {
	ID                   string  `json:"id"`
	ReferrerUserID       string  `json:"referrer_user_id"`
	ReferrerName         string  `json:"referrer_name"`
	ReferrerEmail        string  `json:"referrer_email"`
	ReferredUserID       string  `json:"referred_user_id"`
	ReferredName         string  `json:"referred_name"`
	ReferredEmail        string  `json:"referred_email"`
	OrderID              string  `json:"order_id"`
	NodeID               string  `json:"node_id"`
	CourseTitle          string  `json:"course_title"`
	OrderAmount          float64 `json:"order_amount"`
	CommissionPercentage float64 `json:"commission_percentage"`
	CommissionEarned     float64 `json:"commission_earned"`
	Currency             string  `json:"currency"`
	Status               string  `json:"status"`
	CreatedAt            string  `json:"created_at"`
}

type AdminListAllReferralEarningsResponse struct {
	Earnings   []AdminReferralEarningItem `json:"earnings"`
	TotalCount int64                      `json:"total_count"`
}

func (h *ReferralHandler) AdminListAllReferralEarnings(c echo.Context) error {
	ctx := c.Request().Context()

	page, _ := strconv.Atoi(c.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.QueryParam("limit"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var searchFilter sql.NullString
	if q := strings.TrimSpace(c.QueryParam("search")); q != "" {
		searchFilter = sql.NullString{String: q, Valid: true}
	}

	rows, err := h.store.AdminListAllReferralEarnings(ctx, generated.AdminListAllReferralEarningsParams{
		Search: searchFilter,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to list referral earnings: "+err.Error())
	}

	var totalCount int64
	if len(rows) > 0 {
		totalCount = rows[0].TotalCount
	}

	items := make([]AdminReferralEarningItem, 0, len(rows))
	for _, r := range rows {
		orderAmt, _ := strconv.ParseFloat(r.OrderAmount, 64)
		commPct, _ := strconv.ParseFloat(r.CommissionPercentage, 64)
		commEarned, _ := strconv.ParseFloat(r.CommissionEarned, 64)

		items = append(items, AdminReferralEarningItem{
			ID:                   r.ID.String(),
			ReferrerUserID:       r.ReferrerUserID.String(),
			ReferrerName:         r.ReferrerName,
			ReferrerEmail:        r.ReferrerEmail,
			ReferredUserID:       r.ReferredUserID.String(),
			ReferredName:         r.ReferredName,
			ReferredEmail:        r.ReferredEmail,
			OrderID:              r.OrderID.String(),
			NodeID:               r.NodeID.String(),
			CourseTitle:          r.CourseTitle,
			OrderAmount:          orderAmt,
			CommissionPercentage: commPct,
			CommissionEarned:     commEarned,
			Currency:             r.Currency,
			Status:               string(r.Status),
			CreatedAt:            r.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, AdminListAllReferralEarningsResponse{
		Earnings:   items,
		TotalCount: totalCount,
	})
}

// Public Validation Endpoint

type ValidateReferralCodeResponse struct {
	Valid                   bool    `json:"valid"`
	Code                    string  `json:"code"`
	BuyerDiscountPercentage float64 `json:"buyer_discount_percentage"`
	Message                 string  `json:"message"`
}

func (h *ReferralHandler) ValidateReferralCode(c echo.Context) error {
	ctx := c.Request().Context()
	rawCode := c.QueryParam("code")
	cleanCode := strings.ToUpper(strings.TrimSpace(rawCode))

	if len(cleanCode) != 6 {
		return c.JSON(http.StatusOK, ValidateReferralCodeResponse{
			Valid:   false,
			Code:    cleanCode,
			Message: "রেফারাল কোডটি অবশ্যই ৬ অক্ষরের হতে হবে",
		})
	}

	// 1. Check if code exists
	rc, err := h.store.GetReferralCodeByCode(ctx, cleanCode)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return c.JSON(http.StatusOK, ValidateReferralCodeResponse{
				Valid:   false,
				Code:    cleanCode,
				Message: "অকার্যকর বা অস্তিত্বহীন রেফারাল কোড",
			})
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to validate referral code")
	}

	// 2. Check if referral program is enabled
	settings, err := h.store.GetReferralSettings(ctx)
	if err != nil || !settings.IsEnabled {
		return c.JSON(http.StatusOK, ValidateReferralCodeResponse{
			Valid:   false,
			Code:    cleanCode,
			Message: "রেফারাল প্রোগ্রামটি বর্তমানে স্থগিত রয়েছে",
		})
	}

	// 3. Check for self-referral (if user is authenticated)
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID != "" {
		if currentUserID, err := uuid.Parse(authUser.ID); err == nil && currentUserID == rc.UserID {
			return c.JSON(http.StatusOK, ValidateReferralCodeResponse{
				Valid:   false,
				Code:    cleanCode,
				Message: "নিজের রেফারাল কোড ব্যবহার করা যাবে না",
			})
		}
	}

	buyerDiscountPct, _ := strconv.ParseFloat(settings.BuyerDiscountPercentage, 64)
	return c.JSON(http.StatusOK, ValidateReferralCodeResponse{
		Valid:                   true,
		Code:                    cleanCode,
		BuyerDiscountPercentage: buyerDiscountPct,
		Message:                 fmt.Sprintf("রেফারাল কোড কার্যকর হয়েছে! আপনি %.0f%% ছাড় পাচ্ছেন।", buyerDiscountPct),
	})
}
