# MLCalc Deployment Guide

## Prerequisites

### Required Software

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.30+

### Required Accounts

- **Cloudflare**: For tunnel (optional)
- **Google Cloud**: OAuth credentials
- **Microsoft Azure**: OAuth credentials (optional)

### System Requirements

- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended for OCR)
- **Disk**: 20GB+ (for screenshots and database)
- **Network**: Port 8504 accessible

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/bhadip/mlcalc.git
cd mlcalc
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required Variables:**

```bash
# Application
SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# Database
DB_PASSWORD=<strong-password>

# OAuth (optional)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Cloudflare (optional)
CLOUDFLARE_TUNNEL_TOKEN=<your-tunnel-token>
```

**Generate Secrets:**

```bash
openssl rand -hex 32
```

### 3. Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

**What deploy.sh does:**
1. Builds Docker images
2. Starts services (app, db, cloudflared)
3. Waits for database ready
4. Runs Alembic migrations
5. Seeds default instruments
6. Checks health endpoint

### 4. Verify

```bash
# Check services
docker-compose ps

# Check logs
docker-compose logs -f app

# Test health
curl http://localhost:8504/api/health
```

**Expected Output:**

```json
{
  "status": "healthy",
  "app": "MLCalc",
  "version": "0.1.0"
}
```

---

## Manual Deployment

### Build Images

```bash
docker-compose build --no-cache
```

### Start Services

```bash
docker-compose up -d
```

### Run Migrations

```bash
docker-compose exec app alembic upgrade head
```

### Seed Instruments

```bash
docker-compose exec app python -m scripts.seed_instruments
```

### Create Admin User

```bash
# Login via OAuth first, then:
docker-compose exec app python -c "
from app.database import async_session_factory
from app.models.user import User, UserRole
from sqlalchemy import select
import asyncio

async def promote():
    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == 'your@email.com'))
        user = result.scalar_one_or_none()
        if user:
            user.role = UserRole.ADMIN
            user.is_approved = True
            await session.commit()
            print(f'Promoted {user.email} to admin')
        else:
            print('User not found')

asyncio.run(promote())
"
```

---

## Cloudflare Tunnel Setup

### 1. Create Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Login
./cloudflared login

# Create tunnel
./cloudflared tunnel create mlcalc
```

### 2. Configure Tunnel

Edit `~/.cloudflared/<TUNNEL_ID>.json`:

```json
{
  "tunnel": "<TUNNEL_ID>",
  "credentials-file": "/root/.cloudflared/<TUNNEL_ID>.json",
  "ingress": [
    {
      "hostname": "mlcalc.prasanti.com",
      "service": "http://localhost:8504"
    },
    {
      "service": "http_status:404"
    }
  ]
}
```

### 3. Route DNS

```bash
./cloudflared tunnel route dns mlcalc mlcalc.prasanti.com
```

### 4. Get Token

```bash
./cloudflared tunnel token mlcalc
```

Copy token to `.env`:

```bash
CLOUDFLARE_TUNNEL_TOKEN=<token>
```

### 5. Restart

```bash
docker-compose restart cloudflared
```

---

## Google OAuth Setup

### 1. Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: "MLCalc"
3. Enable "Google+ API"

### 2. Create Credentials

1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: "Web application"
3. Name: "MLCalc Web"
4. Authorized redirect URIs:
   - `https://mlcalc.prasanti.com/api/v1/auth/google/callback`
   - `http://localhost:8504/api/v1/auth/google/callback`

### 3. Copy Credentials

```bash
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
```

---

## Microsoft OAuth Setup

### 1. Register Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. "Azure Active Directory" → "App registrations" → "New registration"
3. Name: "MLCalc"
4. Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
5. Redirect URI: "Web" → `https://mlcalc.prasanti.com/api/v1/auth/microsoft/callback`

### 2. Create Secret

1. "Certificates & secrets" → "New client secret"
2. Description: "MLCalc Secret"
3. Expires: 24 months
4. Copy value immediately

### 3. Configure API Permissions

1. "API permissions" → "Add a permission" → "Microsoft Graph" → "Delegated permissions"
2. Add: `email`, `profile`, `User.Read`, `openid`
3. Click "Grant admin consent"

### 4. Copy Credentials

```bash
MS_CLIENT_ID=<application-id>
MS_CLIENT_SECRET=<secret-value>
MS_TENANT_ID=common
```

---

## Database Management

### Backup

```bash
chmod +x backup.sh
./backup.sh
```

**Creates:**
- `backups/db_YYYYMMDD_HHMMSS.sql.gz`
- `backups/uploads_YYYYMMDD_HHMMSS.tar.gz`

### Restore

```bash
chmod +x restore.sh
./restore.sh backups/db_20260115_120000.sql.gz
```

### Manual Backup

```bash
# Database
docker-compose exec db pg_dump -U mlcalc mlcalc | gzip > backup.sql.gz

# Uploads
docker-compose run --rm app tar czf uploads.tar.gz /app/uploads
```

### Manual Restore

```bash
# Database
gunzip -c backup.sql.gz | docker-compose exec -T db psql -U mlcalc mlcalc

# Uploads
cat uploads.tar.gz | docker-compose run --rm app tar xzf - -C /
```

---

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db

# Last 100 lines
docker-compose logs --tail=100 app
```

### Health Checks

```bash
# Application
curl http://localhost:8504/api/health

# Database
docker-compose exec db pg_isready -U mlcalc

# Disk space
docker-compose exec app df -h

# Memory usage
docker-compose exec app free -m
```

### Performance Metrics

```bash
# Database connections
docker-compose exec db psql -U mlcalc -c "SELECT count(*) FROM pg_stat_activity;"

# Table sizes
docker-compose exec db psql -U mlcalc -c "
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Port 8504 already in use
# - Database not ready
# - Missing environment variables
```

### Database Connection Failed

```bash
# Check database status
docker-compose ps db

# Restart database
docker-compose restart db

# Check connection
docker-compose exec app python -c "
import asyncio
from app.database import engine
from sqlalchemy import text

async def test():
    async with engine.connect() as conn:
        result = await conn.execute(text('SELECT 1'))
        print('Database connected:', result.scalar())

asyncio.run(test())
"
```

### OCR Not Working

```bash
# Check EasyOCR installation
docker-compose exec app python -c "import easyocr; print('EasyOCR OK')"

# Check Tesseract
docker-compose exec app tesseract --version

# Test OCR manually
docker-compose exec app python -c "
from app.services.ocr_service import OCRService
import asyncio

async def test():
    ocr = OCRService()
    result = await ocr.extract_from_image('/app/uploads/test.jpg')
    print(result)

asyncio.run(test())
"
```

### Frontend Not Loading

```bash
# Check static files
docker-compose exec app ls -la /app/static

# Check nginx config (if using)
docker-compose exec app cat /etc/nginx/conf.d/default.conf

# Rebuild frontend
docker-compose build --no-cache app
docker-compose up -d app
```

### Cloudflare Tunnel Issues

```bash
# Check tunnel status
docker-compose logs cloudflared

# Verify token
echo $CLOUDFLARE_TUNNEL_TOKEN

# Test connectivity
curl -I https://mlcalc.prasanti.com/api/health
```

---

## Security Hardening

### 1. Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. SSH Keys Only

```bash
# Edit /etc/ssh/sshd_config
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart sshd
```

### 3. Fail2Ban

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 4. Automatic Updates

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 5. Database Security

```bash
# Strong password
DB_PASSWORD=$(openssl rand -base64 32)

# Limit connections
# Edit postgresql.conf: max_connections = 100

# Enable SSL
# Edit postgresql.conf: ssl = on
```

---

## Scaling

### Vertical Scaling

```bash
# Increase Docker resources
# Edit docker-compose.yml:
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
```

### Horizontal Scaling

```bash
# Multiple app instances
docker-compose up -d --scale app=3

# Load balancer (nginx)
# Configure upstream block
```

### Database Optimization

```bash
# Increase shared buffers
# Edit postgresql.conf: shared_buffers = 2GB

# Increase work memory
# Edit postgresql.conf: work_mem = 64MB

# Vacuum analyze
docker-compose exec db psql -U mlcalc -c "VACUUM ANALYZE;"
```

---

## Updates

### Update Code

```bash
git pull origin main
```

### Rebuild Images

```bash
docker-compose build --no-cache
```

### Restart Services

```bash
docker-compose up -d
```

### Run Migrations

```bash
docker-compose exec app alembic upgrade head
```

---

## Rollback

### 1. Stop Services

```bash
docker-compose down
```

### 2. Restore Database

```bash
./restore.sh backups/db_YYYYMMDD_HHMMSS.sql.gz
```

### 3. Checkout Previous Version

```bash
git checkout <commit-hash>
```

### 4. Rebuild and Start

```bash
docker-compose build --no-cache
docker-compose up -d
```

---

## Support

### Logs

```bash
docker-compose logs -f > logs.txt
```

### Diagnostics

```bash
# System info
uname -a
docker --version
docker-compose --version

# Container info
docker-compose ps
docker inspect $(docker-compose ps -q app)

# Network info
docker network ls
docker network inspect mlcalc_mlcalc-network
```

### Contact

- **GitHub Issues**: https://github.com/bhadip/mlcalc/issues
- **Email**: support@prasanti.com
