# 🚀 Production Deployment & Security Guide

A complete, production-ready guide for deploying the **Course Platform** (Frontend, Backend API, Media Server, Database, Redis, and Object Storage) with enterprise-grade **Cloudflare Edge Security**, **WAF Anti-Bot Rules**, and **Content Protection**.

---

## 1. Production Architecture Overview

```
                          [ Internet Traffic ]
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │        Cloudflare Edge (WAF & DDoS Protection)       │
        │  • Super Bot Fight Mode (Blocks Scrapy/Puppeteer)    │
        │  • Edge Rate Limiting (30 req/min on /api/v1/lessons)│
        │  • SSL/TLS Full (Strict) + HTTP/3                    │
        │  • Turnstile Managed Challenges on Anomalous Bots    │
        └──────────────────────────┬───────────────────────────┘
                                   │ HTTPS (Encrypted Origin)
                                   ▼
        ┌──────────────────────────────────────────────────────┐
        │            Reverse Proxy (Nginx / Caddy)             │
        │  • SSL Termination (Cloudflare Origin CA Certificate)│
        │  • Path Routing (/ -> Next.js, /api -> Go Backend)   │
        │  • Security Headers (CSP, HSTS, X-Frame-Options)     │
        └──────────────┬────────────────────────┬──────────────┘
                       │                        │
        ┌──────────────┴────────┐       ┌───────┴──────────────┐
        │ Next.js Frontend (FE) │       │ Go Backend API (BE)  │
        │ Port: 3000 (Node.js)  │       │ Port: 8080 (Echo v4) │
        └───────────────────────┘       └───────┬──────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
        ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
        │ PostgreSQL 16 DB │           │  Redis 7 Cluster │           │ Media Server &   │
        │ Persistent Data  │           │ Task Queue & Rate│           │ S3 / R2 Storage  │
        └──────────────────┘           └──────────────────┘           └──────────────────┘
```

---

## 2. Infrastructure Prerequisites

| Component | Minimum Recommended Specs |
| :--- | :--- |
| **Server / VPS** | 4 vCPU, 8 GB RAM, 80+ GB NVMe SSD (Ubuntu 22.04/24.04 LTS) |
| **Domain & DNS** | Domain managed through **Cloudflare** |
| **Object Storage** | AWS S3, Cloudflare R2, or Self-Hosted MinIO for video chunks |
| **Payment Gateway** | SSLCommerz Merchant Credentials (Store ID & Password) |

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Server Setup & Dependencies
On your clean Ubuntu production server:
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker, Docker Compose, and essential tools
sudo apt install -y curl git ufw fail2ban
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Configure Firewall (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

### Step 2: Clone Repository & Configure Environment Variables
```bash
git clone https://github.com/shafins-course/course-platform.git
cd course-platform
```

Create production configuration files:

#### 1. Backend (`/be/.env`)
```env
APP_ENV=production
PORT=8080
DATABASE_URL=postgres://course_user:SECURE_DB_PASSWORD@db:5432/course_platform?sslmode=disable
REDIS_URL=redis://redis:6379/0
JWT_SECRET=GENERATE_64_CHAR_HEX_SECRET_FOR_JWT
REFRESH_TOKEN_SECRET=GENERATE_64_CHAR_HEX_SECRET_FOR_REFRESH
MEDIA_SERVER_URL=http://media-server:8081
FRONTEND_URL=https://yourdomain.com

# SSLCommerz Production Credentials
SSLCOMMERZ_STORE_ID=your_live_store_id
SSLCOMMERZ_STORE_PASS=your_live_store_password
SSLCOMMERZ_IS_SANDBOX=false

# Resend Email Configuration
RESEND_API_KEY=re_your_live_resend_api_key
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Course Platform
```

#### 2. Frontend (`/fe/.env.production`)
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

#### 3. Media Server (`/media-server/.env`)
```env
PORT=8081
REDIS_URL=redis://redis:6379/0
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=SECURE_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=SECURE_MINIO_SECRET_KEY
MINIO_USE_SSL=false
MINIO_BUCKET_NAME=course-videos
STREAM_TOKEN_SECRET=GENERATE_64_CHAR_HEX_SECRET_FOR_STREAM
```

---

### Step 3: Run Database Migrations
```bash
# Run migrations using the migrate container
docker compose run --rm migrate
```

---

### Step 4: Build & Launch Services via Docker Compose
Create a `docker-compose.prod.yml` or run:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

### Step 5: Reverse Proxy (Nginx) Configuration
Install and configure Nginx to route traffic and enforce security headers:

```nginx
# /etc/nginx/sites-available/course-platform.conf

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # Cloudflare Origin CA Certificates
    ssl_certificate /etc/ssl/certs/cloudflare_origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare_origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend REST API
    location /api/v1/ {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://127.0.0.1:8080/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # HLS Media Streaming
    location /media-api/ {
        proxy_pass http://127.0.0.1:8081/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/course-platform.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. 🛡️ Cloudflare Edge Security & Anti-Scraping Setup

To ensure complete protection against automated crawlers, scrapers, and DDoS attacks, configure the following settings in your **Cloudflare Dashboard**:

### 1. SSL/TLS Settings
- **Encryption Mode**: `Full (Strict)`
- **Edge Certificates**:
  - Minimum TLS Version: `TLS 1.2` (Recommended: `TLS 1.3`)
  - Enable **Always Use HTTPS**
  - Enable **HTTP/3 (with QUIC)**
  - Enable **0-RTT Connection Resumption**

---

### 2. WAF & Bot Management Rules (Scraper Defense)

Navigate to **Security ➔ WAF ➔ Custom Rules** and add the following rules:

#### Rule A: Block Automated Headless Scrapers (BeautifulSoup, Scrapy, curl, python-requests)
* **Rule Name**: `Block Automated Scraping User-Agents`
* **Expression**:
  ```text
  (http.user_agent contains "python-requests") or
  (http.user_agent contains "BeautifulSoup") or
  (http.user_agent contains "Scrapy") or
  (http.user_agent contains "curl") or
  (http.user_agent contains "Wget") or
  (http.user_agent contains "Go-http-client") or
  (http.user_agent contains "aiohttp") or
  (http.user_agent contains "HeadlessChrome") or
  (http.user_agent contains "Playwright") or
  (http.user_agent contains "Puppeteer")
  ```
* **Action**: `Block`

#### Rule B: Managed Challenge on Untrusted Cloud Hosting ASNs
* **Rule Name**: `Challenge Cloud Server Crawlers`
* **Expression**:
  ```text
  (ip.src.asnum in {16509 14618 15169 8075 20473} and not http.request.uri.path contains "/api/v1/payments/sslcommerz")
  ```
  *(Challenges AWS, DigitalOcean, Hetzner, Google Cloud IP ranges from hitting course endpoints directly).*
* **Action**: `Managed Challenge` (Cloudflare Turnstile)

#### Rule C: Rate Limiting on Protected Lesson Endpoints
* **Rule Name**: `Lesson Content Edge Rate Limit`
* **Path**: `URI Path contains "/api/v1/lessons/"`
* **Rate**: Max `30 requests per 1 minute` per IP
* **Action**: `Block for 5 minutes` (HTTP 429)

---

### 3. Hotlink Protection & Media Shielding
Navigate to **Scrape Shield**:
- **Hotlink Protection**: `ON` *(Blocks third-party sites from embedding your video streams or thumbnails)*
- **Email Address Obfuscation**: `ON`
- **Server-side Excludes**: `ON`

---

## 5. Automated Database Backups (Production Cron)

Set up a daily automated PostgreSQL backup uploaded to offsite S3 / Cloudflare R2 storage:

Create `/usr/local/bin/backup_db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
DATE=$(date +'%Y-%m-%d_%H%M%S')
FILENAME="course_db_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Dump and compress
docker exec course-platform-db-1 pg_dump -U course_user course_platform | gzip > "$BACKUP_DIR/$FILENAME"

# Retain local backups for 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $FILENAME"
```

Add to root crontab (`sudo crontab -e`):
```cron
0 3 * * * /usr/local/bin/backup_db.sh >> /var/log/db_backup.log 2>&1
```

---

## 6. Production Health Checks & Verification

After deployment, verify that all services are healthy and secured:

| Check | Command / URL | Expected Result |
| :--- | :--- | :--- |
| **API Health** | `curl -I https://yourdomain.com/healthz` | `HTTP/1.1 200 OK` |
| **SSL Strict** | `curl -Iv https://yourdomain.com` | Verified Cloudflare TLS 1.3 |
| **DevTools Detector** | Open Chrome DevTools on `/courses/s/[slug]/learn` | Content unmounts with security alert |
| **Anti-Scraping Agent Block** | `curl -A "python-requests/2.31.0" https://yourdomain.com/api/v1/courses` | `HTTP 403 Forbidden` (Cloudflare WAF) |
| **Print Blocker** | Press `Cmd+P` / `Ctrl+P` on learning screen | Print preview displays blank page |
