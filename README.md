# MLCalc - Margin Level Calculator

A comprehensive trading margin level calculator with OCR screenshot analysis, real-time calculations, and multi-user support.

## 📁 Project Structure

```
mlcalc/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/routes/     # API endpoints
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   │   ├── calculation_service.py  # Core ML% formulas
│   │   │   ├── ocr_service.py         # Screenshot OCR
│   │   │   └── audit_service.py       # Audit logging
│   │   ├── auth/              # OAuth & JWT
│   │   ├── config/            # Configuration
│   │   └── main.py            # FastAPI app
│   ├── alembic/               # Database migrations
│   ├── seeds/                 # Initial data
│   ├── scripts/               # Utility scripts
│   └── tests/                 # Pytest tests
│
├── frontend/                   # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Simulation/    # Calculator UI
│   │   │   │   ├── SimulationPanel.tsx
│   │   │   │   ├── StopOutAlert.tsx      # ⚠️ Critical alert
│   │   │   │   └── MarginLevelGauge.tsx
│   │   │   ├── Screenshot/    # OCR upload & viewer
│   │   │   ├── Admin/         # Admin panel
│   │   │   └── Layout/        # Header with branding
│   │   ├── api/               # API client
│   │   ├── hooks/             # React hooks
│   │   └── types/             # TypeScript types
│   └── tests/e2e/             # Playwright E2E tests
│
├── Dockerfile                  # Multi-stage build
├── docker-compose.yml          # App + DB + Cloudflare tunnel
├── deploy.sh                   # Deployment automation
├── backup.sh                   # Database & uploads backup
├── restore.sh                  # Restore from backup
└── .env.example                # Environment variables
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Cloudflare account (for tunnel)
- Google/Microsoft OAuth credentials

### 1. Clone & Configure

```bash
git clone https://github.com/bhadip/mlcalc.git
cd mlcalc

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### 2. Deploy

```bash
chmod +x deploy.sh backup.sh restore.sh
./deploy.sh
```

The application will be available at:
- **Local**: http://localhost:8504
- **Production**: https://mlcalc.prasanti.com (via Cloudflare tunnel)

### 3. Access API Documentation

- Swagger UI: http://localhost:8504/api/docs
- ReDoc: http://localhost:8504/api/redoc

## 🧮 Core Formulas

### 1. Margin Level %
```
ML% = (Equity / Used_Margin) × 100
```

### 2. Equity
```
Equity = Balance + Credit + Σ(Floating PL)

Floating PL = ΔPrice × Volume × Point_Value
Point_Value = Tick_Value / Tick_Size
```

**Examples:**
- EURUSD: Point_Value = 1.0 / 0.00001 = 100,000
  - 25-pip move (0.0025) on 1 lot = $250
- XAUUSD: Point_Value = 1.0 / 0.01 = 100
  - $10 move on 1 lot = $1,000

### 3. Liquidation Price (ML% = 100%)
```
At liquidation: Equity = Used_Margin
→ Balance + Credit + Floating_PL = Used_Margin

For LONG:
  P_liq = P_open - (Used_Margin - Balance - Credit) / (Volume × Point_Value)

For SHORT:
  P_liq = P_open + (Used_Margin - Balance - Credit) / (Volume × Point_Value)
```

### 4. Required Balance at Target Price
```
Balance_required = Used_Margin - Credit - PL(target_price)
Additional_deposit = max(0, Balance_required - Current_Balance)
```

### ⚠️ STOPPED OUT Rule
```
IF Balance == Equity → STOPPED OUT
  → Credit exhausted, all positions liquidated
  → UI locks immediately
  → No further calculations possible
```

## 🎯 Key Features

### Backend
- ✅ **Multi-instrument support**: Forex, Metals, Indices, Crypto, Commodities
- ✅ **OCR screenshot analysis**: EasyOCR + Tesseract for MT5 terminal screenshots
- ✅ **Real-time calculations**: Liquidation price, required balance, margin level
- ✅ **OAuth authentication**: Google & Microsoft
- ✅ **Role-based access**: Visitor → User → Admin
- ✅ **Audit logging**: All actions tracked
- ✅ **Soft deletes**: Data preservation with recovery
- ✅ **Configurable branding**: Dynamic logo, colors, app name

### Frontend
- ✅ **STOPPED OUT alert**: Full-screen red modal when triggered
- ✅ **Margin level gauge**: Visual indicator with color zones
- ✅ **Screenshot upload**: Drag-and-drop with OCR processing
- ✅ **Editable data viewer**: Manual OCR corrections
- ✅ **Admin panel**: User approval, role management
- ✅ **Dynamic branding**: Loaded from backend config

### Infrastructure
- ✅ **Docker multi-stage build**: Optimized production image
- ✅ **Cloudflare tunnel**: Secure access without exposing ports
- ✅ **PostgreSQL**: Reliable data storage
- ✅ **Automated backups**: Database + uploads
- ✅ **Health checks**: Automatic monitoring

## 📊 Instrument Configuration

Default instruments in `backend/seeds/instruments.json`:

| Symbol | Category | Contract Size | Tick Size | Tick Value | Point Value |
|--------|----------|---------------|-----------|------------|-------------|
| EURUSD | Forex | 100,000 | 0.00001 | $1.00 | 100,000 |
| XAUUSD | Metals | 100 | 0.01 | $1.00 | 100 |
| XAGUSD | Metals | 5,000 | 0.001 | $5.00 | 5,000 |
| NDX | Indices | 1 | 0.01 | $0.20 | 20 |
| BTCUSD | Crypto | 1 | 0.01 | $0.01 | 1 |
| USOIL | Commodities | 1,000 | 0.01 | $10.00 | 1,000 |

Admins can add/edit instruments via the Admin panel.

## 🔐 Security

- **JWT tokens**: Access + refresh tokens with expiration
- **OAuth 2.0**: Google & Microsoft authentication
- **Role-based access**: Visitor, User, Admin
- **Audit logging**: All mutations tracked
- **Soft deletes**: Data preservation
- **Cloudflare tunnel**: No exposed ports
- **Environment variables**: Secrets never in code

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/test_calculations.py -v
```

Tests cover:
- Floating P/L calculations (Long/Short)
- Equity calculations
- Margin Level %
- STOPPED OUT detection
- Liquidation price
- Required balance

### Frontend E2E Tests
```bash
cd frontend
npm run test:e2e
```

Tests cover:
- Login flow
- Calculator interactions
- STOPPED OUT behavior

## 📦 Backup & Restore

### Backup
```bash
./backup.sh
```
Creates:
- `backups/db_YYYYMMDD_HHMMSS.sql.gz`
- `backups/uploads_YYYYMMDD_HHMMSS.tar.gz`

### Restore
```bash
./restore.sh backups/db_20260115_120000.sql.gz
```

## 🌐 Deployment Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Set `SECRET_KEY` (use `openssl rand -hex 32`)
- [ ] Set `JWT_SECRET` (use `openssl rand -hex 32`)
- [ ] Set `DB_PASSWORD` (strong password)
- [ ] Configure Google OAuth credentials
- [ ] Configure Microsoft OAuth credentials
- [ ] Set `CLOUDFLARE_TUNNEL_TOKEN`
- [ ] Run `./deploy.sh`
- [ ] Verify health check: `curl http://localhost:8504/api/health`
- [ ] Access admin panel and approve first user
- [ ] Seed instruments (automatic on first deploy)

## 📝 API Endpoints

### Authentication
- `GET /api/v1/auth/google/login` - Initiate Google OAuth
- `GET /api/v1/auth/google/callback` - Google OAuth callback
- `GET /api/v1/auth/microsoft/login` - Initiate Microsoft OAuth
- `GET /api/v1/auth/microsoft/callback` - Microsoft OAuth callback
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

### Screenshots
- `POST /api/v1/screenshots/upload` - Upload screenshot
- `POST /api/v1/screenshots/{id}/process` - Trigger OCR
- `GET /api/v1/screenshots/` - List screenshots
- `GET /api/v1/screenshots/{id}` - Get screenshot
- `DELETE /api/v1/screenshots/{id}` - Soft delete
- `POST /api/v1/screenshots/{id}/share` - Share screenshot

### Simulations
- `POST /api/v1/simulations/liquidation-price` - Calculate liquidation price
- `POST /api/v1/simulations/balance-adjustment` - Calculate required balance
- `GET /api/v1/simulations/history` - Get simulation history

### Instruments
- `GET /api/v1/instruments/` - List instruments
- `GET /api/v1/instruments/{symbol}` - Get instrument
- `POST /api/v1/instruments/` - Create instrument (admin)
- `PATCH /api/v1/instruments/{symbol}` - Update instrument (admin)
- `DELETE /api/v1/instruments/{symbol}` - Deactivate instrument (admin)

### Admin
- `GET /api/v1/admin/users` - List users
- `PATCH /api/v1/admin/users/{id}` - Update user
- `POST /api/v1/admin/users/{id}/undelete` - Restore user
- `GET /api/v1/admin/audit-logs` - View audit logs
- `GET /api/v1/admin/config/branding` - Get branding config

## 🛠️ Development

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📞 Support

For issues and questions, please open a GitHub issue.

---

**Built with** ❤️ using FastAPI, React, TypeScript, Tailwind CSS, PostgreSQL, and Docker.
