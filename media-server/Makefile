# Binary name
BINARY_NAME=media-server

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOLINT=golangci-lint
AIR=air
SWAG=swag

# Docker parameters
DOCKER_COMPOSE=docker-compose

.PHONY: all build clean test coverage lint run dev docker-up docker-down help tidy fmt swagger

all: lint test build

build:
	$(GOBUILD) -o bin/$(BINARY_NAME) ./cmd/api

clean:
	$(GOCLEAN)
	rm -f bin/$(BINARY_NAME)
	rm -rf tmp
	rm -f coverage.out coverage.html

test:
	$(GOTEST) -v ./...

coverage:
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -func=coverage.out
	@echo "To view HTML coverage report, run: make coverage-html"

coverage-html: coverage
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated at coverage.html"

lint:
	@if command -v $(GOLINT) > /dev/null; then \
		$(GOLINT) run ./...; \
	else \
		echo "golangci-lint not found. Install it from https://golangci-lint.run/"; \
		exit 1; \
	fi

run:
	$(GOCMD) run cmd/api/main.go

dev:
	@if command -v $(AIR) > /dev/null; then \
		$(AIR); \
	else \
		echo "air not found. Installing it..."; \
		$(GOCMD) install github.com/air-verse/air@latest; \
		$(AIR); \
	fi

swagger:
	@if command -v $(SWAG) > /dev/null; then \
		$(SWAG) init -g cmd/api/main.go --parseDependency --parseInternal; \
	else \
		echo "swag not found. Installing it..."; \
		$(GOCMD) install github.com/swaggo/swag/cmd/swag@latest; \
		$(SWAG) init -g cmd/api/main.go --parseDependency --parseInternal; \
	fi

docker-up:
	$(DOCKER_COMPOSE) up --build

docker-down:
	$(DOCKER_COMPOSE) down

tidy:
	$(GOMOD) tidy

fmt:
	$(GOCMD) fmt ./...

help:
	@echo "Available commands:"
	@echo "  make build         - Build the Go binary"
	@echo "  make clean         - Remove binaries and coverage files"
	@echo "  make test          - Run all tests"
	@echo "  make coverage      - Run tests and show coverage in terminal"
	@echo "  make coverage-html - Run tests and generate HTML coverage report"
	@echo "  make lint          - Run golangci-lint"
	@echo "  make run           - Run the application locally"
	@echo "  make dev           - Run with live reload using air"
	@echo "  make swagger       - Regenerate Swagger documentation"
	@echo "  make docker-up     - Start services with docker-compose"
	@echo "  make docker-down   - Stop docker-compose services"
	@echo "  make tidy          - Run go mod tidy"
	@echo "  make fmt           - Format all Go source files"
