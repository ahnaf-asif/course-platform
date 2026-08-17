# Variables
DOCKER_COMPOSE = docker compose
INFRA_SERVICES = db redis minio minio-setup media-server migrate

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: infra-up
infra-up: ## Start infrastructure services in Docker (Postgres, Redis, Minio, Media Server)
	$(DOCKER_COMPOSE) up -d $(INFRA_SERVICES)

.PHONY: observability-up
observability-up: ## Start optional observability services in Docker (Jaeger, Prometheus, Grafana)
	$(DOCKER_COMPOSE) up -d jaeger grafana
	$(DOCKER_COMPOSE) up -d --no-deps prometheus

.PHONY: infra-down
infra-down: ## Stop all infrastructure services
	$(DOCKER_COMPOSE) down

.PHONY: setup
setup: ## Setup environment files (non-destructive)
	@echo "Checking environment files..."
	@if [ ! -f be/.env ]; then cp be/.env.example be/.env && echo "Created be/.env"; else echo "be/.env already exists"; fi
	@if [ ! -f fe/.env ]; then cp fe/.env.example fe/.env && echo "Created fe/.env"; fi
	@if [ ! -f fe/.env.local ]; then cp fe/.env.local.example fe/.env.local && echo "Created fe/.env.local"; fi

.PHONY: reset-infra
reset-infra: ## Stop infrastructure and remove ALL data (volumes)
	@echo "WARNING: This will delete all your local database and media data."
	@$(DOCKER_COMPOSE) down -v
	@echo "Infrastructure reset. Run 'make dev' to start fresh."

.PHONY: dev
dev: setup infra-up ## Start infrastructure and run FE/BE locally
	@echo "Waiting for infrastructure to be ready..."
	@sleep 5
	@echo "Starting Backend and Frontend in parallel..."
	@$(MAKE) -j 2 dev-be dev-fe

.PHONY: dev-be
dev-be: ## Run backend locally with hot-reload (air)
	@echo "Starting Backend..."
	@cd be && air

.PHONY: dev-fe
dev-fe: ## Run frontend locally with hot-reload (next dev)
	@echo "Starting Frontend..."
	@cd fe && npm run dev

.PHONY: clean
clean: infra-down ## Stop services and clean up docker volumes
	$(DOCKER_COMPOSE) down -v
	rm -rf be/tmp fe/.next
