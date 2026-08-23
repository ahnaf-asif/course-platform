package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"os"
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

type CommerceHandler struct {
	store             db.Store
	sslcommerzService services.PaymentGateway
	emailService      services.EmailService
	validate          *validator.Validate
}

func NewCommerceHandler(store db.Store, sslService services.PaymentGateway) *CommerceHandler {
	return &CommerceHandler{
		store:             store,
		sslcommerzService: sslService,
		validate:          validator.New(),
	}
}

func (h *CommerceHandler) SetEmailService(emailService services.EmailService) {
	h.emailService = emailService
}

func (h *CommerceHandler) sendOrderConfirmationEmailAsync(order generated.Order) {
	if h.emailService == nil {
		return
	}
	go func() {
		ctx := context.Background()
		user, err := h.store.GetUserByID(ctx, order.UserID)
		if err != nil {
			return
		}
		course, err := h.store.GetCourse(ctx, order.NodeID)
		courseTitle := "Course"
		if err == nil && course.Title != "" {
			courseTitle = course.Title
		}
		_ = h.emailService.SendOrderConfirmationEmail(ctx, user.Email, user.Email, courseTitle, order.ID.String(), order.AmountPaid, order.Currency)
	}()
}

type CheckoutRequest struct {
	NodeID       string `json:"node_id" validate:"required,uuid"`
	CouponCode   string `json:"coupon_code"`
	ReferralCode string `json:"referral_code"`
}

func (h *CommerceHandler) Checkout(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	var req CheckoutRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	nodeID, err := uuid.Parse(req.NodeID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid node ID")
	}

	var refCodeNull sql.NullString
	if cleanRef := strings.ToUpper(strings.TrimSpace(req.ReferralCode)); cleanRef != "" {
		refCodeNull = sql.NullString{String: cleanRef, Valid: true}
	}

	// 1. Check if already purchased
	existingOrder, err := h.store.GetActiveOrderByUserAndNode(ctx, generated.GetActiveOrderByUserAndNodeParams{
		UserID: userID,
		NodeID: nodeID,
	})
	if err == nil && existingOrder.Status == generated.OrderStatusCOMPLETED {
		return c.JSON(http.StatusConflict, map[string]string{"error": "Course already purchased"})
	}

	// 2. Fetch Pricing from payment_gates
	pg, err := h.store.GetPaymentGateByNode(ctx, nodeID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Free course registration
			var directOrder generated.Order
			txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
				o, err := q.CreateOrder(ctx, generated.CreateOrderParams{
					UserID:            userID,
					NodeID:            nodeID,
					ReferralCode:      refCodeNull,
					AmountPaid:        "0.00",
					Currency:          "BDT",
					Status:            generated.OrderStatusCOMPLETED,
					PaymentProvider:   "direct",
					ProviderReference: "free-enrollment",
				})
				if err != nil {
					return err
				}
				directOrder = o
				_, _ = q.CreateEnrollment(ctx, generated.CreateEnrollmentParams{
					UserID: userID,
					NodeID: nodeID,
				})
				h.attributeReferralCommission(ctx, q, o)
				return nil
			})
			if txErr != nil {
				return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create free enrollment")
			}
			return c.JSON(http.StatusOK, map[string]interface{}{
				"enrolled": true,
				"order_id": directOrder.ID.String(),
			})
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch course details")
	}

	price, err := strconv.ParseFloat(pg.Price, 64)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Invalid price amount format")
	}
	finalAmount := price

	// 3. Process Coupon (if provided)
	var couponID uuid.NullUUID
	if req.CouponCode != "" {
		coupon, err := h.store.GetCouponByCode(ctx, req.CouponCode)
		if err == nil {
			now := time.Now()
			expired := coupon.ExpiresAt.Valid && coupon.ExpiresAt.Time.Before(now)
			limitReached := coupon.MaxUses.Valid && coupon.UsedCount >= coupon.MaxUses.Int32

			if !expired && !limitReached {
				couponID = uuid.NullUUID{UUID: coupon.ID, Valid: true}
				discVal, err := strconv.ParseFloat(coupon.DiscountValue, 64)
				if err == nil {
					if coupon.DiscountType == generated.DiscountTypePERCENTAGE {
						finalAmount = finalAmount - (finalAmount * (discVal / 100))
					} else if coupon.DiscountType == generated.DiscountTypeFIXED {
						finalAmount = finalAmount - discVal
					}
					if finalAmount < 0 {
						finalAmount = 0
					}
				}
			}
		}
	}

	// 4. Process Referral Buyer Discount (if valid referral code provided)
	if refCodeNull.Valid && finalAmount > 0 {
		rc, err := h.store.GetReferralCodeByCode(ctx, refCodeNull.String)
		if err == nil && rc.UserID != userID {
			settings, err := h.store.GetReferralSettings(ctx)
			if err == nil && settings.IsEnabled {
				buyerDiscPct, err := strconv.ParseFloat(settings.BuyerDiscountPercentage, 64)
				if err == nil && buyerDiscPct > 0 {
					referralDiscount := (finalAmount * buyerDiscPct) / 100.0
					finalAmount = finalAmount - referralDiscount
					if finalAmount < 0 {
						finalAmount = 0
					}
				}
			}
		}
	}

	// 5. Handle Free Checkout after Coupon / Referral Discount
	if finalAmount <= 0 {
		var couponOrder generated.Order
		txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
			o, err := q.CreateOrder(ctx, generated.CreateOrderParams{
				UserID:            userID,
				NodeID:            nodeID,
				CouponID:          couponID,
				ReferralCode:      refCodeNull,
				AmountPaid:        "0.00",
				Currency:          pg.Currency,
				Status:            generated.OrderStatusCOMPLETED,
				PaymentProvider:   "coupon",
				ProviderReference: "coupon-free-enrollment",
			})
			if err != nil {
				return err
			}
			couponOrder = o
			_, _ = q.CreateEnrollment(ctx, generated.CreateEnrollmentParams{
				UserID: userID,
				NodeID: nodeID,
			})
			if couponID.Valid {
				_ = q.IncrementCouponUsage(ctx, couponID.UUID)
			}
			h.attributeReferralCommission(ctx, q, o)
			return nil
		})
		if txErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Checkout transaction failed")
		}
		h.sendOrderConfirmationEmailAsync(couponOrder)
		return c.JSON(http.StatusOK, map[string]interface{}{
			"enrolled": true,
			"order_id": couponOrder.ID.String(),
		})
	}

	// 5. Initialize SSLCommerz Payment Session
	var order generated.Order
	txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
		o, err := q.CreateOrder(ctx, generated.CreateOrderParams{
			UserID:            userID,
			NodeID:            nodeID,
			CouponID:          couponID,
			ReferralCode:      refCodeNull,
			AmountPaid:        strconv.FormatFloat(finalAmount, 'f', 2, 64),
			Currency:          pg.Currency,
			Status:            generated.OrderStatusPENDING,
			PaymentProvider:   "sslcommerz",
			ProviderReference: "pending",
		})
		order = o
		return err
	})
	if txErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Order initialization failed")
	}

	// Fetch Course Title for Gateway
	courseNode, err := h.store.GetCourse(ctx, nodeID)
	courseTitle := "Course Purchase"
	if err == nil {
		courseTitle = courseNode.Title
	}

	checkoutURL, err := h.sslcommerzService.InitiatePayment(
		order.ID.String(),
		finalAmount,
		pg.Currency,
		courseTitle,
		authUser.Email,
		authUser.Email,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Failed to initiate payment session: "+err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"enrolled":     false,
		"checkout_url": checkoutURL,
		"order_id":     order.ID.String(),
	})
}

// Callbacks (Form URL Encoded POST Requests from SSLCommerz)

func (h *CommerceHandler) HandleSuccess(c echo.Context) error {
	ctx := c.Request().Context()
	valID := c.FormValue("val_id")
	tranID := c.FormValue("tran_id")
	feURL := os.Getenv("FRONTEND_URL")
	if feURL == "" {
		feURL = "http://localhost:3000"
	}

	orderUUID, err := uuid.Parse(tranID)
	if err != nil {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?error=invalid_order")
	}

	order, err := h.store.GetOrderByTranID(ctx, orderUUID)
	if err != nil {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=order_not_found")
	}
	if order.Status == generated.OrderStatusCOMPLETED {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/success?tran_id="+tranID)
	}

	// Verify status with gateway server-to-server
	resp, err := h.sslcommerzService.ValidateTransaction(valID)
	if err != nil {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=verification_failed")
	}

	if resp.Status != "VALID" && resp.Status != "VALIDATED" {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=verification_failed")
	}

	// Secure verification checks
	if resp.TranId != order.ID.String() {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=transaction_mismatch")
	}

	gatewayAmount, err1 := strconv.ParseFloat(resp.Amount, 64)
	orderAmount, err2 := strconv.ParseFloat(order.AmountPaid, 64)
	if err1 != nil || err2 != nil || math.Abs(gatewayAmount-orderAmount) > 0.01 {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=amount_mismatch")
	}

	if resp.Currency != order.Currency {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=currency_mismatch")
	}

	var completedOrder generated.Order
	// Update order to Completed
	err = h.store.WithTx(ctx, func(q generated.Querier) error {
		o, err := q.GetOrderByTranID(ctx, orderUUID)
		if err != nil {
			return err
		}
		if o.Status == generated.OrderStatusCOMPLETED {
			completedOrder = o
			return nil // Already updated
		}

		updatedOrder, err := q.UpdateOrderReferenceAndStatus(ctx, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		})
		if err != nil {
			return err
		}
		completedOrder = updatedOrder

		_, _ = q.CreateEnrollment(ctx, generated.CreateEnrollmentParams{
			UserID: o.UserID,
			NodeID: o.NodeID,
		})

		if o.CouponID.Valid {
			_ = q.IncrementCouponUsage(ctx, o.CouponID.UUID)
		}

		h.attributeReferralCommission(ctx, q, o)
		return nil
	})

	if err != nil {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=db_update_failed")
	}

	h.sendOrderConfirmationEmailAsync(completedOrder)

	return c.Redirect(http.StatusSeeOther, feURL+"/payment/success?tran_id="+tranID)
}

func (h *CommerceHandler) HandleFail(c echo.Context) error {
	ctx := c.Request().Context()
	tranID := c.FormValue("tran_id")
	feURL := os.Getenv("FRONTEND_URL")
	if feURL == "" {
		feURL = "http://localhost:3000"
	}

	orderUUID, err := uuid.Parse(tranID)
	if err == nil {
		_ = h.store.WithTx(ctx, func(q generated.Querier) error {
			_, err := q.UpdateOrderStatus(ctx, generated.UpdateOrderStatusParams{
				ID:     orderUUID,
				Status: generated.OrderStatusREFUNDED,
			})
			return err
		})
	}

	return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID)
}

func (h *CommerceHandler) HandleCancel(c echo.Context) error {
	tranID := c.FormValue("tran_id")
	feURL := os.Getenv("FRONTEND_URL")
	if feURL == "" {
		feURL = "http://localhost:3000"
	}
	return c.Redirect(http.StatusSeeOther, feURL+"/payment/cancel?tran_id="+tranID)
}

func (h *CommerceHandler) HandleIPN(c echo.Context) error {
	ctx := c.Request().Context()
	valID := c.FormValue("val_id")
	tranID := c.FormValue("tran_id")
	status := c.FormValue("status")

	if status != "VALID" && status != "VALIDATED" {
		return c.NoContent(http.StatusOK)
	}

	orderUUID, err := uuid.Parse(tranID)
	if err != nil {
		return c.NoContent(http.StatusOK)
	}

	order, err := h.store.GetOrderByTranID(ctx, orderUUID)
	if err != nil {
		return c.NoContent(http.StatusOK)
	}
	if order.Status == generated.OrderStatusCOMPLETED {
		return c.NoContent(http.StatusOK)
	}

	// Double check with validator
	resp, err := h.sslcommerzService.ValidateTransaction(valID)
	if err != nil || (resp.Status != "VALID" && resp.Status != "VALIDATED") {
		return c.NoContent(http.StatusOK)
	}

	// Secure verification checks
	if resp.TranId != order.ID.String() {
		return c.NoContent(http.StatusOK)
	}

	gatewayAmount, err1 := strconv.ParseFloat(resp.Amount, 64)
	orderAmount, err2 := strconv.ParseFloat(order.AmountPaid, 64)
	if err1 != nil || err2 != nil || math.Abs(gatewayAmount-orderAmount) > 0.01 {
		return c.NoContent(http.StatusOK)
	}

	if resp.Currency != order.Currency {
		return c.NoContent(http.StatusOK)
	}

	var completedOrder generated.Order
	_ = h.store.WithTx(ctx, func(q generated.Querier) error {
		o, err := q.GetOrderByTranID(ctx, orderUUID)
		if err != nil {
			return err
		}
		if o.Status == generated.OrderStatusCOMPLETED {
			completedOrder = o
			return nil
		}

		updatedOrder, err := q.UpdateOrderReferenceAndStatus(ctx, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		})
		if err != nil {
			return err
		}
		completedOrder = updatedOrder

		_, _ = q.CreateEnrollment(ctx, generated.CreateEnrollmentParams{
			UserID: o.UserID,
			NodeID: o.NodeID,
		})

		if o.CouponID.Valid {
			_ = q.IncrementCouponUsage(ctx, o.CouponID.UUID)
		}

		h.attributeReferralCommission(ctx, q, o)
		return nil
	})

	h.sendOrderConfirmationEmailAsync(completedOrder)

	return c.NoContent(http.StatusOK)
}

func (h *CommerceHandler) CheckAccess(c echo.Context) error {
	slug := c.Param("slug")
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return c.JSON(http.StatusOK, map[string]bool{"has_access": false})
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return c.JSON(http.StatusOK, map[string]bool{"has_access": false})
	}

	if authUser.Role == "ADMIN" {
		return c.JSON(http.StatusOK, map[string]bool{"has_access": true})
	}

	course, err := h.store.GetCourseBySlug(ctx, slug)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Course not found")
	}

	// If no price set in payment gates, it is free
	_, pgErr := h.store.GetPaymentGateByNode(ctx, course.ID)
	if pgErr != nil && pgErr == sql.ErrNoRows {
		return c.JSON(http.StatusOK, map[string]bool{"has_access": true})
	}

	// Check access
	hasAccess, err := h.store.CheckUserAccessToNode(ctx, generated.CheckUserAccessToNodeParams{
		ID:     course.ID,
		UserID: userID,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Access validation failed")
	}

	return c.JSON(http.StatusOK, map[string]bool{"has_access": hasAccess})
}

type EnrolledCourseResponse struct {
	ID           string  `json:"id"`
	ParentID     *string `json:"parent_id"`
	NodeType     string  `json:"node_type"`
	Title        string  `json:"title"`
	Slug         string  `json:"slug"`
	Description  string  `json:"description"`
	ThumbnailURL *string `json:"thumbnail_url"`
	IsPublished  bool    `json:"is_published"`
	Price        *string `json:"price,omitempty"`
	Currency     *string `json:"currency,omitempty"`
	CreatedAt    string  `json:"created_at"`
	EnrolledAt   string  `json:"enrolled_at"`
}

func (h *CommerceHandler) GetEnrolledCourses(c echo.Context) error {
	ctx := c.Request().Context()
	authUser := internalMiddleware.GetAuthUser(c)
	if authUser.ID == "" {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	userID, err := uuid.Parse(authUser.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID in token")
	}

	courses, err := h.store.GetEnrolledCoursesByUser(ctx, userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to fetch enrolled courses: "+err.Error())
	}

	resp := make([]EnrolledCourseResponse, 0, len(courses))
	for _, row := range courses {
		var parentID *string
		if row.ParentID.Valid {
			pidStr := row.ParentID.UUID.String()
			parentID = &pidStr
		}

		var thumbnailURL *string
		if row.ThumbnailUrl.Valid {
			thumbnailURL = &row.ThumbnailUrl.String
		}

		var price *string
		if row.Price.Valid && row.Price.String != "" {
			price = &row.Price.String
		}

		var currency *string
		if row.Currency.Valid && row.Currency.String != "" {
			currency = &row.Currency.String
		}

		resp = append(resp, EnrolledCourseResponse{
			ID:           row.ID.String(),
			ParentID:     parentID,
			NodeType:     string(row.NodeType),
			Title:        row.Title,
			Slug:         row.Slug,
			Description:  row.Description.String,
			ThumbnailURL: thumbnailURL,
			IsPublished:  row.IsPublished,
			Price:        price,
			Currency:     currency,
			CreatedAt:    row.CreatedAt.Format(time.RFC3339),
			EnrolledAt:   row.EnrolledAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, resp)
}

// Admin Commerce Handlers

type AdminOrderResponse struct {
	ID                  string                  `json:"id"`
	UserID              string                  `json:"user_id"`
	UserName            string                  `json:"user_name"`
	UserEmail           string                  `json:"user_email"`
	NodeID              string                  `json:"node_id"`
	CourseTitle         string                  `json:"course_title"`
	CourseSlug          string                  `json:"course_slug"`
	AmountPaid          string                  `json:"amount_paid"`
	Currency            string                  `json:"currency"`
	Status              generated.OrderStatus   `json:"status"`
	PaymentProvider     string                  `json:"payment_provider"`
	ProviderReference   string                  `json:"provider_reference"`
	CouponID            *string                 `json:"coupon_id,omitempty"`
	CouponCode          *string                 `json:"coupon_code,omitempty"`
	CouponDiscountType  *generated.DiscountType `json:"coupon_discount_type,omitempty"`
	CouponDiscountValue *string                 `json:"coupon_discount_value,omitempty"`
	ReferralCode        *string                 `json:"referral_code,omitempty"`
	CreatedAt           string                  `json:"created_at"`
}

type AdminOrderListResponse struct {
	Orders     []AdminOrderResponse `json:"orders"`
	TotalCount int64                `json:"total_count"`
	Page       int                  `json:"page"`
	Limit      int                  `json:"limit"`
	TotalPages int                  `json:"total_pages"`
}

type AdminOrderSummaryResponse struct {
	TotalOrders     int64  `json:"total_orders"`
	TotalRevenue    string `json:"total_revenue"`
	CompletedOrders int64  `json:"completed_orders"`
	PendingOrders   int64  `json:"pending_orders"`
	RefundedOrders  int64  `json:"refunded_orders"`
}

type AdminOrderDetailResponse struct {
	ID                  string                  `json:"id"`
	UserID              string                  `json:"user_id"`
	UserName            string                  `json:"user_name"`
	UserEmail           string                  `json:"user_email"`
	UserRole            generated.UserRole      `json:"user_role"`
	NodeID              string                  `json:"node_id"`
	NodeType            generated.NodeType      `json:"node_type"`
	CourseTitle         string                  `json:"course_title"`
	CourseSlug          string                  `json:"course_slug"`
	CourseThumbnailURL  string                  `json:"course_thumbnail_url"`
	AmountPaid          string                  `json:"amount_paid"`
	Currency            string                  `json:"currency"`
	Status              generated.OrderStatus   `json:"status"`
	PaymentProvider     string                  `json:"payment_provider"`
	ProviderReference   string                  `json:"provider_reference"`
	CouponID            *string                 `json:"coupon_id,omitempty"`
	CouponCode          *string                 `json:"coupon_code,omitempty"`
	CouponDiscountType  *generated.DiscountType `json:"coupon_discount_type,omitempty"`
	CouponDiscountValue *string                 `json:"coupon_discount_value,omitempty"`
	ReferralCode        *string                 `json:"referral_code,omitempty"`
	CreatedAt           string                  `json:"created_at"`
}

type UpdateOrderStatusRequest struct {
	Status generated.OrderStatus `json:"status" validate:"required,oneof=PENDING COMPLETED REFUNDED"`
}

func (h *CommerceHandler) AdminListOrders(c echo.Context) error {
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

	var statusParam generated.NullOrderStatus
	statusStr := c.QueryParam("status")
	if statusStr != "" {
		statusParam = generated.NullOrderStatus{
			OrderStatus: generated.OrderStatus(statusStr),
			Valid:       true,
		}
	}

	var providerParam sql.NullString
	providerStr := c.QueryParam("payment_provider")
	if providerStr != "" {
		providerParam = sql.NullString{String: providerStr, Valid: true}
	}

	var searchParam sql.NullString
	searchStr := c.QueryParam("search")
	if searchStr != "" {
		searchParam = sql.NullString{String: searchStr, Valid: true}
	}

	rows, err := h.store.AdminListOrders(ctx, generated.AdminListOrdersParams{
		Status:          statusParam,
		PaymentProvider: providerParam,
		Search:          searchParam,
		Limit:           int32(limit),
		Offset:          int32(offset),
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to list orders: "+err.Error())
	}

	var totalCount int64
	orders := make([]AdminOrderResponse, 0, len(rows))

	for _, r := range rows {
		totalCount = r.TotalCount

		var couponID *string
		if r.CouponID.Valid {
			cidStr := r.CouponID.UUID.String()
			couponID = &cidStr
		}

		var couponCode *string
		if r.CouponCode.Valid {
			couponCode = &r.CouponCode.String
		}

		var discountType *generated.DiscountType
		if r.CouponDiscountType.Valid {
			dt := r.CouponDiscountType.DiscountType
			discountType = &dt
		}

		var discountValue *string
		if r.CouponDiscountValue.Valid {
			discountValue = &r.CouponDiscountValue.String
		}

		var refCode *string
		if r.ReferralCode.Valid {
			refCode = &r.ReferralCode.String
		}

		orders = append(orders, AdminOrderResponse{
			ID:                  r.ID.String(),
			UserID:              r.UserID.String(),
			UserName:            r.UserName,
			UserEmail:           r.UserEmail,
			NodeID:              r.NodeID.String(),
			CourseTitle:         r.CourseTitle,
			CourseSlug:          r.CourseSlug,
			AmountPaid:          r.AmountPaid,
			Currency:            r.Currency,
			Status:              r.Status,
			PaymentProvider:     r.PaymentProvider,
			ProviderReference:   r.ProviderReference,
			CouponID:            couponID,
			CouponCode:          couponCode,
			CouponDiscountType:  discountType,
			CouponDiscountValue: discountValue,
			ReferralCode:        refCode,
			CreatedAt:           r.CreatedAt.Format(time.RFC3339),
		})
	}

	totalPages := 0
	if totalCount > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(limit)))
	}

	return c.JSON(http.StatusOK, AdminOrderListResponse{
		Orders:     orders,
		TotalCount: totalCount,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	})
}

func (h *CommerceHandler) AdminGetOrderSummary(c echo.Context) error {
	ctx := c.Request().Context()

	summary, err := h.store.AdminGetOrderSummary(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get order summary: "+err.Error())
	}

	return c.JSON(http.StatusOK, AdminOrderSummaryResponse{
		TotalOrders:     summary.TotalOrders,
		TotalRevenue:    summary.TotalRevenue,
		CompletedOrders: summary.CompletedOrders,
		PendingOrders:   summary.PendingOrders,
		RefundedOrders:  summary.RefundedOrders,
	})
}

func (h *CommerceHandler) AdminGetOrderByID(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")

	orderUUID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid order ID")
	}

	r, err := h.store.AdminGetOrderByID(ctx, orderUUID)
	if err != nil {
		if err == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Order not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get order details: "+err.Error())
	}

	var couponID *string
	if r.CouponID.Valid {
		cidStr := r.CouponID.UUID.String()
		couponID = &cidStr
	}

	var couponCode *string
	if r.CouponCode.Valid {
		couponCode = &r.CouponCode.String
	}

	var discountType *generated.DiscountType
	if r.CouponDiscountType.Valid {
		dt := r.CouponDiscountType.DiscountType
		discountType = &dt
	}

	var discountValue *string
	if r.CouponDiscountValue.Valid {
		discountValue = &r.CouponDiscountValue.String
	}

	var refCode *string
	if r.ReferralCode.Valid {
		refCode = &r.ReferralCode.String
	}

	return c.JSON(http.StatusOK, AdminOrderDetailResponse{
		ID:                  r.ID.String(),
		UserID:              r.UserID.String(),
		UserName:            r.UserName,
		UserEmail:           r.UserEmail,
		UserRole:            r.UserRole,
		NodeID:              r.NodeID.String(),
		NodeType:            r.NodeType,
		CourseTitle:         r.CourseTitle,
		CourseSlug:          r.CourseSlug,
		CourseThumbnailURL:  r.CourseThumbnailUrl,
		AmountPaid:          r.AmountPaid,
		Currency:            r.Currency,
		Status:              r.Status,
		PaymentProvider:     r.PaymentProvider,
		ProviderReference:   r.ProviderReference,
		CouponID:            couponID,
		CouponCode:          couponCode,
		CouponDiscountType:  discountType,
		CouponDiscountValue: discountValue,
		ReferralCode:        refCode,
		CreatedAt:           r.CreatedAt.Format(time.RFC3339),
	})
}

func (h *CommerceHandler) AdminUpdateOrderStatus(c echo.Context) error {
	ctx := c.Request().Context()
	idStr := c.Param("id")

	orderUUID, err := uuid.Parse(idStr)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid order ID")
	}

	var req UpdateOrderStatusRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}

	if err := h.validate.Struct(req); err != nil {
		return echo.NewHTTPError(http.StatusUnprocessableEntity, err.Error())
	}

	var updatedOrder generated.Order
	txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
		existing, err := q.GetOrderByID(ctx, orderUUID)
		if err != nil {
			return err
		}

		o, err := q.UpdateOrderStatus(ctx, generated.UpdateOrderStatusParams{
			ID:     orderUUID,
			Status: req.Status,
		})
		if err != nil {
			return err
		}
		updatedOrder = o

		// If transitioning to COMPLETED, create enrollment and increment coupon
		if req.Status == generated.OrderStatusCOMPLETED && existing.Status != generated.OrderStatusCOMPLETED {
			_, _ = q.CreateEnrollment(ctx, generated.CreateEnrollmentParams{
				UserID: existing.UserID,
				NodeID: existing.NodeID,
			})

			if existing.CouponID.Valid {
				_ = q.IncrementCouponUsage(ctx, existing.CouponID.UUID)
			}

			h.attributeReferralCommission(ctx, q, updatedOrder)
		}

		// If transitioning to REFUNDED, revoke enrollment and cancel referral commission
		if req.Status == generated.OrderStatusREFUNDED && existing.Status != generated.OrderStatusREFUNDED {
			_ = q.DeleteEnrollment(ctx, generated.DeleteEnrollmentParams{
				UserID: existing.UserID,
				NodeID: existing.NodeID,
			})

			_, _ = q.UpdateReferralEarningStatus(ctx, generated.UpdateReferralEarningStatusParams{
				OrderID: orderUUID,
				Status:  generated.ReferralEarningStatusREFUNDEDREVOKED,
			})
		}

		return nil
	})

	if txErr != nil {
		if txErr == sql.ErrNoRows {
			return echo.NewHTTPError(http.StatusNotFound, "Order not found")
		}
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to update order status: "+txErr.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"id":     updatedOrder.ID.String(),
		"status": updatedOrder.Status,
	})
}

// Dashboard Analytics

type DashboardKPIs struct {
	TotalUsers       int64  `json:"total_users"`
	UsersThisMonth   int64  `json:"users_this_month"`
	PublishedCourses int64  `json:"published_courses"`
	TotalCourses     int64  `json:"total_courses"`
	TotalLessons     int64  `json:"total_lessons"`
	TotalQuizzes     int64  `json:"total_quizzes"`
	TotalEnrollments int64  `json:"total_enrollments"`
	TotalOrders      int64  `json:"total_orders"`
	CompletedOrders  int64  `json:"completed_orders"`
	PendingOrders    int64  `json:"pending_orders"`
	RefundedOrders   int64  `json:"refunded_orders"`
	TotalRevenue     string `json:"total_revenue"`
	RevenueThisMonth string `json:"revenue_this_month"`
	RevenueThisWeek  string `json:"revenue_this_week"`
}

type RevenueTrendPoint struct {
	Date            string  `json:"date"`
	DisplayLabel    string  `json:"display_label"`
	Revenue         float64 `json:"revenue"`
	TotalOrders     int64   `json:"total_orders"`
	CompletedOrders int64   `json:"completed_orders"`
}

type UserTrendPoint struct {
	Date     string `json:"date"`
	NewUsers int64  `json:"new_users"`
}

type TopCourseItem struct {
	ID            string  `json:"id"`
	Title         string  `json:"title"`
	Slug          string  `json:"slug"`
	TotalRevenue  float64 `json:"total_revenue"`
	TotalOrders   int64   `json:"total_orders"`
	TotalStudents int64   `json:"total_students"`
}

type PaymentDistributionItem struct {
	Provider    string  `json:"provider"`
	OrderCount  int64   `json:"order_count"`
	TotalAmount float64 `json:"total_amount"`
}

type RecentUserItem struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	Role      string `json:"role"`
	AvatarURL string `json:"avatar_url"`
	CreatedAt string `json:"created_at"`
}

type AdminDashboardAnalyticsResponse struct {
	KPIs                 DashboardKPIs             `json:"kpis"`
	DailyRevenueTrends   []RevenueTrendPoint       `json:"daily_revenue_trends"`
	MonthlyRevenueTrends []RevenueTrendPoint       `json:"monthly_revenue_trends"`
	DailyUserTrends      []UserTrendPoint          `json:"daily_user_trends"`
	TopCourses           []TopCourseItem           `json:"top_courses"`
	PaymentDistribution  []PaymentDistributionItem `json:"payment_distribution"`
	RecentOrders         []AdminOrderResponse      `json:"recent_orders"`
	RecentUsers          []RecentUserItem          `json:"recent_users"`
}

func (h *CommerceHandler) AdminGetDashboardAnalytics(c echo.Context) error {
	ctx := c.Request().Context()

	stats, err := h.store.AdminGetDashboardStats(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get dashboard stats: "+err.Error())
	}

	dailyRows, err := h.store.AdminGetDailyRevenueAndOrders(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get daily revenue: "+err.Error())
	}

	dailyTrends := make([]RevenueTrendPoint, 0, len(dailyRows))
	for _, r := range dailyRows {
		rev, _ := strconv.ParseFloat(r.Revenue, 64)
		dailyTrends = append(dailyTrends, RevenueTrendPoint{
			Date:            r.DateLabel,
			DisplayLabel:    r.DateLabel,
			Revenue:         rev,
			TotalOrders:     r.TotalOrders,
			CompletedOrders: r.CompletedOrders,
		})
	}

	monthlyRows, err := h.store.AdminGetMonthlyRevenueAndOrders(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get monthly revenue: "+err.Error())
	}

	monthlyTrends := make([]RevenueTrendPoint, 0, len(monthlyRows))
	for _, r := range monthlyRows {
		rev, _ := strconv.ParseFloat(r.Revenue, 64)
		monthlyTrends = append(monthlyTrends, RevenueTrendPoint{
			Date:            r.MonthLabel,
			DisplayLabel:    r.DisplayLabel,
			Revenue:         rev,
			TotalOrders:     r.TotalOrders,
			CompletedOrders: r.CompletedOrders,
		})
	}

	userRows, err := h.store.AdminGetDailyUserRegistrations(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get user trends: "+err.Error())
	}

	userTrends := make([]UserTrendPoint, 0, len(userRows))
	for _, r := range userRows {
		userTrends = append(userTrends, UserTrendPoint{
			Date:     r.DateLabel,
			NewUsers: r.NewUsers,
		})
	}

	topCourseRows, err := h.store.AdminGetTopPerformingCourses(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get top courses: "+err.Error())
	}

	topCourses := make([]TopCourseItem, 0, len(topCourseRows))
	for _, r := range topCourseRows {
		rev, _ := strconv.ParseFloat(r.TotalRevenue, 64)
		topCourses = append(topCourses, TopCourseItem{
			ID:            r.NodeID.String(),
			Title:         r.Title,
			Slug:          r.Slug,
			TotalRevenue:  rev,
			TotalOrders:   r.TotalOrders,
			TotalStudents: r.TotalStudents,
		})
	}

	distRows, err := h.store.AdminGetPaymentProviderDistribution(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get payment distribution: "+err.Error())
	}

	paymentDist := make([]PaymentDistributionItem, 0, len(distRows))
	for _, r := range distRows {
		amt, _ := strconv.ParseFloat(r.TotalAmount, 64)
		paymentDist = append(paymentDist, PaymentDistributionItem{
			Provider:    r.PaymentProvider,
			OrderCount:  r.OrderCount,
			TotalAmount: amt,
		})
	}

	recentUserRows, err := h.store.AdminGetRecentUsers(ctx)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get recent users: "+err.Error())
	}

	recentUsers := make([]RecentUserItem, 0, len(recentUserRows))
	for _, r := range recentUserRows {
		recentUsers = append(recentUsers, RecentUserItem{
			ID:        r.ID.String(),
			Email:     r.Email,
			FullName:  r.FullName,
			Role:      string(r.Role),
			AvatarURL: r.AvatarUrl,
			CreatedAt: r.CreatedAt.Format(time.RFC3339),
		})
	}

	recentOrderRows, err := h.store.AdminListOrders(ctx, generated.AdminListOrdersParams{
		Limit:  5,
		Offset: 0,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to get recent orders: "+err.Error())
	}

	recentOrders := make([]AdminOrderResponse, 0, len(recentOrderRows))
	for _, r := range recentOrderRows {
		var couponID *string
		if r.CouponID.Valid {
			cidStr := r.CouponID.UUID.String()
			couponID = &cidStr
		}
		var couponCode *string
		if r.CouponCode.Valid {
			couponCode = &r.CouponCode.String
		}
		var discountType *generated.DiscountType
		if r.CouponDiscountType.Valid {
			dt := r.CouponDiscountType.DiscountType
			discountType = &dt
		}
		var discountValue *string
		if r.CouponDiscountValue.Valid {
			discountValue = &r.CouponDiscountValue.String
		}

		var refCode *string
		if r.ReferralCode.Valid {
			refCode = &r.ReferralCode.String
		}

		recentOrders = append(recentOrders, AdminOrderResponse{
			ID:                  r.ID.String(),
			UserID:              r.UserID.String(),
			UserName:            r.UserName,
			UserEmail:           r.UserEmail,
			NodeID:              r.NodeID.String(),
			CourseTitle:         r.CourseTitle,
			CourseSlug:          r.CourseSlug,
			AmountPaid:          r.AmountPaid,
			Currency:            r.Currency,
			Status:              r.Status,
			PaymentProvider:     r.PaymentProvider,
			ProviderReference:   r.ProviderReference,
			CouponID:            couponID,
			CouponCode:          couponCode,
			CouponDiscountType:  discountType,
			CouponDiscountValue: discountValue,
			ReferralCode:        refCode,
			CreatedAt:           r.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(http.StatusOK, AdminDashboardAnalyticsResponse{
		KPIs: DashboardKPIs{
			TotalUsers:       stats.TotalUsers,
			UsersThisMonth:   stats.UsersThisMonth,
			PublishedCourses: stats.PublishedCourses,
			TotalCourses:     stats.TotalCourses,
			TotalLessons:     stats.TotalLessons,
			TotalQuizzes:     stats.TotalQuizzes,
			TotalEnrollments: stats.TotalEnrollments,
			TotalOrders:      stats.TotalOrders,
			CompletedOrders:  stats.CompletedOrders,
			PendingOrders:    stats.PendingOrders,
			RefundedOrders:   stats.RefundedOrders,
			TotalRevenue:     stats.TotalRevenue,
			RevenueThisMonth: stats.RevenueThisMonth,
			RevenueThisWeek:  stats.RevenueThisWeek,
		},
		DailyRevenueTrends:   dailyTrends,
		MonthlyRevenueTrends: monthlyTrends,
		DailyUserTrends:      userTrends,
		TopCourses:           topCourses,
		PaymentDistribution:  paymentDist,
		RecentOrders:         recentOrders,
		RecentUsers:          recentUsers,
	})
}

// attributeReferralCommission credits commission to the referrer when an order is completed.
func (h *CommerceHandler) attributeReferralCommission(ctx context.Context, q generated.Querier, order generated.Order) {
	if !order.ReferralCode.Valid || order.ReferralCode.String == "" {
		return
	}
	// 1. Check if commission was already attributed for this order
	_, err := q.GetReferralEarningByOrderID(ctx, order.ID)
	if err == nil {
		return // Already recorded
	}
	// 2. Fetch referrer by code
	rc, err := q.GetReferralCodeByCode(ctx, order.ReferralCode.String)
	if err != nil {
		return // Referral code not found
	}
	// 3. Prevent self-referral
	if rc.UserID == order.UserID {
		return
	}
	// 4. Check if referral program is active and fetch commission %
	settings, err := q.GetReferralSettings(ctx)
	if err != nil || !settings.IsEnabled {
		return
	}
	commPct, err := strconv.ParseFloat(settings.CommissionPercentage, 64)
	if err != nil || commPct <= 0 {
		return
	}
	orderAmt, err := strconv.ParseFloat(order.AmountPaid, 64)
	if err != nil || orderAmt <= 0 {
		return
	}
	commissionEarned := (orderAmt * commPct) / 100.0
	commEarnedStr := fmt.Sprintf("%.2f", commissionEarned)

	_, _ = q.CreateReferralEarning(ctx, generated.CreateReferralEarningParams{
		ReferrerUserID:       rc.UserID,
		ReferredUserID:       order.UserID,
		OrderID:              order.ID,
		NodeID:               order.NodeID,
		OrderAmount:          order.AmountPaid,
		CommissionPercentage: settings.CommissionPercentage,
		CommissionEarned:     commEarnedStr,
		Currency:             order.Currency,
		Status:               generated.ReferralEarningStatusCOMMISSIONEARNED,
	})
}
