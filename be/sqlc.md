# Database Queries Guide (`sqlc`)

This project uses `sqlc` to generate type-safe Go code from SQL queries. This ensures that all database interactions are strongly typed and syntax-checked at compile time.

## Prerequisites

To generate code, you need the `sqlc` CLI tool installed on your machine.

### Installation

#### macOS (Homebrew)
```bash
brew install sqlc
```

#### Linux
Download the binary from the [official releases page](https://github.com/sqlc-dev/sqlc/releases) or follow the instructions on the [sqlc documentation](https://docs.sqlc.dev/en/latest/overview/install.html).

---

## Configuration

The configuration for `sqlc` is defined in `sqlc.yaml` located at the root of the project:
- **Engine:** PostgreSQL
- **Schema:** `./migrations/` (Reads the table structures from your migrations)
- **Queries:** `./internal/db/queries/` (Where you write your SQL queries)
- **Output:** `./internal/db/generated/` (Where the Go code is generated)

## Workflow

### 1. Define the Schema
Ensure your database tables and structures are defined in the `migrations/` directory using `golang-migrate`. `sqlc` reads these schema files to understand your tables and types.

### 2. Write SQL Queries
Create `.sql` files inside the `internal/db/queries/` directory. 

You must annotate each query with a special comment so `sqlc` knows how to name the generated Go function and what its return type should be.

**Example (`internal/db/queries/users.sql`):**
```sql
-- name: GetUser :one
SELECT id, username, email FROM users
WHERE id = $1 LIMIT 1;

-- name: ListUsers :many
SELECT id, username, email FROM users
ORDER BY username;

-- name: CreateUser :exec
INSERT INTO users (id, username, email)
VALUES ($1, $2, $3);
```

**Common Annotations:**
- `:one` — Returns a single row (or an error if not found).
- `:many` — Returns a slice of rows.
- `:exec` — Executes the query without returning any rows.
- `:execresult` — Executes the query and returns a `sql.Result`.

### 3. Generate Go Code

Once you've written or updated your SQL queries, run the following command to generate the Go bindings:

```bash
make sqlc-generate
```

This will output files such as `models.go`, `querier.go`, and `.sql.go` inside the `internal/db/generated/` folder.

### 4. Using Generated Code in Go

You can now use the generated interfaces and models safely in your services.

**Example Usage:**
```go
package services

import (
	"context"
	"database/sql"
	"github.com/shafins-course/backend/internal/db/generated"
)

func fetchUser(ctx context.Context, db *sql.DB, userID string) (*generated.User, error) {
	queries := generated.New(db)
	user, err := queries.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return &user, nil
}
```

*Note: Do not manually edit the files in `internal/db/generated/`. Any changes will be overwritten the next time `make sqlc-generate` is run.*
