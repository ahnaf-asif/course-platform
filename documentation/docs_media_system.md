# 🛡️ Secure Media & Video Infrastructure

This document outlines the architecture, security model, and implementation details of the media management and video streaming system.

---

## 🏗️ Architecture Overview

The system is designed for **High Performance** and **Zero-Trust Security**. It uses a "Gatekeeper" pattern where the main backend authorizes actions, but the actual heavy data transfer happens directly between the client and the specialized Media Server.

### The Request Flow
1.  **Browser** → **Next.js Proxy** (`/media-api/*`) → **Media Server**.
2.  **Next.js Proxy** injects the `MEDIA_SERVER_API_KEY` server-side.
3.  **Heavy Uploads** bypass the main Go Backend to prevent memory bottlenecks.
4.  **Authorization** (Tokens/URLs) is handled by the main Go Backend.

---

## 🔐 Security Model

### 1. Secret Protection (Server-Side Injection)
The `MEDIA_SERVER_API_KEY` is **never exposed to the browser**.
- It is stored in `.env` on the server.
- The Next.js `next.config.ts` uses the `headers()` rewrite rule to append the `X-API-KEY` header to requests as they pass through the proxy.
- **Double-Layer Security**: For direct uploads, the frontend also uses a **Temporary Upload Token** (see below).

### 2. Temporary Upload Tokens
To authorize heavy uploads without exposing the master `API_KEY`:
1.  Frontend calls Go Backend: `GET /api/v1/admin/media/upload-token` (Authenticated via JWT).
2.  Backend returns a short-lived HMAC token signed for the `"upload"` action.
3.  Frontend uploads to `/media-api/upload?upload_token=...`.
4.  Media Server validates the token using the shared `STREAM_SECRET`.

### 3. HMAC Stream Tokens
Video streaming is protected by short-lived HMAC signatures.
- **Algorithm**: SHA-256 HMAC.
- **Payload**: `Base64(VideoID) + ExpirationTimestamp`.
- **Validation**: The Media Server recalculates the signature using the `STREAM_SECRET` to verify integrity.

### 3. Session Cookies (HLS Authorization)
Since standard HLS players cannot easily add custom headers to segment requests, we use a **Session Handshake**:
1.  Client requests `index.m3u8?token=...`.
2.  Media Server validates token and sets an `HttpOnly` cookie named `stream_token`.
3.  Browser automatically attaches this cookie to all subsequent `.ts` (segment) and `video.key` requests.

---

## 🚀 Key Workflows

### 🎥 Direct Video Upload (Admin)
1.  **Frontend** sends a POST request with binary data to `/media-api/upload`.
2.  **Next.js** adds the `X-API-KEY` and forwards to **Media Server**.
3.  **Media Server** saves to Minio (Raw) and enqueues a **Transcoding Task**.
4.  **Background Worker** (FFmpeg) splits, encrypts, and saves HLS files to Minio (Processed).
5.  **Frontend** polls `/api/v1/admin/media/token/:id` to check readiness.

### 🖼️ Public Image Upload (RichTextEditor)
1.  **Editor** triggers upload to `/media-api/upload?visibility=public`.
2.  **Media Server** saves to the `public` bucket.
3.  **Editor** receives a proxied URL: `/media-api/p/filename.jpg`.
4.  No token is required to view these files (Cache-friendly).

---

## 🛠️ Component Roles

| Component | Role | Responsibility |
| :--- | :--- | :--- |
| **Go Backend** (`/be`) | **Gatekeeper** | Validates user identity/purchases; issues signed upload URLs and stream tokens. |
| **Next.js** (`/fe`) | **Secure Proxy** | Routes traffic to Media Server; injects secrets; provides the UI components. |
| **Media Server** (`/ms`) | **Data Processor** | Handles HLS transcoding; manages Minio storage; validates tokens/cookies. |
| **Minio** | **Storage** | S3-compatible object storage for raw and processed media. |

---

## 📝 Developer Guidelines

### Adding a new Media feature:
1.  **Never** send the `API_KEY` from the frontend.
2.  **Always** use the `/media-api` proxy prefix in the frontend.
3.  **Relative Paths**: When generating manifests, always use relative paths for keys and segments to ensure they stay within the proxy's session.
4.  **Polling**: Transcoding is asynchronous. Always implement a polling or webhook mechanism in the UI to wait for the "Ready" state.

---

## 🧪 Testing Tools
Two dedicated pages are available for testing the full pipeline:
- `/test`: Test general file uploads and public URL serving.
- `/test-video`: Test the full HLS pipeline (Upload -> Transcode -> Token -> Secure Playback).
