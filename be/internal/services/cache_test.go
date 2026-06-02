package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/go-redis/redismock/v9"
	"github.com/stretchr/testify/assert"
)

func TestCacheService(t *testing.T) {
	db, mock := redismock.NewClientMock()
	s := &CacheService{client: db}
	ctx := context.Background()

	t.Run("Ping", func(t *testing.T) {
		mock.ExpectPing().SetVal("PONG")
		err := s.Ping(ctx)
		assert.NoError(t, err)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Set and Get", func(t *testing.T) {
		key := "test-key"
		value := map[string]string{"foo": "bar"}
		expiration := 10 * time.Minute

		data, _ := json.Marshal(value)

		// Expect Set
		mock.ExpectSet(key, data, expiration).SetVal("OK")
		err := s.Set(ctx, key, value, expiration)
		assert.NoError(t, err)

		// Expect Get
		mock.ExpectGet(key).SetVal(string(data))
		var dest map[string]string
		err = s.Get(ctx, key, &dest)
		assert.NoError(t, err)
		assert.Equal(t, value, dest)

		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Delete", func(t *testing.T) {
		key := "delete-key"
		mock.ExpectDel(key).SetVal(1)
		err := s.Delete(ctx, key)
		assert.NoError(t, err)
		assert.NoError(t, mock.ExpectationsWereMet())
	})

	t.Run("Close", func(t *testing.T) {
		// Expect close? redis client close doesn't return mockable error easily but we can call it
		err := s.Close()
		assert.NoError(t, err)
	})
}
