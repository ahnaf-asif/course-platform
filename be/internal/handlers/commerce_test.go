package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/sagar290/sslcommerz-go/models"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/shafins-course/backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockPaymentGateway struct {
	mock.Mock
}

func (m *MockPaymentGateway) InitiatePayment(tranID string, amount float64, currency string, productName string, customerName string, customerEmail string) (string, error) {
	args := m.Called(tranID, amount, currency, productName, customerName, customerEmail)
	return args.String(0), args.Error(1)
}

func (m *MockPaymentGateway) ValidateTransaction(valID string) (*models.OrderValidateResponse, error) {
	args := m.Called(valID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.OrderValidateResponse), args.Error(1)
}

func TestCommerceHandler_Checkout(t *testing.T) {
	e := echo.New()

	t.Run("Unauthorized", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, he.Code)
	})

	t.Run("Invalid User ID in Token", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: "invalid-uuid",
		})

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, he.Code)
	})

	t.Run("Bind Error", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", strings.NewReader("invalid-json"))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: uuid.New().String(),
		})

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadRequest, he.Code)
	})

	t.Run("Validation Error Node ID missing", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		reqBody, _ := json.Marshal(map[string]string{})
		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: uuid.New().String(),
		})

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnprocessableEntity, he.Code)
	})

	t.Run("Invalid Node ID format", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		reqBody, _ := json.Marshal(map[string]string{
			"node_id": "not-a-uuid",
		})
		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: uuid.New().String(),
		})

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnprocessableEntity, he.Code)
	})

	t.Run("Already Purchased", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, generated.GetActiveOrderByUserAndNodeParams{
			UserID: userID,
			NodeID: nodeID,
		}).Return(generated.Order{
			Status: generated.OrderStatusCOMPLETED,
		}, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusConflict, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Free Course", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{}, sql.ErrNoRows)

		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.UserID == userID && params.NodeID == nodeID && params.AmountPaid == "0.00" && params.Status == generated.OrderStatusCOMPLETED
		})).Return(generated.Order{ID: uuid.New()}, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]interface{}
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, true, resp["enrolled"])

		mockStore.AssertExpectations(t)
	})

	t.Run("Free Course Create Order Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{}, sql.ErrNoRows)
		mockStore.On("CreateOrder", mock.Anything, mock.Anything).Return(generated.Order{}, errors.New("db error"))

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("GetPaymentGateByNode Database Error", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{}, errors.New("db query error"))

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("GetPaymentGateByNode Price Parse Error", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price: "not-a-float",
		}, nil)

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		orderID := uuid.New()
		mockStore.On("CreateOrder", mock.Anything, mock.Anything).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		checkoutRedirect := "https://gateway.com/pay"
		mockGateway.On("InitiatePayment", orderID.String(), 100.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return(checkoutRedirect, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]interface{}
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, false, resp["enrolled"])
		assert.Equal(t, checkoutRedirect, resp["checkout_url"])

		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course with Valid Percentage Coupon", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()
		couponCode := "DISCOUNT10"

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID:     nodeID.String(),
			CouponCode: couponCode,
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		couponID := uuid.New()
		mockStore.On("GetCouponByCode", mock.Anything, couponCode).Return(generated.Coupon{
			ID:            couponID,
			DiscountType:  generated.DiscountTypePERCENTAGE,
			DiscountValue: "10.00",
			ExpiresAt:     sql.NullTime{Valid: false},
			MaxUses:       sql.NullInt32{Valid: false},
		}, nil)

		orderID := uuid.New()
		// Price should be 100 - (100 * 0.10) = 90.00
		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.AmountPaid == "90.00" && params.CouponID.UUID == couponID
		})).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		checkoutRedirect := "https://gateway.com/pay"
		mockGateway.On("InitiatePayment", orderID.String(), 90.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return(checkoutRedirect, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course with Valid Fixed Coupon", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()
		couponCode := "FIXED20"

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID:     nodeID.String(),
			CouponCode: couponCode,
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		couponID := uuid.New()
		mockStore.On("GetCouponByCode", mock.Anything, couponCode).Return(generated.Coupon{
			ID:            couponID,
			DiscountType:  generated.DiscountTypeFIXED,
			DiscountValue: "20.00",
			ExpiresAt:     sql.NullTime{Valid: false},
			MaxUses:       sql.NullInt32{Valid: false},
		}, nil)

		orderID := uuid.New()
		// Price should be 100 - 20 = 80.00
		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.AmountPaid == "80.00" && params.CouponID.UUID == couponID
		})).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		checkoutRedirect := "https://gateway.com/pay"
		mockGateway.On("InitiatePayment", orderID.String(), 80.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return(checkoutRedirect, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course with Free Coupon Checkout", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()
		couponCode := "FREE100"

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID:     nodeID.String(),
			CouponCode: couponCode,
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		couponID := uuid.New()
		mockStore.On("GetCouponByCode", mock.Anything, couponCode).Return(generated.Coupon{
			ID:            couponID,
			DiscountType:  generated.DiscountTypePERCENTAGE,
			DiscountValue: "100.00",
			ExpiresAt:     sql.NullTime{Valid: false},
			MaxUses:       sql.NullInt32{Valid: false},
		}, nil)

		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.AmountPaid == "0.00" && params.Status == generated.OrderStatusCOMPLETED && params.CouponID.UUID == couponID
		})).Return(generated.Order{ID: uuid.New()}, nil)

		mockStore.On("IncrementCouponUsage", mock.Anything, couponID).Return(nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]interface{}
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Equal(t, true, resp["enrolled"])
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course with Expired Coupon", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()
		couponCode := "EXPIRED"

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID:     nodeID.String(),
			CouponCode: couponCode,
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetCouponByCode", mock.Anything, couponCode).Return(generated.Coupon{
			ID:            uuid.New(),
			DiscountType:  generated.DiscountTypePERCENTAGE,
			DiscountValue: "50.00",
			ExpiresAt:     sql.NullTime{Time: time.Now().Add(-1 * time.Hour), Valid: true},
			MaxUses:       sql.NullInt32{Valid: false},
		}, nil)

		orderID := uuid.New()
		// Price remains 100.00 because coupon is expired
		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.AmountPaid == "100.00" && !params.CouponID.Valid
		})).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		checkoutRedirect := "https://gateway.com/pay"
		mockGateway.On("InitiatePayment", orderID.String(), 100.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return(checkoutRedirect, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Paid Course with Limit Reached Coupon", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()
		couponCode := "LIMIT"

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID:     nodeID.String(),
			CouponCode: couponCode,
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetCouponByCode", mock.Anything, couponCode).Return(generated.Coupon{
			ID:            uuid.New(),
			DiscountType:  generated.DiscountTypePERCENTAGE,
			DiscountValue: "50.00",
			ExpiresAt:     sql.NullTime{Valid: false},
			MaxUses:       sql.NullInt32{Int32: 5, Valid: true},
			UsedCount:     5,
		}, nil)

		orderID := uuid.New()
		mockStore.On("CreateOrder", mock.Anything, mock.MatchedBy(func(params generated.CreateOrderParams) bool {
			return params.AmountPaid == "100.00" && !params.CouponID.Valid
		})).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		checkoutRedirect := "https://gateway.com/pay"
		mockGateway.On("InitiatePayment", orderID.String(), 100.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return(checkoutRedirect, nil)

		err := h.Checkout(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("CreateOrder Paid Course Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("CreateOrder", mock.Anything, mock.Anything).Return(generated.Order{}, errors.New("db error"))

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("InitiatePayment Paid Course Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		nodeID := uuid.New()

		reqBody, _ := json.Marshal(CheckoutRequest{
			NodeID: nodeID.String(),
		})

		req := httptest.NewRequest(http.MethodPost, "/orders/checkout", bytes.NewBuffer(reqBody))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Email: "test@example.com",
			Role:  "USER",
		})

		mockStore.On("GetActiveOrderByUserAndNode", mock.Anything, mock.Anything).Return(generated.Order{}, sql.ErrNoRows)
		mockStore.On("GetPaymentGateByNode", mock.Anything, nodeID).Return(generated.PaymentGate{
			Price:    "100.00",
			Currency: "BDT",
		}, nil)

		orderID := uuid.New()
		mockStore.On("CreateOrder", mock.Anything, mock.Anything).Return(generated.Order{
			ID: orderID,
		}, nil)

		mockStore.On("GetCourse", mock.Anything, nodeID).Return(generated.GetCourseRow{
			Title: "Test Paid Course",
		}, nil)

		mockGateway.On("InitiatePayment", orderID.String(), 100.0, "BDT", "Test Paid Course", "test@example.com", "test@example.com").Return("", errors.New("gateway error"))

		err := h.Checkout(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusBadGateway, he.Code)
		mockStore.AssertExpectations(t)
	})
}

func TestCommerceHandler_HandleSuccess(t *testing.T) {
	e := echo.New()
	os.Setenv("FRONTEND_URL", "http://localhost:3000")
	defer os.Unsetenv("FRONTEND_URL")

	t.Run("Success Validation", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		valID := "val-12345"
		tranID := uuid.New().String()

		form := url.Values{}
		form.Add("val_id", valID)
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status:   "VALID",
			TranId:   tranID,
			Amount:   "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			CouponID:   uuid.NullUUID{},
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)

		mockStore.On("UpdateOrderReferenceAndStatus", mock.Anything, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		}).Return(generated.Order{}, nil)

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Equal(t, "http://localhost:3000/payment/success?tran_id="+tranID, rec.Header().Get(echo.HeaderLocation))

		mockStore.AssertExpectations(t)
	})

	t.Run("Success Validation with Coupon", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		valID := "val-12345"
		tranID := uuid.New().String()

		form := url.Values{}
		form.Add("val_id", valID)
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		couponID := uuid.New()
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status:   "VALID",
			TranId:   tranID,
			Amount:   "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			CouponID:   uuid.NullUUID{UUID: couponID, Valid: true},
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)

		mockStore.On("UpdateOrderReferenceAndStatus", mock.Anything, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		}).Return(generated.Order{}, nil)

		mockStore.On("IncrementCouponUsage", mock.Anything, couponID).Return(nil)

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Invalid Order ID", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		form := url.Values{}
		form.Add("val_id", "val-123")
		form.Add("tran_id", "not-a-uuid")

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Contains(t, rec.Header().Get(echo.HeaderLocation), "/payment/fail?error=invalid_order")
	})

	t.Run("Gateway Validation Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		valID := "val-12345"
		tranID := uuid.New().String()

		form := url.Values{}
		form.Add("val_id", valID)
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status: "FAILED",
		}, nil)

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Contains(t, rec.Header().Get(echo.HeaderLocation), "/payment/fail?tran_id="+tranID+"&error=verification_failed")
	})

	t.Run("Already Completed", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		valID := "val-12345"
		tranID := uuid.New().String()

		form := url.Values{}
		form.Add("val_id", valID)
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:     orderUUID,
			Status: generated.OrderStatusCOMPLETED,
		}, nil)

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Equal(t, "http://localhost:3000/payment/success?tran_id="+tranID, rec.Header().Get(echo.HeaderLocation))
	})

	t.Run("DB Update Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		valID := "val-12345"
		tranID := uuid.New().String()

		form := url.Values{}
		form.Add("val_id", valID)
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/success", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status:   "VALID",
			TranId:   tranID,
			Amount:   "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)

		mockStore.On("UpdateOrderReferenceAndStatus", mock.Anything, mock.Anything).Return(generated.Order{}, errors.New("db error"))

		err := h.HandleSuccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Contains(t, rec.Header().Get(echo.HeaderLocation), "/payment/fail?tran_id="+tranID+"&error=db_update_failed")
	})
}

func TestCommerceHandler_HandleFail(t *testing.T) {
	e := echo.New()
	os.Setenv("FRONTEND_URL", "http://localhost:3000")
	defer os.Unsetenv("FRONTEND_URL")

	t.Run("Success", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		tranID := uuid.New().String()
		form := url.Values{}
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/fail", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockStore.On("UpdateOrderStatus", mock.Anything, generated.UpdateOrderStatusParams{
			ID:     orderUUID,
			Status: generated.OrderStatusREFUNDED,
		}).Return(generated.Order{}, nil)

		err := h.HandleFail(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Equal(t, "http://localhost:3000/payment/fail?tran_id="+tranID, rec.Header().Get(echo.HeaderLocation))
		mockStore.AssertExpectations(t)
	})

	t.Run("Invalid Order ID", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		form := url.Values{}
		form.Add("tran_id", "invalid-uuid")

		req := httptest.NewRequest(http.MethodPost, "/fail", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.HandleFail(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Equal(t, "http://localhost:3000/payment/fail?tran_id=invalid-uuid", rec.Header().Get(echo.HeaderLocation))
	})
}

func TestCommerceHandler_HandleCancel(t *testing.T) {
	e := echo.New()
	os.Setenv("FRONTEND_URL", "http://localhost:3000")
	defer os.Unsetenv("FRONTEND_URL")

	t.Run("Success", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		tranID := "some-tran-id"
		form := url.Values{}
		form.Add("tran_id", tranID)

		req := httptest.NewRequest(http.MethodPost, "/cancel", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.HandleCancel(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusSeeOther, rec.Code)
		assert.Equal(t, "http://localhost:3000/payment/cancel?tran_id="+tranID, rec.Header().Get(echo.HeaderLocation))
	})
}

func TestCommerceHandler_HandleIPN(t *testing.T) {
	e := echo.New()

	t.Run("Invalid Status", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		form := url.Values{}
		form.Add("status", "FAILED")

		req := httptest.NewRequest(http.MethodPost, "/ipn", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.HandleIPN(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Invalid Order ID", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		form := url.Values{}
		form.Add("status", "VALID")
		form.Add("tran_id", "invalid-uuid")

		req := httptest.NewRequest(http.MethodPost, "/ipn", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.HandleIPN(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("Validation Fails", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		tranID := uuid.New().String()
		valID := "val-123"
		form := url.Values{}
		form.Add("status", "VALID")
		form.Add("tran_id", tranID)
		form.Add("val_id", valID)

		req := httptest.NewRequest(http.MethodPost, "/ipn", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status: "FAILED",
		}, nil)

		err := h.HandleIPN(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockGateway.AssertExpectations(t)
	})

	t.Run("Success Valid Validation IPN", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		tranID := uuid.New().String()
		valID := "val-123"
		form := url.Values{}
		form.Add("status", "VALID")
		form.Add("tran_id", tranID)
		form.Add("val_id", valID)

		req := httptest.NewRequest(http.MethodPost, "/ipn", strings.NewReader(form.Encode()))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationForm)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		orderUUID, _ := uuid.Parse(tranID)
		couponID := uuid.New()
		mockGateway.On("ValidateTransaction", valID).Return(&models.OrderValidateResponse{
			Status:   "VALID",
			TranId:   tranID,
			Amount:   "100.00",
			Currency: "BDT",
		}, nil)

		mockStore.On("GetOrderByTranID", mock.Anything, orderUUID).Return(generated.Order{
			ID:         orderUUID,
			Status:     generated.OrderStatusPENDING,
			CouponID:   uuid.NullUUID{UUID: couponID, Valid: true},
			AmountPaid: "100.00",
			Currency:   "BDT",
		}, nil)

		mockStore.On("UpdateOrderReferenceAndStatus", mock.Anything, generated.UpdateOrderReferenceAndStatusParams{
			ID:                orderUUID,
			Status:            generated.OrderStatusCOMPLETED,
			ProviderReference: valID,
		}).Return(generated.Order{}, nil)

		mockStore.On("IncrementCouponUsage", mock.Anything, couponID).Return(nil)

		err := h.HandleIPN(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)
		mockStore.AssertExpectations(t)
	})
}

func TestCommerceHandler_CheckAccess(t *testing.T) {
	e := echo.New()

	t.Run("Has Access User Purchased", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		courseID := uuid.New()
		slug := "test-course"

		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "test@example.com",
		})

		mockStore.On("GetCourseBySlug", mock.Anything, slug).Return(generated.GetCourseBySlugRow{
			ID: courseID,
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{
			Price: "99.00",
		}, nil)

		mockStore.On("CheckUserAccessToNode", mock.Anything, generated.CheckUserAccessToNodeParams{
			ID:     courseID,
			UserID: userID,
		}).Return(true, nil)

		err := h.CheckAccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]bool
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.True(t, resp["has_access"])

		mockStore.AssertExpectations(t)
	})

	t.Run("Unauthorized User", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		slug := "test-course"
		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		err := h.CheckAccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]bool
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.False(t, resp["has_access"])
	})

	t.Run("Invalid User ID in Token", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		slug := "test-course"
		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID: "invalid-uuid",
		})

		err := h.CheckAccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]bool
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.False(t, resp["has_access"])
	})

	t.Run("Admin Access", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		slug := "test-course"

		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "ADMIN",
			Email: "admin@example.com",
		})

		err := h.CheckAccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]bool
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.True(t, resp["has_access"])
	})

	t.Run("Course Not Found", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		slug := "test-course"

		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "test@example.com",
		})

		mockStore.On("GetCourseBySlug", mock.Anything, slug).Return(generated.GetCourseBySlugRow{}, sql.ErrNoRows)

		err := h.CheckAccess(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusNotFound, he.Code)
		mockStore.AssertExpectations(t)
	})

	t.Run("Free Course Access (No Payment Gate)", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		courseID := uuid.New()
		slug := "test-course"

		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "test@example.com",
		})

		mockStore.On("GetCourseBySlug", mock.Anything, slug).Return(generated.GetCourseBySlugRow{
			ID: courseID,
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{}, sql.ErrNoRows)

		err := h.CheckAccess(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp map[string]bool
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.True(t, resp["has_access"])
		mockStore.AssertExpectations(t)
	})

	t.Run("Access Validation DB Error", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		courseID := uuid.New()
		slug := "test-course"

		req := httptest.NewRequest(http.MethodGet, "/courses/s/"+slug+"/access", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.SetParamNames("slug")
		c.SetParamValues(slug)

		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "test@example.com",
		})

		mockStore.On("GetCourseBySlug", mock.Anything, slug).Return(generated.GetCourseBySlugRow{
			ID: courseID,
		}, nil)

		mockStore.On("GetPaymentGateByNode", mock.Anything, courseID).Return(generated.PaymentGate{
			Price: "99.00",
		}, nil)

		mockStore.On("CheckUserAccessToNode", mock.Anything, mock.Anything).Return(false, errors.New("db error"))

		err := h.CheckAccess(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})
}

func TestCommerceHandler_GetEnrolledCourses(t *testing.T) {
	e := echo.New()

	t.Run("Unauthorized", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		req := httptest.NewRequest(http.MethodGet, "/courses/enrolled", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)

		err := h.GetEnrolledCourses(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusUnauthorized, he.Code)
	})

	t.Run("Success Empty List", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/enrolled", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "student@example.com",
		})

		mockStore.On("GetEnrolledCoursesByUser", mock.Anything, userID).Return([]generated.GetEnrolledCoursesByUserRow{}, nil)

		err := h.GetEnrolledCourses(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []EnrolledCourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 0)
		mockStore.AssertExpectations(t)
	})

	t.Run("Success Populated List", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		courseID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/enrolled", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "student@example.com",
		})

		mockStore.On("GetEnrolledCoursesByUser", mock.Anything, userID).Return([]generated.GetEnrolledCoursesByUserRow{
			{
				ID:           courseID,
				NodeType:     generated.NodeTypeCOURSE,
				Title:        "Go Course",
				Slug:         "go-course",
				Description:  sql.NullString{String: "Learn Go programming language", Valid: true},
				ThumbnailUrl: sql.NullString{String: "https://example.com/thumbnail.png", Valid: true},
				IsPublished:  true,
				Price:        sql.NullString{String: "199.00", Valid: true},
				Currency:     sql.NullString{String: "USD", Valid: true},
				CreatedAt:    time.Now(),
				EnrolledAt:   time.Now(),
			},
		}, nil)

		err := h.GetEnrolledCourses(c)
		assert.NoError(t, err)
		assert.Equal(t, http.StatusOK, rec.Code)

		var resp []EnrolledCourseResponse
		json.Unmarshal(rec.Body.Bytes(), &resp)
		assert.Len(t, resp, 1)
		assert.Equal(t, "go-course", resp[0].Slug)
		assert.Equal(t, "USD", *resp[0].Currency)
		assert.Equal(t, "199.00", *resp[0].Price)
		mockStore.AssertExpectations(t)
	})

	t.Run("DB Error", func(t *testing.T) {
		mockStore := new(MockStore)
		mockGateway := new(MockPaymentGateway)
		h := NewCommerceHandler(mockStore, mockGateway)

		userID := uuid.New()
		req := httptest.NewRequest(http.MethodGet, "/courses/enrolled", nil)
		rec := httptest.NewRecorder()
		c := e.NewContext(req, rec)
		c.Set(middleware.AuthUserContextKey, &middleware.AuthUser{
			ID:    userID.String(),
			Role:  "USER",
			Email: "student@example.com",
		})

		mockStore.On("GetEnrolledCoursesByUser", mock.Anything, userID).Return([]generated.GetEnrolledCoursesByUserRow(nil), errors.New("db connection failure"))

		err := h.GetEnrolledCourses(c)
		assert.Error(t, err)
		he, ok := err.(*echo.HTTPError)
		assert.True(t, ok)
		assert.Equal(t, http.StatusInternalServerError, he.Code)
		mockStore.AssertExpectations(t)
	})
}
