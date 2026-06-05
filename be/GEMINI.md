# 🧬 Gemini Backend Instructions

This document provides specialized instructions for Gemini agents working on the Course Platform backend (`/be`). Adherence to these workflows ensures architectural consistency and type safety. Make sure before making a new api or anything else, first look at a similar thing that has already been created. It will give you an idea of how it is done, the structures and stuff. If you make any changes in /be, you have to run all the ci/cd tests, so that there are no errors.
 Whenever you are asked to commit something, use imperative language like "do this do that"

## 🛠 Tech Stack & Conventions
- **Language**: Go 1.25+
- **Framework**: [Echo v4](https://echo.labstack.com/)
- **Database**: PostgreSQL 16 (Primary) & Redis 7 (Cache-Aside)
- **Data Access**: [SQLC](https://sqlc.dev/) (Raw SQL to Type-safe Go)
- **Architecture**: Modular Monolith (Handlers -> Services -> DB Store)

## 🔄 Core Workflows

### 1. Database Changes (SQLC-First)
NEVER write database logic directly in Go handlers. Follow this sequence:
1. **Migration**: Create a migration using `make migrate-create name=<name>`.
2. **Apply**: Run `make migrate-up` to update the local schema.
3. **Query**: Define raw SQL queries in `internal/db/queries/*.sql`.
4. **Generate**: Run `make sqlc-generate` to update `internal/db/generated/`.
5. **Usage**: Inject the `db.Store` into handlers and use the generated methods.

### 2. API Development (Documentation-First)
The OpenAPI spec is the single source of truth for the frontend.
1. **Define**: Add schemas to `docs/components/schemas/` and paths to `docs/paths/`.
2. **Register**: Link them in `docs/openapi.yaml`.
3. **Implement**: Create/Update handlers in `internal/handlers/`.
4. **Route**: Register the handler in `internal/api/server.go`.

### 3. Security & RBAC
- **Authentication**: Use `internalMiddleware.JWTMiddleware(jwtSecret)`.
- **Authorization**: Use `internalMiddleware.RequireAdmin()` for any route under `/api/v1/admin`.
- **Validation**: Always validate request bodies using Echo's binding or manual logic before processing. Limit request bodies to 1MB (standard middleware applied).

### 4. Observability
- **Logging**: Use `log/slog` for structured logging.
- **Tracing**: Use `otelecho` middleware. Wrap complex logic in spans if necessary.
- **Metrics**: Update `internal/middleware/metrics.go` if adding new global metrics.

## 🧪 Testing & Quality
- **Coverage**: **Maintain at least 70% overall test coverage.** Every new feature or fix MUST include tests that contribute to this goal.
- **Unit Tests**: Place in the same package as the code (e.g., `internal/handlers/auth_test.go`).
- **Integration Tests**: Place in `tests/` using **Testcontainers**. Use `test_helper.go` for setup.
- **Command**: Run `make test-integration` to verify DB-dependent logic.
- **Linting**: Run `make lint` before finishing any task. Fix all `golangci-lint` errors.

## 📂 Directory Map
- `cmd/api/`: Application entry point.
- `internal/api/server.go`: Router and middleware configuration.
- `internal/db/queries/`: Source SQL files (Edit these).
- `internal/db/generated/`: SQLC output (DO NOT EDIT).
- `internal/handlers/`: HTTP request logic.
- `internal/services/`: Shared business logic (Tokens, Caching).
- `docs/`: OpenAPI 3.0 specifications.
