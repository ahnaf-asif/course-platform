# 🎓 Course Platform Frontend

[![Frontend CI](https://github.com/ahnaf-asif/course-platform/actions/workflows/fe-ci.yml/badge.svg)](https://github.com/ahnaf-asif/course-platform/actions/workflows/fe-ci.yml)
[![Next.js Version](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)](https://nextjs.org/)
[![Mantine Version](https://img.shields.io/badge/Mantine-9.2.1-blue?logo=mantine)](https://mantine.dev/)

A modern, high-performance web interface for the Course Platform. Built with Next.js 16, Mantine UI, and a fully type-safe API client generated from OpenAPI specs.

---

## 📑 Table of Contents
- [🚀 Quick Start](#-quick-start)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture & Project Structure](#-architecture--project-structure)
- [📡 API Client Generation (Orval)](#-api-client-generation-orval)
- [🔐 Authentication & Security](#-authentication--security)
- [🎨 Styling & Components](#-styling--components)
- [🐳 Docker & Orchestration](#-docker--orchestration)
- [🚀 CI/CD Pipeline](#-cicd-pipeline)
- [🛠 Development Guide](#-development-guide)

---

## 🚀 Quick Start

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js 20+**
- **npm 10+**
- **Docker & Docker Compose** (for full-stack development)

### 2. Setup Environment
```bash
cd fe
cp .env.local.example .env.local
# Default values work with the local backend running on http://localhost:8080.
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Generate API Client
```bash
npm run generate:api
```

### 5. Run Development Server
...
```bash
npm run dev
```

### 6. Run Tests
```bash
npm run test
```

---

## 🧪 Testing

We use **Vitest** and **React Testing Library** for testing. 

### Running Tests
- `npm run test`: Run all tests once.
- `npm run test:watch`: Run tests in watch mode.

### What is Tested
- **Authentication Flow**: Hydration from localStorage, login, logout, and token storage.
- **Form Validation**: Client-side validation for Login and Register pages.
- **Axios Interceptors**: Automatic token refresh on 401 errors and redirection on failure.
- **Route Protection**: (Future) Protecting routes based on auth state and roles.

---

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 | App Router, React 19, Server Components. |
| **UI Library** | Mantine UI | Comprehensive component library with high accessibility. |
| **Data Fetching** | TanStack Query (v5) | Declarative, type-safe data fetching and caching. |
| **API Client** | Orval + Axios | Automated client generation from OpenAPI specs. |
| **Icons** | Tabler Icons | Clean and consistent SVG icon set. |
| **State Management** | React Context | Lightweight local state for Auth and UI. |
| **Styling** | PostCSS | Modern CSS features with Mantine presets. |

---

## 🏗 Architecture & Project Structure

We follow a modular directory structure designed for scalability:

- `src/app/`: Next.js App Router pages and layouts.
- `src/api/`: API client logic.
    - `generated/`: **(Gitignored)** Automated Orval hooks.
    - `model/`: **(Gitignored)** TypeScript interfaces from OpenAPI.
- `src/components/`: Reusable UI components.
- `src/context/`: Global React Contexts (e.g., `AuthContext`).
- `src/hooks/`: Custom React hooks (e.g., `useAuth`).
- `src/lib/`: Shared utility libraries and configurations (Axios instance, Theme).
- `public/`: Static assets like images and fonts.

---

## 📡 API Client Generation (Orval)

We use **Orval** to maintain synchronization between the backend and frontend. The frontend client is strictly derived from the backend's `openapi.yaml`.

> [!NOTE]
> We follow a "Generate on Build" strategy for the frontend. The generated files are excluded from Git to prevent desync and ensure the OpenAPI spec remains the single source of truth.

### Workflow
1. Update the OpenAPI spec in `be/docs/`.
2. Run `npm run generate:api` in the `fe/` directory.
3. Use the generated hooks in `src/api/generated/`.

If you see TypeScript errors related to `@/api/generated`, it usually means you need to run the generation command.

**Example Usage:**
```tsx
import { usePostAuthLogin } from '@/api/generated/authentication/authentication';

const { mutateAsync: login } = usePostAuthLogin();
// Everything is fully typed based on the spec!
```

---

## 🔐 Authentication & Security

### Token Strategy
We use a **Double Token Strategy** (Access + Refresh):
- **Access Token**: Stored only in React state (`AuthContext`). Never persisted to `localStorage`.
- **Refresh Token**: Stored in `localStorage`. Used to silently hydrate the access token on page reload and to perform automatic refreshes.

### Automatic Token Refresh
Our Axios interceptor (`src/lib/axios.ts`) handles 401 Unauthorized errors:
1. Catches a 401 response.
2. Attempts to call `POST /auth/refresh` with the stored refresh token.
3. On success, updates the state and retries the original request.
4. On failure, clears local data and redirects to `/login`.

---

## 🎨 Styling & Components

### Mantine UI
We leverage Mantine's robust component system. Customizations are kept in `src/lib/theme.ts`.
- **Theming**: Centralized control over colors, radius, and fonts.
- **Providers**: The app is wrapped in `MantineProvider`, `Notifications`, and `ModalsProvider`.

### Breakpoints
PostCSS variables are configured in `postcss.config.cjs` to match Mantine's standard breakpoints:
- `xs`: 36em, `sm`: 48em, `md`: 62em, `lg`: 75em, `xl`: 88em.

---

## 🐳 Docker & Orchestration

### Standalone Production Build
The Dockerfile uses a multi-stage build and Next.js's `standalone` output mode for minimal image size.
```bash
docker build -t course-platform-fe -f fe/Dockerfile .
```

### Full Stack (Recommended)
Run the entire platform from the repo root:
```bash
docker compose up
```
This orchestrates the Database, Redis, API, and Frontend seamlessly.

---

## 🚀 CI/CD Pipeline

Our GitHub Actions workflow (`.github/workflows/fe-ci.yml`) ensures high code quality:

1.  **lint-and-typecheck**: Validates code style and TypeScript integrity on every PR.
2.  **generate-and-build**: Confirms the API client can be generated and the app builds successfully.
3.  **docker-build**: Verifies the production Docker image on the `main` branch.

---

## 🛠 Development Guide

### Adding a New API Endpoint
1. Ensure the endpoint is defined in the backend OpenAPI spec.
2. Run `npm run generate:api`.
3. The new hook will be available in `src/api/generated/`.

### Creating a New Page
1. Create a directory in `src/app/` (e.g., `src/app/courses/page.tsx`).
2. Use Mantine components for layout and styling.
3. Utilize `useAuth` if the page requires authentication.

### Type Safety
Always prefer the generated models in `src/api/model/` over manual interfaces. This ensures the frontend remains the "source of truth" regarding API data structures.
