# 🎓 Course Platform

[![Backend CI](https://github.com/shafins-course/backend/actions/workflows/ci.yml/badge.svg)](https://github.com/shafins-course/backend/actions/workflows/ci.yml)
[![Frontend CI](https://github.com/ahnaf-asif/course-platform/actions/workflows/fe-ci.yml/badge.svg)](https://github.com/ahnaf-asif/course-platform/actions/workflows/fe-ci.yml)

A modern, high-performance, and scalable Learning Management System (LMS). This platform is built with a decoupled architecture featuring a Go-powered backend and a Next.js frontend, all orchestrated with Docker and Kubernetes.

---

## 🏗 Project Architecture

This repository is a monorepo containing both the frontend and backend components:

- **[`/be`](./be)**: High-performance Go backend using Echo, SQLC, and PostgreSQL.
- **[`/fe`](./fe)**: Modern React frontend using Next.js 16, Mantine UI, and TanStack Query.

---

## 🛠 Tech Stack Overview

### [Backend (`/be`)](./be/README.md#%EF%B8%8F-tech-stack)
- **Language**: Go 1.25
- **Web Framework**: Echo v4
- **Database**: PostgreSQL 16 + Redis 7 (Caching)
- **SQL Generator**: SQLC (Type-safe Go from SQL)
- **Observability**: Prometheus (Metrics), Jaeger (Tracing), Grafana
- **Orchestration**: Kubernetes + Docker Compose

### [Frontend (`/fe`)](./fe/README.md#%EF%B8%8F-tech-stack)
- **Framework**: Next.js 16 (App Router, React 19)
- **UI Library**: Mantine UI (v9)
- **Data Fetching**: TanStack Query (v5) + Axios
- **API Client**: Orval (Automated client generation from OpenAPI)
- **Testing**: Vitest + React Testing Library

---

## 🚀 Quick Start (Full Stack)

The easiest way to get the entire platform running locally is using Docker Compose.

### 1. Prerequisites
- **Docker & Docker Compose**
- **Node.js 20+** (for local frontend development)
- **Go 1.25+** (for local backend development)

### 2. Environment Setup
Copy the example environment files in both directories:
```bash
# Backend
cp be/.env.example be/.env

# Frontend
cp fe/.env.local.example fe/.env.local
```

### 3. Spin up the Platform
From the root directory, run:
```bash
docker compose up -d
```
This will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **PostgreSQL**: :5432
- **Redis**: :6379
- **Grafana**: :3001
- **Jaeger**: :16686

---

## 📖 Detailed Documentation

For specific development guides, troubleshooting, and architectural details, please refer to the component-specific READMEs:

- 📚 **[Backend Documentation](./be/README.md)**
- 🎨 **[Frontend Documentation](./fe/README.md)**
- 📡 **[API Specification (OpenAPI)](./be/docs/openapi.yaml)**

---

© 2026 Course Platform Team
