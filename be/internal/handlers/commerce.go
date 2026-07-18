package handlers

import (
	"database/sql"
	"math"
	"net/http"
	"os"
	"strconv"
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
	validate          *validator.Validate
}

func NewCommerceHandler(store db.Store, sslService services.PaymentGateway) *CommerceHandler {
	return &CommerceHandler{
		store:             store,
		sslcommerzService: sslService,
		validate:          validator.New(),
	}
}

type CheckoutRequest struct {
	NodeID     string `json:"node_id" validate:"required,uuid"`
	CouponCode string `json:"coupon_code"`
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
					AmountPaid:        "0.00",
					Currency:          "BDT",
					Status:            generated.OrderStatusCOMPLETED,
					PaymentProvider:   "direct",
					ProviderReference: "free-enrollment",
				})
				directOrder = o
				return err
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

	// 4. Handle Free Checkout after Coupon
	if finalAmount <= 0 {
		var couponOrder generated.Order
		txErr := h.store.WithTx(ctx, func(q generated.Querier) error {
			o, err := q.CreateOrder(ctx, generated.CreateOrderParams{
				UserID:            userID,
				NodeID:            nodeID,
				CouponID:          couponID,
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
			if couponID.Valid {
				return q.IncrementCouponUsage(ctx, couponID.UUID)
			}
			return nil
		})
		if txErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Checkout transaction failed")
		}
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

	// Update order to Completed
	err = h.store.WithTx(ctx, func(q generated.Querier) error {
		o, err := q.GetOrderByTranID(ctx, orderUUID)
		if err != nil {
			return err
		}
		if o.Status == generated.OrderStatusCOMPLETED {
			return nil // Already updated
		}

		_, err = q.UpdateOrderReferenceAndStatus(ctx, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		})
		if err != nil {
			return err
		}

		if o.CouponID.Valid {
			return q.IncrementCouponUsage(ctx, o.CouponID.UUID)
		}
		return nil
	})

	if err != nil {
		return c.Redirect(http.StatusSeeOther, feURL+"/payment/fail?tran_id="+tranID+"&error=db_update_failed")
	}

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

	_ = h.store.WithTx(ctx, func(q generated.Querier) error {
		o, err := q.GetOrderByTranID(ctx, orderUUID)
		if err != nil {
			return err
		}
		if o.Status == generated.OrderStatusCOMPLETED {
			return nil
		}

		_, err = q.UpdateOrderReferenceAndStatus(ctx, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		})
		if err != nil {
			return err
		}

		if o.CouponID.Valid {
			return q.IncrementCouponUsage(ctx, o.CouponID.UUID)
		}
		return nil
	})

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
