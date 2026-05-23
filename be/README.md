# 🎓 Course Platform Backend

[![CI](https://github.com/shafins-course/backend/actions/workflows/ci.yml/badge.svg)](https://github.com/shafins-course/backend/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/github/go-mod/go-version/shafins-course/backend)](https://go.dev/)

A high-performance, enterprise-grade learning management system (LMS) backend. Built with Go for speed, SQLC for type-safe database access, and orchestrated with Kubernetes for massive scale.

---

## 📑 Table of Contents
- [🚀 Quick Start](#-quick-start)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture & Project Structure](#-architecture--project-structure)
- [💾 Database Management (SQLC & Migrations)](#-database-management-sqlc--migrations)
- [⚡ Caching Strategy (Redis)](#-caching-strategy-redis)
- [📊 Observability (The Three Pillars)](#-observability-the-three-pillars)
- [⚖️ Scaling & High Availability](#️-scaling--high-availability)
- [🛡️ Security & RBAC](#️-security--rbac)
- [🧪 Testing Strategy](#-testing-strategy)
- [📖 API Documentation](#-api-documentation)
- [🛠 Development Guide: Adding a New Feature](#-development-guide-adding-a-new-feature)

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have the following installed:
- **Go 1.25+**
- **Docker & Docker Compose**
- **sqlc** (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)
- **golang-migrate** (`brew install golang-migrate`)
- **air** (for hot-reload: `go install github.com/air-verse/air@latest`)

### 2. Setup Environment
```bash
cp .env.example .env
# Default values in .env.example work with Docker Compose out-of-the-box.
```

### 3. Start the Infrastructure
```bash
docker compose up -d
```
This starts: PostgreSQL, Redis, Jaeger (Tracing), Prometheus (Metrics), and Grafana.

### 4. Run the API (Hot Reload)
```bash
make dev
```
The API will be available at `http://localhost:8080`.

---

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Language** | Go 1.25 | Type-safe, compiled, high-concurrency. |
| **Web Framework** | [Echo v4](https://echo.labstack.com/) | Minimalist, high-performance Go web framework. |
| **Database** | PostgreSQL 16 | Primary relational storage. |
| **SQL Generator** | [sqlc](https://sqlc.dev/) | Generates type-safe Go code from raw SQL. |
| **Caching** | Redis 7 | Distributed cache for sessions and high-read data. |
| **Migrations** | golang-migrate | Version-controlled database schema changes. |
| **Observability** | Prometheus, Jaeger | Metrics and distributed tracing. |
| **Testing** | Testcontainers | Integration tests with real transient dependencies. |

---

## 💾 Database Management

We prioritize raw SQL performance with type-safe Go.

### Migrations
All schema changes must be versioned.
- **Create a migration:** `make migrate-create` (Enter name when prompted)
- **Apply migrations:** `make migrate-up`
- **Rollback last migration:** `make migrate-down`

### SQLC Workflow
Do not write database logic in Go. Write it in SQL.
1. Define your query in `internal/db/queries/*.sql`.
2. Run `make sqlc-generate`.
3. Use the generated methods in `internal/db/generated/`.

**Example Query (`users.sql`):**
```sql
-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;
```

---

## ⚡ Caching Strategy (Redis)

We use a **Cache-Aside** strategy. The `CacheService` provides a clean interface for Redis operations.

### Usage Example
```go
// internal/handlers/profile.go
var user models.User
err := cache.Get(ctx, "user:"+id, &user)
if err != nil {
    // Cache miss: fetch from DB
    user, _ = store.GetUser(ctx, id)
    // Set cache for 1 hour
    cache.Set(ctx, "user:"+id, user, time.Hour)
}
```

---

## 📊 Observability

### 1. Tracing (Jaeger)
Every request is automatically traced via OpenTelemetry.
- **URL:** `http://localhost:16686`
- **In Code:** `ctx, span := otel.Tracer("").Start(c.Request().Context(), "MyOperation")`

### 2. Metrics (Prometheus)
- **Endpoint:** `http://localhost:8080/api/v1/metrics`
- **Dashboards:** `http://localhost:3000` (Grafana)
- **Adding Metrics:** Use the `PrometheusMiddleware` in `internal/middleware/metrics.go` or define custom counters in your handlers.

### 3. Logging
We use `log/slog` for structured logging.
```go
slog.Info("user logged in", "user_id", user.ID, "ip", c.RealIP())
```

---

## ⚖️ Scaling & High Availability

### Local Scaling
Test how your app handles multiple instances:
```bash
docker compose up -d --scale api=3
```
Docker Compose will load-balance requests across the 3 instances.

### Kubernetes & HPA
In production, we use **Horizontal Pod Autoscaler (HPA)** located in `k8s/base/hpa.yaml`.
- **Min Replicas:** 2
- **Max Replicas:** 10
- **Scale Trigger:** 70% CPU utilization or 80% Memory utilization.

---

## 🛡️ Security & RBAC

Authentication is handled via **JWT** (Access Token) and **Refresh Tokens** (stored in DB).

### Role-Based Access Control (RBAC)
Protect routes using the `RequireRole` middleware:
```go
// internal/api/server.go
admin := v1.Group("/admin")
admin.Use(internalMiddleware.RequireAdmin()) // Only users with role 'ADMIN'
```

Available roles: `USER`, `ADMIN`.

---

## 🧪 Testing Strategy

### Unit Tests
Fast tests for logic without external dependencies.
```bash
make test
```

### Integration Tests (The Gold Standard)
Uses **Testcontainers** to spin up a real PostgreSQL instance for testing.
```bash
make test-integration
```
Check `tests/auth_integration_test.go` for examples on testing the full API flow.

---

## 🛠 Development Guide: Adding a New Feature

Follow this end-to-end flow to add a new "Content" module:

1.  **Database:**
    - Create a migration: `make migrate-create` -> `create_content_table`.
    - Add the SQL: `CREATE TABLE content (...);`.
    - Apply: `make migrate-up`.
2.  **Queries:**
    - Add queries in `internal/db/queries/content.sql`.
    - Generate Go code: `make sqlc-generate`.
3.  **Documentation:**
    - Add schemas in `docs/components/schemas/content.yaml`.
    - Add path definition in `docs/paths/content.yaml`.
    - Register in `docs/openapi.yaml`.
4.  **Implementation:**
    - Create `internal/handlers/content.go`.
    - Register route in `internal/api/server.go`.
5.  **Test:**
    - Add an integration test in `tests/content_test.go`.
