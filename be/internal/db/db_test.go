package db

import (
	"context"
	"errors"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/shafins-course/backend/internal/db/generated"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSQLStore_WithTx(t *testing.T) {
	db, mock, err := sqlmock.New()
	require.NoError(t, err)
	defer db.Close()

	store := NewStore(db)
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		mock.ExpectBegin()
		mock.ExpectCommit()

		err := store.WithTx(ctx, func(q generated.Querier) error {
			return nil
		})

		assert.NoError(t, err)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Callback Error - Rollback Success", func(t *testing.T) {
		mock.ExpectBegin()
		mock.ExpectRollback()

		callbackErr := errors.New("callback error")
		err := store.WithTx(ctx, func(q generated.Querier) error {
			return callbackErr
		})

		assert.ErrorIs(t, err, callbackErr)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Begin Error", func(t *testing.T) {
		beginErr := errors.New("begin error")
		mock.ExpectBegin().WillReturnError(beginErr)

		err := store.WithTx(ctx, func(q generated.Querier) error {
			return nil
		})

		assert.ErrorIs(t, err, beginErr)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Rollback Error", func(t *testing.T) {
		mock.ExpectBegin()
		rollbackErr := errors.New("rollback error")
		mock.ExpectRollback().WillReturnError(rollbackErr)

		callbackErr := errors.New("callback error")
		err := store.WithTx(ctx, func(q generated.Querier) error {
			return callbackErr
		})

		assert.Error(t, err)
		assert.Contains(t, err.Error(), "rollback error")
		assert.NoError(t, mock.ExpectationsWereMet())
	})
}
