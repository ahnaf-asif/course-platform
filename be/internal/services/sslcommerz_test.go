package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	ssl "github.com/sagar290/sslcommerz-go"
	"github.com/stretchr/testify/assert"
)

func TestSSLCommerzService_InitiatePayment(t *testing.T) {
	t.Run("Success", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := map[string]interface{}{
				"status":          "SUCCESS",
				"failedreason":    "",
				"sessionkey":      "mock-session-12345",
				"GatewayPageURL":  "https://mock-gateway.com/pay",
				"storeAmount":     "100.00",
				"redirectGateway": "yes",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := ssl.New("test_store", "test_pass", ssl.WithBaseURL(server.URL))
		svc := &SSLCommerzService{client: client}

		url, err := svc.InitiatePayment("tran-123", 100.0, "BDT", "Test Course", "John Doe", "john@example.com")
		assert.NoError(t, err)
		assert.Equal(t, "https://mock-gateway.com/pay", url)
	})

	t.Run("Failure Response", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := map[string]interface{}{
				"status":       "FAILED",
				"failedreason": "Invalid credentials",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := ssl.New("test_store", "test_pass", ssl.WithBaseURL(server.URL))
		svc := &SSLCommerzService{client: client}

		_, err := svc.InitiatePayment("tran-123", 100.0, "BDT", "Test Course", "John Doe", "john@example.com")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed response from gateway: Invalid credentials")
	})
}

func TestSSLCommerzService_ValidateTransaction(t *testing.T) {
	t.Run("Valid", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := map[string]interface{}{
				"status": "VALID",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := ssl.New("test_store", "test_pass", ssl.WithBaseURL(server.URL))
		svc := &SSLCommerzService{client: client}

		ok, err := svc.ValidateTransaction("val-123")
		assert.NoError(t, err)
		assert.True(t, ok)
	})

	t.Run("Invalid Status", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			resp := map[string]interface{}{
				"status": "FAILED",
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(resp)
		}))
		defer server.Close()

		client := ssl.New("test_store", "test_pass", ssl.WithBaseURL(server.URL))
		svc := &SSLCommerzService{client: client}

		ok, err := svc.ValidateTransaction("val-123")
		assert.NoError(t, err)
		assert.False(t, ok)
	})
}

func TestNewSSLCommerzService(t *testing.T) {
	os.Setenv("SSLCOMMERZ_STORE_ID", "test_store")
	os.Setenv("SSLCOMMERZ_STORE_PASSWORD", "test_pass")
	os.Setenv("SSLCOMMERZ_IS_SANDBOX", "true")
	defer func() {
		os.Unsetenv("SSLCOMMERZ_STORE_ID")
		os.Unsetenv("SSLCOMMERZ_STORE_PASSWORD")
		os.Unsetenv("SSLCOMMERZ_IS_SANDBOX")
	}()

	svc := NewSSLCommerzService()
	assert.NotNil(t, svc)
	assert.NotNil(t, svc.client)
}
