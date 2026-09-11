# MLCalc Backend

Margin Level Calculator — FastAPI backend with OCR, OAuth, and simulation capabilities.

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment file and configure
cp .env.example .env
# Edit .env with your settings

# 4. Start PostgreSQL (or use Docker)
docker run -d --name mlcalc-db \
  -e POSTGRES_DB=mlcalc \
  -e POSTGRES_USER=mlcalc \
  -e POSTGRES_PASSWORD=mlcalc \
  -p 5432:5432 \
  postgres:16-alpine

# 5. Run migrations
alembic upgrade head

# 6. Seed instruments
python -m scripts.seed_instruments

# 7. Start the server
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings from environment
│   ├── database.py          # SQLAlchemy async engine
│   ├── dependencies.py      # FastAPI dependencies (auth, roles)
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── base.py          # UUID, Timestamp, SoftDelete mixins
│   │   ├── user.py          # User with OAuth + roles
│   │   ├── instrument.py    # Contract sizes per symbol
│   │   ├── screenshot.py    # OCR-extracted data (JSONB)
│   │   ├── audit_log.py     # Audit trail
│   │   └── simulation_history.py
│   ├── schemas/             # Pydantic request/response models
│   ├── auth/                # OAuth + JWT security
│   │   ├── oauth.py         # Google/Microsoft providers
│   │   └── security.py      # JWT encode/decode
│   ├── services/            # Business logic
│   │   ├── calculation_service.py  # Core ML% formulas
│   │   ├── ocr_service.py         # EasyOCR/Tesseract
│   │   └── audit_service.py       # Audit logging
│   ├── api/v1/routes/       # API endpoints
│   │   ├── auth.py          # OAuth login/callback/refresh
│   │   ├── screenshots.py   # Upload, OCR, share
│   │   ├── simulations.py   # Liquidation price, balance adj
│   │   ├── instruments.py   # CRUD instrument configs
│   │   └── admin.py         # User mgmt, audit logs
│   └── config/
│       └── branding.json    # Configurable branding
├── alembic/                 # Database migrations
├── seeds/
│   └── instruments.json     # Default instrument data
├── scripts/
│   └── seed_instruments.py  # DB seeder
├── requirements.txt
├── alembic.ini
└── .env.example
```

## Core Formulas

### Margin Level %
```
ML% = (Equity / Used_Margin) × 100
```

### Equity
```
Equity = Balance + Credit + Σ(Floating PL)
PL_long  = (Current_Price − Open_Price) × Volume × Contract_Size × Point_Value
PL_short = (Open_Price − Current_Price) × Volume × Contract_Size × Point_Value
Point_Value = Tick_Value / Tick_Size
```

### Liquidation Price (ML% = 100%)
```
P_liq = P_open ± (Used_Margin − Balance − Credit) / (Volume × Contract_Size × Point_Value)
```

### Required Balance at Target Price
```
Balance_required = Used_Margin − Credit − PL(target_price)
```

### ⚠️ STOPPED OUT Rule
```
IF Balance == Equity → STOPPED OUT (no further calculation)
```

## Key Features

- **Multi-instrument support**: Contract sizes loaded from DB per symbol
- **OCR extraction**: EasyOCR + Tesseract for dark-themed MT5 screenshots
- **Validation**: Equity ≈ Balance + Credit + Σ(PL) consistency check
- **Soft deletes**: All user data uses soft-delete pattern
- **Audit logging**: Every significant action is logged
- **Role-based access**: Visitor → User → Admin hierarchy
- **STOPPED OUT detection**: Critical safety check before any calculation
