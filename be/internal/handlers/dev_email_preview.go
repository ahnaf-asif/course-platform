package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/shafins-course/backend/internal/services"
)

type DevEmailPreviewHandler struct{}

func NewDevEmailPreviewHandler() *DevEmailPreviewHandler {
	return &DevEmailPreviewHandler{}
}

// RenderPreview renders the raw HTML of a chosen email template with custom or default mock data.
func (h *DevEmailPreviewHandler) RenderPreview(c echo.Context) error {
	template := c.QueryParam("template")
	if template == "" {
		template = "welcome"
	}

	name := c.QueryParam("name")
	if name == "" {
		name = "রাকিবুল হাসান (Rakibul)"
	}

	feURL := os.Getenv("FRONTEND_URL")
	if feURL == "" {
		feURL = "http://localhost:3000"
	}
	feURL = strings.TrimRight(feURL, "/")

	var html string
	switch template {
	case "welcome":
		html = services.BuildWelcomeEmailHTML(name, feURL)

	case "reset_password":
		resetLink := c.QueryParam("link")
		if resetLink == "" {
			resetLink = fmt.Sprintf("%s/reset-password?token=sample_secure_token_12345", feURL)
		}
		html = services.BuildPasswordResetEmailHTML(name, resetLink, feURL)

	case "order_confirmation":
		courseTitle := c.QueryParam("course")
		if courseTitle == "" {
			courseTitle = "৪৭তম বিসিএস প্রিলিমিনারি স্পেশাল ব্যাচ (Full Foundation & Model Test)"
		}
		orderID := c.QueryParam("order_id")
		if orderID == "" {
			orderID = "ORD-2026-BCS-8921"
		}
		amount := c.QueryParam("amount")
		if amount == "" {
			amount = "২,৫০০"
		}
		currency := c.QueryParam("currency")
		if currency == "" {
			currency = "BDT"
		}
		html = services.BuildOrderConfirmationEmailHTML(name, courseTitle, orderID, amount, currency, feURL)

	case "payout_approved":
		amount := c.QueryParam("amount")
		if amount == "" {
			amount = "১,২০০"
		}
		currency := c.QueryParam("currency")
		if currency == "" {
			currency = "BDT"
		}
		trxID := c.QueryParam("trx_id")
		if trxID == "" {
			trxID = "BKASH-TRX-948271"
		}
		adminNote := c.QueryParam("note")
		if adminNote == "" {
			adminNote = "bKash মার্চেন্ট অ্যাকাউন্ট থেকে আপনার নম্বরে সফলভাবে সেন্ড করা হয়েছে।"
		}
		html = services.BuildPayoutStatusEmailHTML(name, "APPROVED", amount, currency, trxID, adminNote, feURL)

	case "payout_rejected":
		amount := c.QueryParam("amount")
		if amount == "" {
			amount = "৮০০"
		}
		currency := c.QueryParam("currency")
		if currency == "" {
			currency = "BDT"
		}
		adminNote := c.QueryParam("note")
		if adminNote == "" {
			adminNote = "প্রদত্ত বিকাশ পার্সোনাল নম্বরটি সঠিক নয়। অনুগ্রহ করে আপনার প্রোফাইলে সঠিক নম্বর আপডেট করুন।"
		}
		html = services.BuildPayoutStatusEmailHTML(name, "REJECTED", amount, currency, "", adminNote, feURL)

	default:
		return echo.NewHTTPError(http.StatusBadRequest, fmt.Sprintf("unknown template '%s'", template))
	}

	return c.HTML(http.StatusOK, html)
}

// RenderGallery renders a comprehensive visual dashboard to browse, test, and preview all transactional email designs.
func (h *DevEmailPreviewHandler) RenderGallery(c echo.Context) error {
	selected := c.QueryParam("template")
	if selected == "" {
		selected = "welcome"
	}

	galleryHTML := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduVerse — Email Template Studio</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-gradient: linear-gradient(135deg, #3b82f6 0%%, #a855f7 100%%);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
    
    /* Sidebar */
    .sidebar { width: 340px; background-color: #0b1120; border-right: 1px solid var(--border); display: flex; flex-direction: column; }
    .sidebar-header { padding: 22px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
    .logo-badge { width: 36px; height: 36px; border-radius: 9px; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .brand-title { font-size: 18px; font-weight: 800; }
    .brand-title span { color: #60a5fa; }
    .badge-dev { background: rgba(59, 130, 246, 0.18); color: #60a5fa; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.3); }
    
    .nav-list { list-style: none; padding: 14px; flex: 1; overflow-y: auto; }
    .nav-item { margin-bottom: 6px; }
    .nav-link { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; color: var(--text-muted); text-decoration: none; font-size: 13.5px; font-weight: 600; transition: all 0.15s ease; border: 1px solid transparent; }
    .nav-link:hover { background-color: rgba(255, 255, 255, 0.04); color: var(--text); }
    .nav-link.active { background: rgba(59, 130, 246, 0.14); color: #ffffff; border-color: rgba(59, 130, 246, 0.35); }
    .nav-icon { font-size: 17px; }
    
    .sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-muted); }
    
    /* Main Preview Area */
    .main { flex: 1; display: flex; flex-direction: column; background-color: #0f172a; }
    .toolbar { height: 62px; background-color: #111827; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 24px; }
    .template-heading { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    
    .view-switchers { display: flex; align-items: center; background-color: #1e293b; padding: 3px; border-radius: 8px; border: 1px solid var(--border); }
    .switch-btn { padding: 6px 14px; background: transparent; border: none; color: var(--text-muted); font-size: 12.5px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.15s ease; }
    .switch-btn.active { background-color: #3b82f6; color: white; }
    
    .action-links { display: flex; align-items: center; gap: 10px; }
    .action-btn { padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; text-decoration: none; color: var(--text); background-color: #1e293b; border: 1px solid var(--border); transition: all 0.15s ease; }
    .action-btn:hover { background-color: #334155; }
    .action-btn.primary { background: var(--accent-gradient); border: none; color: white; }
    
    .preview-canvas { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at 50%% 50%%, #1e293b 0%%, #0f172a 100%%); overflow: auto; }
    .iframe-wrapper { height: 100%%; transition: width 0.3s ease; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4); border-radius: 12px; overflow: hidden; border: 1px solid var(--border); background: white; }
    .iframe-desktop { width: 620px; }
    .iframe-mobile { width: 375px; max-height: 720px; }
    iframe { width: 100%%; height: 100%%; border: none; }
  </style>
</head>
<body>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo-badge">📚</div>
      <div>
        <div class="brand-title">Edu<span>Verse</span></div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Email Template Studio</div>
      </div>
      <span class="badge-dev" style="margin-left: auto;">Dev Mode</span>
    </div>

    <ul class="nav-list">
      <li class="nav-item">
        <a href="/api/v1/dev/emails?template=welcome" class="nav-link %s">
          <span class="nav-icon">🚀</span>
          <span>Welcome / Onboarding</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/api/v1/dev/emails?template=reset_password" class="nav-link %s">
          <span class="nav-icon">🔑</span>
          <span>Password Reset</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/api/v1/dev/emails?template=order_confirmation" class="nav-link %s">
          <span class="nav-icon">🎉</span>
          <span>Enrollment & Receipt</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/api/v1/dev/emails?template=payout_approved" class="nav-link %s">
          <span class="nav-icon">💸</span>
          <span>Payout Approved</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/api/v1/dev/emails?template=payout_rejected" class="nav-link %s">
          <span class="nav-icon">❌</span>
          <span>Payout Rejected</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-footer">
      <div><strong>Resend Email Provider</strong></div>
      <div style="margin-top: 4px; font-size: 10.5px; opacity: 0.8;">Synced with EduVerse Theme & Brand Design System</div>
    </div>
  </aside>

  <!-- Main View -->
  <main class="main">
    <div class="toolbar">
      <div class="template-heading">
        <span>Active Template:</span>
        <strong style="color: #60a5fa; text-transform: capitalize;">%s</strong>
      </div>

      <div class="view-switchers">
        <button id="btnDesktop" class="switch-btn active" onclick="setView('desktop')">🖥️ Desktop</button>
        <button id="btnMobile" class="switch-btn" onclick="setView('mobile')">📱 Mobile</button>
      </div>

      <div class="action-links">
        <a href="/api/v1/dev/emails/preview?template=%s" target="_blank" class="action-btn">🔗 Open Raw HTML</a>
      </div>
    </div>

    <div class="preview-canvas">
      <div id="frameWrapper" class="iframe-wrapper iframe-desktop">
        <iframe src="/api/v1/dev/emails/preview?template=%s"></iframe>
      </div>
    </div>
  </main>

  <script>
    function setView(mode) {
      const wrapper = document.getElementById('frameWrapper');
      const btnDesktop = document.getElementById('btnDesktop');
      const btnMobile = document.getElementById('btnMobile');

      if (mode === 'mobile') {
        wrapper.className = 'iframe-wrapper iframe-mobile';
        btnMobile.className = 'switch-btn active';
        btnDesktop.className = 'switch-btn';
      } else {
        wrapper.className = 'iframe-wrapper iframe-desktop';
        btnDesktop.className = 'switch-btn active';
        btnMobile.className = 'switch-btn';
      }
    }
  </script>
</body>
</html>`,
		activeClass(selected, "welcome"),
		activeClass(selected, "reset_password"),
		activeClass(selected, "order_confirmation"),
		activeClass(selected, "payout_approved"),
		activeClass(selected, "payout_rejected"),
		strings.ReplaceAll(selected, "_", " "),
		selected,
		selected,
	)

	return c.HTML(http.StatusOK, galleryHTML)
}

func activeClass(current, target string) string {
	if current == target {
		return "active"
	}
	return ""
}
