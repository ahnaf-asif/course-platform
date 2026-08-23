package services

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/resend/resend-go/v2"
)

// EmailService defines the contract for sending transactional emails across the platform.
type EmailService interface {
	SendEmail(ctx context.Context, req SendEmailRequest) (*SendEmailResponse, error)
	SendWelcomeEmail(ctx context.Context, toEmail, recipientName string) error
	SendPasswordResetEmail(ctx context.Context, toEmail, recipientName, resetLink string) error
	SendOrderConfirmationEmail(ctx context.Context, toEmail, recipientName, courseTitle, orderID, amount, currency string) error
	SendPayoutStatusEmail(ctx context.Context, toEmail, recipientName, status, amount, currency, trxID, adminNote string) error
}

// SendEmailRequest contains the payload parameters for sending an email.
type SendEmailRequest struct {
	From        string            `json:"from,omitempty"`
	To          []string          `json:"to"`
	Subject     string            `json:"subject"`
	HTML        string            `json:"html,omitempty"`
	Text        string            `json:"text,omitempty"`
	ReplyTo     string            `json:"reply_to,omitempty"`
	Cc          []string          `json:"cc,omitempty"`
	Bcc         []string          `json:"bcc,omitempty"`
	Tags        map[string]string `json:"tags,omitempty"`
	ScheduledAt string            `json:"scheduled_at,omitempty"`
}

// SendEmailResponse represents the response containing the provider message ID.
type SendEmailResponse struct {
	ID string `json:"id"`
}

// ResendConfig holds configuration parameters for the Resend email service.
type ResendConfig struct {
	APIKey    string
	FromEmail string
	FromName  string
}

// ResendEmailService implements EmailService using the official Resend Go SDK.
type ResendEmailService struct {
	client      *resend.Client
	config      ResendConfig
	isSimulated bool
}

// NewResendEmailService creates a new instance of ResendEmailService.
func NewResendEmailService(cfg *ResendConfig) *ResendEmailService {
	if cfg == nil {
		cfg = &ResendConfig{}
	}

	apiKey := strings.TrimSpace(cfg.APIKey)
	isSimulated := false

	// If API key is empty, a placeholder, or dummy key, run in simulated mode
	if apiKey == "" ||
		strings.HasPrefix(apiKey, "re_placeholder") ||
		strings.HasPrefix(apiKey, "re_123456789") ||
		apiKey == "your_api_key_here" ||
		apiKey == "your_secret_key_here" ||
		apiKey == "fake-api-key" {
		isSimulated = true
		slog.Warn("Resend API key is unset or placeholder; email service running in SIMULATION mode",
			"from", cfg.FromEmail,
			"apiKeyConfigured", apiKey != "")
	}

	var client *resend.Client
	if !isSimulated {
		client = resend.NewClient(apiKey)
	}

	return &ResendEmailService{
		client:      client,
		config:      *cfg,
		isSimulated: isSimulated,
	}
}

// NewResendEmailServiceFromEnv loads configuration from environment variables.
func NewResendEmailServiceFromEnv() *ResendEmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	if fromEmail == "" {
		fromEmail = "onboarding@resend.dev"
	}
	fromName := os.Getenv("RESEND_FROM_NAME")
	if fromName == "" {
		fromName = "Course Platform"
	}

	return NewResendEmailService(&ResendConfig{
		APIKey:    apiKey,
		FromEmail: fromEmail,
		FromName:  fromName,
	})
}

// formatFromAddress creates the standard 'Name <email@domain.com>' format.
func (s *ResendEmailService) formatFromAddress(fromOverride string) string {
	if fromOverride != "" {
		return fromOverride
	}

	if s.config.FromName != "" && s.config.FromEmail != "" {
		return fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	}
	if s.config.FromEmail != "" {
		return s.config.FromEmail
	}
	return "onboarding@resend.dev"
}

// SendEmail sends a raw email request via Resend API or logs simulation.
func (s *ResendEmailService) SendEmail(ctx context.Context, req SendEmailRequest) (*SendEmailResponse, error) {
	if len(req.To) == 0 {
		return nil, fmt.Errorf("recipient email ('to') cannot be empty")
	}
	if req.Subject == "" {
		return nil, fmt.Errorf("email subject cannot be empty")
	}

	from := s.formatFromAddress(req.From)

	if s.isSimulated {
		simulatedID := "re_sim_" + uuid.New().String()
		slog.Info("[Resend Simulation] Email processed without external network call",
			"email_id", simulatedID,
			"to", req.To,
			"from", from,
			"subject", req.Subject)
		return &SendEmailResponse{ID: simulatedID}, nil
	}

	var resendTags []resend.Tag
	for k, v := range req.Tags {
		resendTags = append(resendTags, resend.Tag{Name: k, Value: v})
	}

	params := &resend.SendEmailRequest{
		From:        from,
		To:          req.To,
		Subject:     req.Subject,
		Html:        req.HTML,
		Text:        req.Text,
		ReplyTo:     req.ReplyTo,
		Cc:          req.Cc,
		Bcc:         req.Bcc,
		Tags:        resendTags,
		ScheduledAt: req.ScheduledAt,
	}

	resp, err := s.client.Emails.SendWithContext(ctx, params)
	if err != nil {
		slog.Error("Failed to send email via Resend",
			"to", req.To,
			"subject", req.Subject,
			"error", err)
		return nil, fmt.Errorf("resend send failed: %w", err)
	}

	slog.Info("Email successfully sent via Resend",
		"email_id", resp.Id,
		"to", req.To,
		"subject", req.Subject)

	return &SendEmailResponse{ID: resp.Id}, nil
}

// SendWelcomeEmail sends an onboarding welcome email to newly registered users.
func (s *ResendEmailService) SendWelcomeEmail(ctx context.Context, toEmail, recipientName string) error {
	displayName := recipientName
	if displayName == "" {
		displayName = "Student"
	}

	frontendURL := getFrontendURL()
	subject := "Welcome to EduVerse! 🚀"
	html := BuildWelcomeEmailHTML(displayName, frontendURL)
	text := BuildWelcomeEmailText(displayName, frontendURL)

	_, err := s.SendEmail(ctx, SendEmailRequest{
		To:      []string{toEmail},
		Subject: subject,
		HTML:    html,
		Text:    text,
		Tags: map[string]string{
			"category": "onboarding",
		},
	})
	return err
}

// SendPasswordResetEmail sends password reset instructions with a secure link.
func (s *ResendEmailService) SendPasswordResetEmail(ctx context.Context, toEmail, recipientName, resetLink string) error {
	displayName := recipientName
	if displayName == "" {
		displayName = "Student"
	}

	frontendURL := getFrontendURL()
	subject := "Reset your EduVerse password 🔑"
	html := BuildPasswordResetEmailHTML(displayName, resetLink, frontendURL)
	text := BuildPasswordResetEmailText(displayName, resetLink, frontendURL)

	_, err := s.SendEmail(ctx, SendEmailRequest{
		To:      []string{toEmail},
		Subject: subject,
		HTML:    html,
		Text:    text,
		Tags: map[string]string{
			"category": "auth",
		},
	})
	return err
}

// SendOrderConfirmationEmail sends an enrollment and receipt notification upon purchase completion.
func (s *ResendEmailService) SendOrderConfirmationEmail(ctx context.Context, toEmail, recipientName, courseTitle, orderID, amount, currency string) error {
	displayName := recipientName
	if displayName == "" {
		displayName = "Student"
	}

	frontendURL := getFrontendURL()
	subject := fmt.Sprintf("Enrollment Confirmed: %s 🎉", courseTitle)
	html := BuildOrderConfirmationEmailHTML(displayName, courseTitle, orderID, amount, currency, frontendURL)
	text := BuildOrderConfirmationEmailText(displayName, courseTitle, orderID, amount, currency, frontendURL)

	_, err := s.SendEmail(ctx, SendEmailRequest{
		To:      []string{toEmail},
		Subject: subject,
		HTML:    html,
		Text:    text,
		Tags: map[string]string{
			"category": "commerce",
			"order_id": orderID,
		},
	})
	return err
}

// SendPayoutStatusEmail notifies an affiliate user when their bKash payout is approved or rejected.
func (s *ResendEmailService) SendPayoutStatusEmail(ctx context.Context, toEmail, recipientName, status, amount, currency, trxID, adminNote string) error {
	displayName := recipientName
	if displayName == "" {
		displayName = "Affiliate Partner"
	}

	frontendURL := getFrontendURL()
	statusUpper := strings.ToUpper(status)
	subject := fmt.Sprintf("Affiliate Payout Update: %s 💸", statusUpper)
	html := BuildPayoutStatusEmailHTML(displayName, statusUpper, amount, currency, trxID, adminNote, frontendURL)
	text := BuildPayoutStatusEmailText(displayName, statusUpper, amount, currency, trxID, adminNote, frontendURL)

	_, err := s.SendEmail(ctx, SendEmailRequest{
		To:      []string{toEmail},
		Subject: subject,
		HTML:    html,
		Text:    text,
		Tags: map[string]string{
			"category": "referral_payout",
			"status":   statusUpper,
		},
	})
	return err
}

func getFrontendURL() string {
	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		return "http://localhost:3000"
	}
	return strings.TrimRight(url, "/")
}

// --------------------------------------------------------------------------
// HTML Email Templates (Simple, Sleek, EduVerse Brand Matching)
// --------------------------------------------------------------------------

func baseEmailTemplate(title, bodyContent, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%%; background-color: #f1f5f9; padding: 40px 15px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); }
    .top-bar { height: 4px; background: linear-gradient(135deg, #3b82f6 0%%, #a855f7 50%%, #ec4899 100%%); }
    .header { background-color: #0f172a; padding: 24px 28px; text-align: center; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; vertical-align: middle; margin-right: 8px; }
    .brand-title { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; vertical-align: middle; text-decoration: none; }
    .brand-accent { color: #60a5fa; }
    .brand-sub { margin-top: 6px; font-size: 11.5px; color: #94a3b8; letter-spacing: 0.2px; }
    .content { padding: 32px 30px; line-height: 1.65; font-size: 15px; color: #334155; }
    .heading { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; letter-spacing: -0.3px; }
    .btn-container { text-align: center; margin: 26px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%%, #7c3aed 100%%); color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 700; font-size: 14.5px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3); }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 22px 0; }
    .info-table { width: 100%%; border-collapse: collapse; }
    .info-table td { padding: 7px 0; font-size: 14px; }
    .info-table td.label { color: #64748b; width: 42%%; font-weight: 500; }
    .info-table td.value { color: #0f172a; font-weight: 600; text-align: right; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .badge-success { background-color: #dcfce7; color: #15803d; }
    .badge-danger { background-color: #ffe4e6; color: #be123c; }
    .footer { padding: 22px 30px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .footer a { color: #64748b; text-decoration: none; margin: 0 8px; }
    .footer a:hover { color: #3b82f6; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="top-bar"></div>
      <div class="header">
        <a href="%s" style="text-decoration: none;">
          <span class="brand-title">Edu<span class="brand-accent">Verse</span></span>
        </a>
        <div class="brand-sub">বিসিএস ও প্রতিযোগিতামূলক পরীক্ষার অনলাইন প্রস্তুতি প্ল্যাটফর্ম</div>
      </div>
      <div class="content">
        %s
      </div>
      <div class="footer">
        <p style="margin: 0 0 10px 0;">
          <a href="%s">হোম</a> •
          <a href="%s/courses">কোর্সসমূহ</a> •
          <a href="%s/dashboard">ড্যাশবোর্ড</a> •
          <a href="%s/contact">যোগাযোগ</a>
        </p>
        <p style="margin: 0 0 4px 0;">© %d EduVerse। সর্বস্বত্ব সংরক্ষিত।</p>
        <p style="margin: 0; font-size: 11px; color: #cbd5e1;">এটি একটি স্বয়ংক্রিয় বার্তা। এই ইমেইলে সরাসরি রিপ্লাই করবেন না।</p>
      </div>
    </div>
  </div>
</body>
</html>`, title, frontendURL, bodyContent, frontendURL, frontendURL, frontendURL, frontendURL, 2026)
}

// BuildWelcomeEmailHTML constructs the HTML email for user onboarding.
func BuildWelcomeEmailHTML(name, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	body := fmt.Sprintf(`
        <h2 class="heading">স্বাগতম, %s! 👋</h2>
        <p><strong>EduVerse</strong>-এ আপনাকে আন্তরিক স্বাগতম। আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।</p>
        <p>বিসিএস প্রিলিমিনারি ও অন্যান্য প্রতিযোগিতামূলক পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি নিতে আমাদের এক্সক্লুসিভ ভিডিও লেকচার, অধ্যায়ভিত্তিক কুইজ এবং লাইভ মডেল টেস্টগুলোতে অংশ নিন।</p>
        <div class="btn-container">
          <a href="%s/courses" class="btn">কোর্সসমূহ দেখুন</a>
        </div>
        <p style="color: #64748b; font-size: 13.5px; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
          কোনো সমস্যা বা জিজ্ঞাসার জন্য আমাদের সাপোর্ট সেন্টারে যোগাযোগ করুন: <a href="mailto:support@eduverse.com" style="color: #3b82f6;">support@eduverse.com</a>
        </p>
`, name, frontendURL)
	return baseEmailTemplate("Welcome to EduVerse", body, frontendURL)
}

// BuildWelcomeEmailText constructs plaintext email for onboarding.
func BuildWelcomeEmailText(name, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	return fmt.Sprintf(`স্বাগতম, %s!

EduVerse-এ আপনাকে আন্তরিক স্বাগতম। আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।

বিসিএস প্রিলি ও অন্যান্য প্রতিযোগিতামূলক পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি শুরু করুন:
%s/courses

যেকোনো সহায়তায়: support@eduverse.com

ধন্যবাদ,
EduVerse টিম`, name, frontendURL)
}

// BuildPasswordResetEmailHTML constructs HTML email for password resets.
func BuildPasswordResetEmailHTML(name, resetLink, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	body := fmt.Sprintf(`
        <h2 class="heading">পাসওয়ার্ড রিসেট অনুরোধ 🔑</h2>
        <p>হ্যালো %s,</p>
        <p>আপনার EduVerse অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য একটি অনুরোধ পেয়েছি। নিচের বাটনে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন:</p>
        <div class="btn-container">
          <a href="%s" class="btn">পাসওয়ার্ড রিসেট করুন</a>
        </div>
        <p style="font-size: 13px; color: #64748b; background-color: #f8fafc; border-left: 3px solid #3b82f6; padding: 10px 14px; border-radius: 4px;">
          ⚠️ এই লিংকটির মেয়াদ ১ ঘণ্টা থাকবে। আপনি যদি এই অনুরোধ না করে থাকেন, তবে এই ইমেইলটি উপেক্ষা করুন। আপনার অ্যাকাউন্ট সুরক্ষিত থাকবে।
        </p>
        <p style="font-size: 11.5px; color: #94a3b8; word-break: break-all; margin-top: 18px;">
          বাটন কাজ না করলে এই লিংকটি কপি করে ব্রাউজারে পেস্ট করুন:<br>
          <a href="%s" style="color: #3b82f6;">%s</a>
        </p>
`, name, resetLink, resetLink, resetLink)
	return baseEmailTemplate("Reset your EduVerse password", body, frontendURL)
}

// BuildPasswordResetEmailText constructs plaintext email for password resets.
func BuildPasswordResetEmailText(name, resetLink, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	return fmt.Sprintf(`হ্যালো %s,

আপনার EduVerse অ্যাকাউন্টের পাসওয়ার্ড রিসেটের অনুরোধ করা হয়েছে।

পাসওয়ার্ড রিসেট করতে নিচের লিংকে যান:
%s

এই লিংকের মেয়াদ ১ ঘণ্টা। আপনি অনুরোধ না করে থাকলে এটি উপেক্ষা করুন।

যেকোনো সহায়তায়: %s/contact

ধন্যবাদ,
EduVerse টিম`, name, resetLink, frontendURL)
}

// BuildOrderConfirmationEmailHTML constructs HTML email for course enrollment receipts.
func BuildOrderConfirmationEmailHTML(name, courseTitle, orderID, amount, currency, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	body := fmt.Sprintf(`
        <h2 class="heading">কোর্স এনরোলমেন্ট নিশ্চিত হয়েছে! 🎉</h2>
        <p>প্রিয় %s,</p>
        <p>EduVerse-এর সাথে যুক্ত হওয়ার জন্য ধন্যবাদ! <strong>%s</strong> কোর্সে আপনার এনরোলমেন্ট সফলভাবে সম্পন্ন হয়েছে।</p>
        
        <div class="info-card">
          <table class="info-table">
            <tr>
              <td class="label">কোর্সের নাম:</td>
              <td class="value">%s</td>
            </tr>
            <tr>
              <td class="label">অর্ডার আইডি:</td>
              <td class="value" style="font-family: monospace; font-size: 13px;">%s</td>
            </tr>
            <tr>
              <td class="label">পরিশোধিত মূল্য:</td>
              <td class="value" style="color: #0f172a; font-size: 15px;">%s %s</td>
            </tr>
            <tr>
              <td class="label">পেমেন্ট স্ট্যাটাস:</td>
              <td class="value"><span class="badge badge-success">COMPLETED</span></td>
            </tr>
          </table>
        </div>

        <div class="btn-container">
          <a href="%s/dashboard" class="btn">পড়াশোনা শুরু করুন</a>
        </div>

        <p style="color: #64748b; font-size: 13px; margin-top: 20px;">
          আপনার ড্যাশবোর্ড থেকে যেকোনো সময় কোর্স কন্টেন্ট ও ভিডিও লেকচার অ্যাক্সেস করতে পারবেন।
        </p>
`, name, courseTitle, courseTitle, orderID, amount, currency, frontendURL)
	return baseEmailTemplate("Enrollment Confirmed - EduVerse", body, frontendURL)
}

// BuildOrderConfirmationEmailText constructs plaintext email for order confirmations.
func BuildOrderConfirmationEmailText(name, courseTitle, orderID, amount, currency, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	return fmt.Sprintf(`প্রিয় %s,

ধন্যবাদ! "%s" কোর্সে আপনার এনরোলমেন্ট নিশ্চিত হয়েছে।

অর্ডারের বিবরণ:
- কোর্স: %s
- অর্ডার আইডি: %s
- পরিশোধিত মূল্য: %s %s
- স্ট্যাটাস: COMPLETED

ড্যাশবোর্ডে গিয়ে ক্লাস শুরু করুন:
%s/dashboard

ধন্যবাদ,
EduVerse টিম`, name, courseTitle, courseTitle, orderID, amount, currency, frontendURL)
}

// BuildPayoutStatusEmailHTML constructs HTML email for affiliate withdrawal updates.
func BuildPayoutStatusEmailHTML(name, status, amount, currency, trxID, adminNote, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}

	badgeClass := "badge-success"
	statusLabel := "অনুমোদিত (APPROVED)"
	if status != "APPROVED" {
		badgeClass = "badge-danger"
		statusLabel = "প্রত্যাখ্যাত (REJECTED)"
	}

	trxRow := ""
	if trxID != "" {
		trxRow = fmt.Sprintf(`<tr><td class="label">ট্রানজেকশন রেফারেন্স:</td><td class="value" style="font-family: monospace; font-size: 13px;">%s</td></tr>`, trxID)
	}

	noteBlock := ""
	if adminNote != "" {
		noteBlock = fmt.Sprintf(`<div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; color: #92400e; margin-top: 14px;"><strong>অ্যাডমিন নোট:</strong> %s</div>`, adminNote)
	}

	body := fmt.Sprintf(`
        <h2 class="heading">অ্যাফিলিয়েট পে-আউট আপডেট 💸</h2>
        <p>হ্যালো %s,</p>
        <p>আপনার অ্যাফিলিয়েট উইথড্রয়াল বা পে-আউট রিকোয়েস্টটি পর্যালোচনা করা হয়েছে।</p>

        <div class="info-card">
          <table class="info-table">
            <tr>
              <td class="label">উইথড্রয়াল পরিমাণ:</td>
              <td class="value" style="font-size: 15px;">%s %s</td>
            </tr>
            <tr>
              <td class="label">পে-আউট স্ট্যাটাস:</td>
              <td class="value"><span class="badge %s">%s</span></td>
            </tr>
            %s
          </table>
          %s
        </div>

        <div class="btn-container">
          <a href="%s/profile/referrals" class="btn">রেফারেল ড্যাশবোর্ড দেখুন</a>
        </div>
`, name, amount, currency, badgeClass, statusLabel, trxRow, noteBlock, frontendURL)
	return baseEmailTemplate("Affiliate Payout Update - EduVerse", body, frontendURL)
}

// BuildPayoutStatusEmailText constructs plaintext email for payout updates.
func BuildPayoutStatusEmailText(name, status, amount, currency, trxID, adminNote, frontendURL string) string {
	if frontendURL == "" {
		frontendURL = getFrontendURL()
	}
	noteStr := ""
	if adminNote != "" {
		noteStr = fmt.Sprintf("\nঅ্যাডমিন নোট: %s", adminNote)
	}
	trxStr := ""
	if trxID != "" {
		trxStr = fmt.Sprintf("\nট্রানজেকশন আইডি: %s", trxID)
	}

	return fmt.Sprintf(`হ্যালো %s,

আপনার অ্যাফিলিয়েট পে-আউট রিকোয়েস্টের আপডেট:

- পরিমাণ: %s %s
- স্ট্যাটাস: %s%s%s

রেফারেল ড্যাশবোর্ড: %s/profile/referrals

ধন্যবাদ,
EduVerse টিম`, name, amount, currency, status, trxStr, noteStr, frontendURL)
}
