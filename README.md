# 🎓 Course Platform

A modern, high-performance, and scalable Learning Management System (LMS). This platform is built with a decoupled architecture featuring a Go-powered backend and a Next.js frontend, all orchestrated with Docker and Kubernetes.

---

## 🏗 Project Architecture

This repository is a monorepo containing both the frontend and backend components:

- **[`/be`](./be)**: High-performance Go backend using Echo, SQLC, and PostgreSQL.
- **[`/fe`](./fe)**: Modern React frontend using Next.js 16, Mantine UI, and TanStack Query.
- **[`/media-server`](./media-server)**: Specialized Go server for secure HLS video transcoding and file management.

---

## 🛠 Tech Stack Overview

### [Backend (`/be`)](./be/README.md#%EF%B8%8F-tech-stack)
- **Language**: Go 1.25
- **Web Framework**: Echo v4
- **Database**: PostgreSQL 16 + Redis 7 (Caching & Tasks)
- **SQL Generator**: SQLC (Type-safe Go from SQL)
- **Observability**: Prometheus (Metrics), Jaeger (Tracing), Grafana
- **Orchestration**: Kubernetes + Docker Compose

### [Media Server (`/media-server`)](./media-server/README.md)
- **Language**: Go 1.25
- **Processing**: FFmpeg (HLS Transcoding)
- **Storage**: Minio (S3-Compatible Object Storage)
- **Task Queue**: Asynq (Redis-backed background workers)
- **Security**: HMAC Stream Tokens + Session Cookies

### [Frontend (`/fe`)](./fe/README.md#%EF%B8%8F-tech-stack)
- **Framework**: Next.js 16 (App Router, React 19)
- **UI Library**: Mantine UI (v9)
- **Data Fetching**: TanStack Query (v5) + Axios
- **API Client**: Orval (Automated client generation from OpenAPI)
- **Testing**: Vitest + React Testing Library

---

## 🚀 Development Quick Start

The easiest way to set up the platform for local development is using the root **Makefile**. This starts all infrastructure in Docker but runs the frontend and backend locally for better performance and hot-reloading.

### 1. Prerequisites
- **Docker & Docker Compose**
- **Node.js 20+** (for frontend)
- **Go 1.25+** (for backend)
- **Air** (`go install github.com/air-verse/air@latest`)

### 2. Setup
```bash
make setup
```
This initializes all `.env` files from their examples.

### 3. Run Development Environment
```bash
make dev
```
This command:
1. Starts **Postgres, Redis, Minio, Media-Server** in Docker.
2. Runs the **Go API** locally via `air`.
3. Runs the **Next.js Frontend** locally via `npm run dev`.

### 4. Other Commands
- `make infra-up`: Start only essential Docker infrastructure (DB, Redis, MinIO, Media-Server).
- `make observability-up`: Start optional observability tools (Jaeger, Prometheus, Grafana).
- `make infra-down`: Stop Docker containers.
- `make clean`: Stop everything and delete all local build caches.
- `make reset-infra`: **WARNING**: Deletes all Docker volumes (DB & Media data).

---

## 🏗 Project Architecture & Background Jobs

The platform uses a sophisticated background job system for intensive tasks:

### 🎥 Media Processing (HLS)
When a video is uploaded, it is enqueued into a task queue.
- **Worker**: FFmpeg splits and encrypts the video into HLS segments.
- **Real-time Updates**: The frontend polls the **Task Status API** to automatically refresh the UI once transcoding is complete.

### 📝 Bulk Quiz Uploads
Admins can upload large CSV files for quiz creation.
- **Worker**: Parses CSV, validates questions, and bulk-inserts into Postgres.
- **Status**: Tracked via the same task polling mechanism as videos.

---

## 📖 Detailed Documentation

For specific development guides, troubleshooting, and architectural details, please refer to the project documentation:

- 📚 **[Documentation Hub & Index](./documentation/README.md)**
- 🤝 **[Referral & bKash Payout System Roadmap](./documentation/referral_system_roadmap.md)**
- 🚀 **[Production Deployment & Security Guide](./documentation/deployment_guide.md)**
- 🛡️ **[Secure Media System](./documentation/docs_media_system.md)**
- 🔒 **[Anti-Scraping & Content Protection System](./documentation/anti_scraping_content_protection_plan.md)**
- 💳 **[Payment System & SSLCommerz](./documentation/payment_system_documentation.md)**
- 📚 **[Backend Documentation](./be/README.md)**
- 🎨 **[Frontend Documentation](./fe/README.md)**
- 📡 **[API Specification (OpenAPI)](./be/docs/openapi.yaml)**

---

© 2026 Course Platform Team
