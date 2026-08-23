# 📚 Project Documentation & System Plans

This directory contains system architecture plans, security specifications, deployment manuals, and feature roadmaps for the Course Platform.

---

## 📑 Documentation Index

### 1. 🤝 Feature Roadmaps & Specifications
- **[Referral & bKash Payout System Roadmap](./referral_system_roadmap.md)**: Full architecture, database schema, 6-character code rules, and payout approval lifecycle.
- **[Payment System & SSLCommerz Documentation](./payment_system_documentation.md)**: Payment gateway integration, webhook IPNs, and order verification.
- **[Course Ordering & Hierarchy Plan](./course_ordering_implementation_plan.md)**: Drag-and-drop syllabus ordering and recursive tree structures.
- **[Email Notification & Resend Integration Guide](../be/README.md#%EF%B8%8F-email-system-resend)**: Transactional templates, Asynq background delivery, and Template Studio.
- **[Feature TODO Checklist](./todo.md)**: Implementation task list and backlog.

### 2. 🛡️ Security & Content Protection
- **[Anti-Scraping & Content Protection Plan](./anti_scraping_content_protection_plan.md)**: Dynamic canvas watermarking, DRM protections, rate limiting, and DevTools detection.
- **[Secure Media & HLS System](./docs_media_system.md)**: Video transcoding pipeline, HMAC token authentication, and signed URL streaming.

### 3. 🚀 Infrastructure & Architecture
- **[Architecture Assessment & Overview](./architecture_assessment.md)**: Decoupled microservices architecture, caching layers, and database design.
- **[Production Deployment & Security Guide](./deployment_guide.md)**: Production Kubernetes deployment, Docker Compose configuration, SSL, and monitoring.
