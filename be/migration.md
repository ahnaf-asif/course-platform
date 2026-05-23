# Database Migrations Guide

This project uses `golang-migrate` to manage database schema changes. All changes to the database structure must be performed via migration files.

## Prerequisites

To manage migrations from your host machine, you need the `migrate` CLI tool installed.

### Installation

#### macOS (Homebrew)
```bash
brew install golang-migrate
```

#### Linux
Download the binary from the [official releases page](https://github.com/golang-migrate/migrate/releases) and move it to your `/usr/local/bin`.

---

## Workflow

### 1. Creating a New Migration

Always use the Makefile to create a new migration to ensure consistent naming and sequencing.

```bash
make migrate-create
```
You will be prompted to enter a name (e.g., `create_users_table`). This will generate two files in the `migrations/` directory:
- `NNNNNN_name.up.sql`: Logic to apply the change.
- `NNNNNN_name.down.sql`: Logic to reverse the change.

**Convention:**
- Use snake_case for names.
- Ensure the `down` migration perfectly reverts the `up` migration.

### 2. Applying Migrations

To apply all pending migrations to your local Dockerized database:

```bash
make migrate-up
```

### 3. Rolling Back Migrations

To roll back the **most recent** migration:

```bash
make migrate-down
```

---

## Troubleshooting

### Dirty Migrations

If a migration fails halfway (e.g., due to a syntax error in your SQL), PostgreSQL might leave the `schema_migrations` table in a "dirty" state. You will see an error like:
`Dirty database version 1. Fix and force it.`

**To fix this:**
1. Manually fix the database state if any partial changes were made.
2. Correct the SQL file that caused the error.
3. Force the migration version to the last known "clean" version:
   ```bash
   make migrate-force
   ```
   *(Enter the version number when prompted)*

### Connection Issues

The Makefile uses the variables defined in your `.env` file. Ensure your Docker containers are running (`docker compose up -d`) before running migration commands.

---

## Integration in Code

The application uses `github.com/golang-migrate/migrate/v4` internally. While we primarily use the CLI for development, the production environment can be configured to run migrations automatically on startup using environment variables (to be implemented).
