package services

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewResendEmailService(t *testing.T) {
	t.Run("Default configuration from env fallback", func(t *testing.T) {
		svc := NewResendEmailServiceFromEnv()

		assert.NotNil(t, svc)
		assert.True(t, svc.isSimulated)
		assert.Equal(t, "onboarding@resend.dev", svc.config.FromEmail)
		assert.Equal(t, "Course Platform", svc.config.FromName)
	})

	t.Run("Custom config from env", func(t *testing.T) {
		os.Setenv("RESEND_API_KEY", "re_placeholder_test")
		os.Setenv("RESEND_FROM_EMAIL", "support@testplatform.com")
		os.Setenv("RESEND_FROM_NAME", "Test Academy")
		defer func() {
			os.Unsetenv("RESEND_API_KEY")
			os.Unsetenv("RESEND_FROM_EMAIL")
			os.Unsetenv("RESEND_FROM_NAME")
		}()

		svc := NewResendEmailServiceFromEnv()
		assert.NotNil(t, svc)
		assert.True(t, svc.isSimulated)
		assert.Equal(t, "support@testplatform.com", svc.config.FromEmail)
		assert.Equal(t, "Test Academy", svc.config.FromName)
	})
}

func TestResendEmailService_FormatFromAddress(t *testing.T) {
	svc := NewResendEmailService(&ResendConfig{
		APIKey:    "re_placeholder",
		FromEmail: "info@courseplatform.com",
		FromName:  "Course Platform",
	})

	assert.Equal(t, "Course Platform <info@courseplatform.com>", svc.formatFromAddress(""))
	assert.Equal(t, "Custom Sender <custom@example.com>", svc.formatFromAddress("Custom Sender <custom@example.com>"))
}

func TestResendEmailService_SendEmail_Validation(t *testing.T) {
	svc := NewResendEmailService(&ResendConfig{
		APIKey: "re_placeholder",
	})
	ctx := context.Background()

	t.Run("Missing recipient", func(t *testing.T) {
		resp, err := svc.SendEmail(ctx, SendEmailRequest{
			To:      []string{},
			Subject: "Hello",
		})
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "recipient email ('to') cannot be empty")
	})

	t.Run("Missing subject", func(t *testing.T) {
		resp, err := svc.SendEmail(ctx, SendEmailRequest{
			To:      []string{"student@example.com"},
			Subject: "",
		})
		assert.Error(t, err)
		assert.Nil(t, resp)
		assert.Contains(t, err.Error(), "email subject cannot be empty")
	})
}

func TestResendEmailService_SimulatedTemplates(t *testing.T) {
	svc := NewResendEmailService(&ResendConfig{
		APIKey:    "re_placeholder_123456789",
		FromEmail: "notifications@courseplatform.com",
		FromName:  "Course Platform",
	})
	ctx := context.Background()

	t.Run("SendWelcomeEmail", func(t *testing.T) {
		err := svc.SendWelcomeEmail(ctx, "student@example.com", "John Doe")
		assert.NoError(t, err)
	})

	t.Run("SendPasswordResetEmail", func(t *testing.T) {
		err := svc.SendPasswordResetEmail(ctx, "student@example.com", "John Doe", "https://platform.com/reset-password?token=abc")
		assert.NoError(t, err)
	})

	t.Run("SendOrderConfirmationEmail", func(t *testing.T) {
		err := svc.SendOrderConfirmationEmail(ctx, "student@example.com", "John Doe", "Go Microservices", "ord-12345", "1000", "BDT")
		assert.NoError(t, err)
	})

	t.Run("SendWelcomeEmail - empty name", func(t *testing.T) {
		err := svc.SendWelcomeEmail(ctx, "student@example.com", "")
		assert.NoError(t, err)
	})

	t.Run("SendPasswordResetEmail - empty name", func(t *testing.T) {
		err := svc.SendPasswordResetEmail(ctx, "student@example.com", "", "https://platform.com/reset")
		assert.NoError(t, err)
	})

	t.Run("SendOrderConfirmationEmail - empty name", func(t *testing.T) {
		err := svc.SendOrderConfirmationEmail(ctx, "student@example.com", "", "Course Title", "ord-1", "500", "USD")
		assert.NoError(t, err)
	})

	t.Run("SendPayoutStatusEmail - empty name", func(t *testing.T) {
		err := svc.SendPayoutStatusEmail(ctx, "student@example.com", "", "APPROVED", "100", "USD", "TRX1", "Note")
		assert.NoError(t, err)
	})
}

func TestResendEmailService_FormatFromAddress_Fallbacks(t *testing.T) {
	t.Run("Only FromEmail set", func(t *testing.T) {
		svc := NewResendEmailService(&ResendConfig{
			APIKey:    "re_placeholder",
			FromEmail: "no-reply@example.com",
			FromName:  "",
		})
		assert.Equal(t, "no-reply@example.com", svc.formatFromAddress(""))
	})

	t.Run("Empty config fallback", func(t *testing.T) {
		svc := &ResendEmailService{
			config: ResendConfig{},
		}
		assert.Equal(t, "onboarding@resend.dev", svc.formatFromAddress(""))
	})
}
