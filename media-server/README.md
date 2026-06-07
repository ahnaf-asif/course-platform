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

This section outlines the exact steps for various media handling scenarios. All management operations require the X-API-KEY header.

#### 1. Public File Upload (Direct Access)
*Use this for images, PDFs, or public assets that do not require protection.*
1.  Request: Client calls POST /api/v1/upload?visibility=public with the file.
2.  Processing: 
    *   The server generates a unique UUID prefix for the file (e.g., 550e8400_image.jpg).
    *   The file is uploaded directly to the Public Bucket in Minio.
3.  Response: Server returns a public_url (e.g., https://media.com/api/v1/p/550e8400_image.jpg).
4.  Access: Anyone can access this URL via a simple GET request without any headers.

#### 2. Private Non-Video Upload (Secure Download)
*Use this for private documents or raw assets.*
1.  Request: Client calls POST /api/v1/upload (default visibility is private).
2.  Processing:
    *   The server generates a UUID prefix.
    *   The file is uploaded to the Raw Bucket (Private).
3.  Response: Server returns the file_name.
4.  Access: 
    *   To download, the client must call GET /api/v1/files/:file_name with X-API-KEY.
    *   The server generates a short-lived (1 hour) pre-signed S3 URL and redirects (307) the client to it.

#### 3. Private Video Upload & Automated HLS (Secure Streaming)
*The core workflow for protected course content.*
1.  Upload Phase:
    *   Client uploads a video (e.g., lesson.mp4) to POST /api/v1/upload.
    *   Server saves it to the Raw Bucket.
    *   Server detects the video extension and triggers an asynchronous transcode task.
2.  Transcoding Phase (Background):
    *   Asynq worker picks up the job.
    *   Workspace: Creates a temporary directory.
    *   Encryption: Generates a random 16-byte AES-128 key and a key.info file for FFmpeg.
    *   FFmpeg: Splits the video into segments (default 10s) with configured bitrate and codec.
    *   Sync: Uploads all artifacts (.m3u8, .ts, key) to the Processed Bucket.
    *   Cleanup: Deletes local temporary files.
3.  Playback Phase:
    *   Token: Frontend requests a playback token via GET /api/v1/stream-token/lesson.mp4.
    *   Verification: To watch, the player requests /api/v1/stream/lesson.mp4/index.m3u8?token=....
    *   Middleware: The server validates the token signature, expiration, and ensures the Referer matches ALLOWED_ORIGINS.

#### 4. Pre-Signed Upload Workflow (Large Files)
*For files larger than 100MB, use pre-signed URLs to avoid proxy timeouts.*
1.  Request: Client calls GET /api/v1/upload-url?file_name=large_video.mp4.
2.  Response: Server returns a upload_url (a direct S3 PUT URL).
3.  Client Action: Client uploads the file directly to Minio using the provided URL.
4.  Completion: After upload, the client calls POST /api/v1/transcode with a JSON body to manually trigger the HLS pipeline.

---

## Security & Protection Logic

This server uses a "Defense in Depth" strategy to protect your content:

### 1. AES-128 Segment Encryption
Unlike standard MP4 streaming where the whole file is exposed, HLS splits the video. We go a step further by encrypting every segment. Even if a user manages to download a .ts file, it is unplayable without the decryption key.

### 2. Referer Whitelisting
The HLSProtection middleware checks the Referer header against a whitelist defined in ALLOWED_ORIGINS. This prevents "hotlinking" (embedding your videos on other websites).

### 3. Signed Session Tokens (HMAC-SHA256)
Every playback session requires a short-lived token.
- Binding: Tokens are cryptographically bound to a specific video_id. A token for Video A cannot be used to watch Video B.
- Expiration: Tokens have a timestamp. Once expired, they are rejected.
- Tamper-proof: Signatures are verified using crypto/subtle.ConstantTimeCompare to prevent timing attacks and tampering.

---

## The HLS Pipeline

When a video is uploaded, the following happens asynchronously:
1. Workspace Setup: A temporary local directory is created.
2. Key Generation: A random 16-byte AES key is generated for this specific video.
3. FFmpeg Execution: 
   ```bash
   ffmpeg -i input.mp4 -c:v [codec] -b:v [bitrate] -hls_time [time] -hls_key_info_file key.info -hls_playlist_type vod index.m3u8
   ```
4. Cloud Sync: The generated files are streamed to Minio, and the local workspace is wiped.

---

## API Specification

### Management Endpoints (Requires X-API-KEY)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| /api/v1/upload | POST | Upload raw file. Triggers HLS if video. |
| /api/v1/upload-url | GET | Get a pre-signed S3 URL for direct-to-S3 uploads. |
| /api/v1/files | GET | List all files in the storage. |
| /api/v1/files/:name | DELETE | Permanently delete a file. |
| /api/v1/transcode | POST | Manually trigger transcoding with optional parameters. |
| /api/v1/stream-token/:id | GET | Generates the token needed for playback. |

#### Manual Transcode Body
```json
{
  "file_name": "video_id.mp4",
  "options": {
    "video_bitrate": "2M",
    "video_codec": "libx264",
    "hls_time": "10"
  }
}
```

### Streaming Endpoints (Public but Protected)

| Endpoint | Method | Required Headers/Params |
| :--- | :--- | :--- |
| /api/v1/stream/:id/index.m3u8 | GET | ?token=... & Referer |
| /api/v1/stream/:id/:seg.ts | GET | ?token=... & Referer |
| /api/v1/stream/:id/key | GET | ?token=... & Referer |

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
