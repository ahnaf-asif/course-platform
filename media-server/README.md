# Secure HLS Media Server (Go + Echo + Minio)

A production-grade, highly secure media storage and streaming solution tailored for online course platforms. This server acts as a protective wrapper around Minio (S3), providing automated HLS transcoding with AES-128 encryption and strict access control to prevent unauthorized video downloads.

---

## Table of Contents
1. Architectural Overview
2. Security & Protection Logic
3. The HLS Pipeline
4. API Specification
5. Getting Started
6. Frontend Integration
7. Scaling & Production Readiness
8. Maintenance

---

## Architectural Overview

The system is built using the following core components:
- Go + Echo: A high-performance web framework for the API layer.
- Minio (S3): Used as the primary object storage for both raw and processed media.
- FFmpeg: Invoked as a background process to transcode raw videos into encrypted HLS segments.
- HMAC-SHA256: Cryptographic signing for session tokens to ensure request integrity.

### Detailed Data Flow & Workflows

This section outlines the exact steps for various media handling scenarios. All management operations require the `X-API-KEY` header OR a valid `upload_token`.

#### 1. Public File Upload (Direct Access)
*Use this for images, PDFs, or public assets that do not require protection.*
1.  **Authorize**: Frontend calls Go Backend for an `upload_token`.
2.  **Request**: Client calls `POST /api/v1/upload?visibility=public&upload_token=...` with the file.
3.  **Processing**: 
    *   The server generates a unique UUID prefix for the file.
    *   The file is uploaded directly to the Public Bucket in Minio.
4.  **Response**: Server returns a `file_name` and `public_url`.
5.  **Access**: Accessible via `/api/v1/p/{file_name}` without headers.

#### 2. Private Video Upload & Automated HLS (Secure Streaming)
*The core workflow for protected course content.*
1.  **Upload Phase**:
    *   Client uploads a video to `POST /api/v1/upload?upload_token=...`.
    *   Server saves it to the Raw Bucket and triggers the asynchronous transcode task.
2.  **Transcoding Phase (Background)**:
    *   Worker generates a random AES-128 key and splits the video into encrypted segments.
    *   Artifacts are saved to the Processed Bucket.
3.  **Playback Phase**:
    *   **Manifest**: Request `/api/v1/stream/{id}/index.m3u8?token=...`.
    *   **Session**: Upon success, a `stream_token` **cookie** is set.
    *   **Segments**: Subsequent requests for segments and keys are authorized via the cookie.

---

## API Specification

### Management Endpoints (Requires X-API-KEY or upload_token)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/upload` | POST | Upload raw file. Supports `upload_token` in query. |
| `/api/v1/files` | GET | List all files in the storage (Requires X-API-KEY). |
| `/api/v1/files/:name` | DELETE | Permanently delete a file (Requires X-API-KEY). |
| `/api/v1/transcode` | POST | Manually trigger transcoding. Returns `task_id`. |
| `/api/v1/tasks/:task_id` | GET | Query the status of a background job. |
| `/api/v1/stream-token/:id` | GET | Generates a playback token (Requires X-API-KEY). |

### Streaming Endpoints (Protected)

| Endpoint | Method | Authorization |
| :--- | :--- | :--- |
| `/api/v1/stream/*` | GET/HEAD | Wildcard route for HLS manifests, segments, and keys. Validates token (query) or cookie. |


### API Documentation
Interactive API documentation is available at /api/v1/docs. 
- Local: http://localhost:8081/api/v1/docs
- Swagger UI: You can test all endpoints directly from this interface using your API_KEY (Authorize button).

---

## Getting Started

### 1. Environment Configuration
Copy .env.example to .env and configure:
- STREAM_SECRET: Any long random string.
- ALLOWED_ORIGINS: Comma-separated list (e.g., http://localhost:3000,https://mycourse.com).
- API_KEY: Your admin secret.
- DEFAULT_VIDEO_BITRATE: (Default: 2M)
- DEFAULT_VIDEO_CODEC: (Default: libx264)
- DEFAULT_HLS_TIME: (Default: 10)

### 2. Run with Docker
```bash
make docker-up
```

---

## Frontend Integration

### Next.js Rewrite (Highly Recommended)
To hide the fact that you use a separate media server, add this to next.config.js:
```javascript
async rewrites() {
  return [
    {
      source: '/media-api/:path*',
      destination: 'http://media-server:8081/api/v1/:path*',
    },
  ]
}
```

### Video Player Implementation
```javascript
// 1. Fetch token via your Next.js backend (to keep API_KEY hidden)
const { token } = await fetch('/api/get-stream-token?id=lesson1.mp4').then(res => res.json());

// 2. Initialize Player (e.g., Video.js or Plyr)
const videoSrc = `/media-api/stream/lesson1.mp4/index.m3u8?token=${token}`;
```

---

## Scaling & Production Readiness

1. Distributed Transcoding: For high-volume platforms, replace the internal Goroutine-based transcoding with a task queue like Celery (Python) or Asynq (Go) using Redis.
2. CDN Caching: 
   - Segments (.ts): Cache at the edge for 1 year (they never change).
   - Manifests (.m3u8): Cache for 1-5 minutes.
3. Storage: Use Minio in Distributed Mode or point this server to AWS S3/DigitalOcean Spaces.

---

## Maintenance

The project includes a Makefile for common tasks:
- make fmt: Auto-format code.
- make lint: Run quality checks.
- make test: Run unit and integration tests.
- make coverage: Check test coverage (currently > 80%).
- make clean: Wipe binaries and temporary files.
