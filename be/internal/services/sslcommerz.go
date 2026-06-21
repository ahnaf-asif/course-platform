package services

import (
	"errors"
	"os"

	ssl "github.com/sagar290/sslcommerz-go"
	"github.com/sagar290/sslcommerz-go/models"
)

type PaymentGateway interface {
	InitiatePayment(tranID string, amount float64, currency string, productName string, customerName string, customerEmail string) (string, error)
	ValidateTransaction(valID string) (bool, error)
}

type SSLCommerzService struct {
	client *ssl.Ssl
}

func NewSSLCommerzService() *SSLCommerzService {
	storeID := os.Getenv("SSLCOMMERZ_STORE_ID")
	storePasswd := os.Getenv("SSLCOMMERZ_STORE_PASSWORD")
	isSandbox := os.Getenv("SSLCOMMERZ_IS_SANDBOX") == "true"

	var opts []ssl.Option
	if isSandbox {
		opts = append(opts, ssl.WithSandbox())
	}

	client := ssl.New(storeID, storePasswd, opts...)
	return &SSLCommerzService{client: client}
}

func (s *SSLCommerzService) InitiatePayment(tranID string, amount float64, currency string, productName string, customerName string, customerEmail string) (string, error) {
	req := models.PaymentRequest{
		TranId:          tranID,
		TotalAmount:     amount,
		Currency:        currency,
		ProductCategory: "Education",
		SuccessUrl:      os.Getenv("SSLCOMMERZ_SUCCESS_URL"),
		FailUrl:         os.Getenv("SSLCOMMERZ_FAIL_URL"),
		CancelUrl:       os.Getenv("SSLCOMMERZ_CANCEL_URL"),
		IpnUrl:          os.Getenv("SSLCOMMERZ_IPN_URL"),
		Customer: models.Customer{
			Name:    customerName,
			Email:   customerEmail,
			Phone:   "01700000000",
			Add1:    "Dhaka",
			City:    "Dhaka",
			Country: "Bangladesh",
		},
		Shipping: models.Shipping{
			Method: models.ShippingMethodNo,
		},
		Product: models.Product{
			Name:    productName,
			Profile: models.ProductProfileNonPhysicalGoods,
		},
	}

	resp, err := s.client.MakePayment(req)
	if err != nil {
		return "", err
	}
	if resp.Status != "SUCCESS" {
		return "", errors.New("failed response from gateway: " + resp.Failedreason)
	}

	return resp.GatewayPageURL, nil
}

func (s *SSLCommerzService) ValidateTransaction(valID string) (bool, error) {
	req := models.OrderValidateRequest{
		ValId: valID,
	}

	resp, err := s.client.ValidatePayment(req)
	if err != nil {
		return false, err
	}

	return resp.Status == "VALID" || resp.Status == "VALIDATED", nil
}
