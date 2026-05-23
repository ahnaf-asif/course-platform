include .env
export

MIGRATIONS_PATH=migrations
DB_URL=postgres://$(DB_USER):$(DB_PASSWORD)@localhost:5432/$(DB_NAME)?sslmode=disable

.PHONY: migrate-create
migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir $(MIGRATIONS_PATH) -seq $$name

.PHONY: migrate-up
migrate-up:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" up

.PHONY: migrate-down
migrate-down:
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" down 1

.PHONY: migrate-force
migrate-force:
	@read -p "Enter version to force: " version; \
	migrate -path $(MIGRATIONS_PATH) -database "$(DB_URL)" force $$version

.PHONY: sqlc-generate
sqlc-generate:
	sqlc generate

.PHONY: dev
dev:
	air

.PHONY: test
test:
	go test -v -short ./...

.PHONY: test-integration
test-integration:
	go test -v ./tests/...
