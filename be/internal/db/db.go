package db

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/shafins-course/backend/internal/db/generated"
)

type Store interface {
	generated.Querier
	WithTx(ctx context.Context, fn func(generated.Querier) error) error
}

type SQLStore struct {
	db *sql.DB
	*generated.Queries
}

func NewStore(db *sql.DB) Store {
	return &SQLStore{
		db:      db,
		Queries: generated.New(db),
	}
}

func (s *SQLStore) WithTx(ctx context.Context, fn func(generated.Querier) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	q := generated.New(tx)
	err = fn(q)
	if err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return fmt.Errorf("tx err: %v, rb err: %v", err, rbErr)
		}
		return err
	}

	return tx.Commit()
}

func ToNullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

