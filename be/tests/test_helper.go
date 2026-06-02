package tests

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file" // Required for migrations
	_ "github.com/jackc/pgx/v5/stdlib"                   // Required for pgx driver
	"github.com/testcontainers/testcontainers-go"
	pgmodule "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

// noEmojiLogger is a custom logger that strips emojis from testcontainers output.
type noEmojiLogger struct{}

func (l noEmojiLogger) Printf(format string, v ...interface{}) {
	msg := fmt.Sprintf(format, v...)
	// Strip common emojis used by testcontainers
	emojis := []string{"🐳", "✅", "⏳", "🔔", "🚫"}
	for _, e := range emojis {
		msg = strings.ReplaceAll(msg, e, "")
	}
	log.Print(strings.TrimSpace(msg))
}

func SetupTestDB(ctx context.Context) (*sql.DB, func(), error) {
	dbName := "testdb"
	dbUser := "user"
	dbPassword := "password"

	postgresContainer, err := pgmodule.Run(ctx,
		"postgres:16-alpine",
		pgmodule.WithDatabase(dbName),
		pgmodule.WithUsername(dbUser),
		pgmodule.WithPassword(dbPassword),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(5*time.Second)),
		testcontainers.WithLogger(noEmojiLogger{}),
	)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start container: %w", err)
	}

	connStr, err := postgresContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get connection string: %w", err)
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Run migrations
	_, b, _, _ := runtime.Caller(0)
	basepath := filepath.Dir(b)
	migrationsPath := filepath.Join(basepath, "..", "migrations")

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create migrate driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres", driver)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return nil, nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	cleanup := func() {
		db.Close()
		_ = postgresContainer.Terminate(ctx)
	}

	return db, cleanup, nil
}
