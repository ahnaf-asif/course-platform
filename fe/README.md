# 🎓 Course Platform Frontend

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
- [📂 Media & File Management](#-media--file-management)
- [📩 Contact Form & Discord Webhook Proxy](#-contact-form--discord-webhook-proxy)
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

## 🔐 Authentication & Authorization

This frontend uses a secure, server-centric authentication model that relies on **HttpOnly Cookies** and **Next.js Middleware**. This architecture is designed to be robust against common web vulnerabilities like Cross-Site Scripting (XSS).

### Core Concepts

1.  **Backend (Go):** The backend is the source of truth. It issues two `HttpOnly` cookies upon a successful login:
    *   `access_token`: A short-lived JSON Web Token (JWT) containing the user's ID, email, and role (`USER` or `ADMIN`).
    *   `refresh_token`: A long-lived token used to generate new access tokens.
    > Because these cookies are `HttpOnly`, they **cannot be accessed by client-side JavaScript**, which is the primary defense against token theft.

2.  **Middleware (`src/middleware.ts`):** This file acts as the primary security gatekeeper. It runs on the server before any page is rendered.
    *   It intercepts requests for specific paths (defined in its `matcher` config).
    *   It checks for the presence and validity of the `access_token` cookie.
    *   For `/admin` routes, it decodes the JWT and verifies the user's role is `ADMIN`.
    *   If any check fails, it immediately redirects the user to the appropriate page (`/login` or `/dashboard`) before any sensitive UI code is sent to the browser.

3.  **File-System Based Authorization:** You control who can access a page simply by **where you put the file**. You do not need to add any special logic inside your page components.

### How to Create Pages

#### 1. Public Pages (Everyone can access)
To create a page that is accessible to everyone (logged in or not), place it in any directory **not** covered by the middleware's `matcher`.

**Example:**
- Create `src/app/courses/[courseId]/page.tsx`.
- Since `/courses` is not in the middleware's `matcher`, it remains public.

#### 2. User Pages (Any logged-in user)
To create a page that requires a user to be logged in (can be `USER` or `ADMIN`), place it in a directory that is protected by a general middleware rule.

**Example:**
- Create `src/app/(user)/dashboard/my-courses/page.tsx`.
- The middleware is configured to protect all routes starting with `/dashboard`, so it will automatically require login for this page.

#### 3. Admin-Only Pages
To create a page that can only be accessed by an `ADMIN`, place it within the `src/app/(admin)/` directory.

**Example:**
- Create `src/app/(admin)/admin/users/page.tsx`.
- The middleware is configured to protect all routes starting with `/admin` and will enforce the `ADMIN` role check.

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

## 📂 Media & File Management

The platform includes a dedicated Go-based Media Server for handling file uploads and secure HLS video streaming. For security and ease of use, all media requests are proxied through the frontend.

### 📡 Media API Proxy
The frontend uses Next.js rewrites to proxy requests from `/media-api/*` to the Media Server. This eliminates CORS issues and simplifies authorization.
- **Local Dev URL**: `http://localhost:8081/api/v1`
- **Frontend Proxy**: `/media-api/...`

### 🔓 Public Files (Images, PDFs, etc.)
Public files are stored in a dedicated bucket and can be accessed directly via a relative proxy path.

#### Uploading Public Files
1.  **Authorize**: Get a temporary token from the backend.
2.  **Upload**: Send binary data to `/media-api/upload?visibility=public&upload_token=...`.

**Reusable Component:** Use the `<ImageUpload />` component for automatic handling.
```tsx
import ImageUpload from '@/components/ImageUpload';

<ImageUpload 
  value={thumbnail} 
  onChange={(url) => setThumbnail(url)} 
/>
// Result: /media-api/p/unique_id_name.png
```

### 🔐 Private Files & Secure Streaming (HLS)
Videos are split and encrypted using HLS. Access requires a **Session Handshake**.

#### The Secure Pipeline:
1.  **Upload**: Use the `<VideoUpload />` component. It handles temporary token acquisition and direct binary upload to the media server via proxy.
2.  **Transcoding**: The Media Server automatically triggers background processing.
3.  **Task Polling**: The frontend captures the `task_id` and polls `GET /admin/media/tasks/:id`.
4.  **Readiness**: Once the task state is `COMPLETED`, the UI automatically updates to show the "Ready" badge and enables the "Preview" button.
5.  **Playback**: 
    - The player requests `index.m3u8?token=...`.
    - The Media Server sets a **Session Cookie**.
    - All segments are automatically authorized via the cookie.

**Reusable Component:**
```tsx
import VideoUpload from '@/app/(admin)/admin/courses/[id]/curriculum/lesson/[lessonId]/_components/VideoUpload';

<VideoUpload 
  value={videoId} 
  onChange={(id) => setVideoId(id)} 
/>
```

#### Implementation Example (HLS.js):
```tsx
import Hls from 'hls.js';

// 1. Get Token
const { token } = await axios.get(`/media-api/stream-token/${videoId}`);

// 2. Load into Player
const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${token}`;
if (Hls.isSupported()) {
  const hls = new Hls();
  hls.loadSource(manifestUrl);
  hls.attachMedia(videoElement);
}
```

### 🛠 Troubleshooting
- **401 Unauthorized**: Ensure you are using the `/media-api` proxy path. Requests made directly to port 8081 will fail cookie validation.
- **Transcoding Delay**: Transcoding is an intensive background task. Use the `/test-video` page to monitor status polling.
- **File Limits**: The maximum upload size is currently configured to **500MB**.

---

## 📩 Contact Form & Discord Webhook Proxy

The `/contact` page submits user messages to an administrative Discord channel via a secure Next.js server-side route handler (`POST /api/contact`).

### 🔒 Security & Architecture
- **Private Webhook**: `DISCORD_WEBHOOK_URL` is kept strictly on the server side (without the `NEXT_PUBLIC_` prefix) to prevent exposing the webhook token to client-side bundles.
- **Auto Simulation Fallback**: If `DISCORD_WEBHOOK_URL` is unset or contains `placeholder`/`mock`, the endpoint logs the payload to the server console and responds with `{ success: true, simulated: true }` so local dev and test suites do not fail on missing credentials.
- **ANSI Styling & Spacing**: Discord messages are formatted with bold yellow ANSI labels (`\u001b[1;33m`), EduVerse Blue embed accent (`#3B82F6`), optional phone number support, and vertical spacing (`\n\n\u200B`).

### Configuration
```bash
# fe/.env or fe/.env.local
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

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
