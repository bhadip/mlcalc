# MLCalc Architecture

## System Overview

MLCalc is a full-stack web application for calculating margin levels and liquidation prices in forex/metals trading.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0 (async)
- **OCR**: EasyOCR + Tesseract
- **Authentication**: OAuth 2.0 (Google/Microsoft) + JWT

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **State Management**: React hooks + Context

### Infrastructure
- **Containerization**: Docker (multi-stage build)
- **Orchestration**: Docker Compose
- **Reverse Proxy**: Nginx (optional)
- **Tunnel**: Cloudflare Tunnel (port 8504)

## Database Schema

### Core Tables

1. **users** - User accounts with OAuth integration
2. **instruments** - Trading instrument configurations (contract sizes, tick values)
3. **screenshots** - Uploaded MT5 terminal screenshots with OCR data (JSONB)
4. **simulations** - Calculation history and results
5. **audit_logs** - System audit trail

### Key Relationships

- Users → Screenshots (one-to-many)
- Users → Simulations (one-to-many)
- Instruments → Screenshots (referenced in OCR data)

## API Architecture

### RESTful Endpoints

```
/api/v1/
├── auth/           # OAuth flows, JWT tokens
├── screenshots/    # Upload, OCR processing, sharing
├── simulations/    # Liquidation price, balance adjustment
├── instruments/    # CRUD for instrument configs
└── admin/          # User management, audit logs
```

### Key Features

- **JWT Authentication**: Access + refresh tokens
- **Role-Based Access**: Visitor → User → Admin
- **Soft Deletes**: All entities support soft deletion
- **Audit Logging**: All mutations tracked

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── Calculator/      # Main calculator UI
│   │   ├── Calculator.tsx
│   │   ├── MarginGauge.tsx
│   │   └── StopOutAlert.tsx
│   └── ScreenshotUpload/ # Drag-drop OCR interface
├── api/                 # Axios client
├── hooks/               # Custom React hooks
└── types/               # TypeScript interfaces
```

### State Management

- **Local State**: React useState/useEffect
- **API State**: Axios + async/await
- **Auth State**: JWT tokens in localStorage

## Security Model

### Authentication Flow

1. User initiates OAuth (Google/Microsoft)
2. Backend exchanges code for tokens
3. JWT issued (access + refresh)
4. Frontend stores tokens in localStorage
5. All API requests include Bearer token

### Authorization

- **Visitor**: Read-only access to calculator
- **User**: Can save calculations, upload screenshots
- **Admin**: Full system access, user management

### Data Protection

- Passwords: Never stored (OAuth only)
- JWT: HttpOnly cookies (optional), short expiry
- CORS: Configurable allowed origins
- Rate Limiting: Per-IP and per-user limits

## Deployment Architecture

### Docker Services

1. **app** - FastAPI + React (port 8504)
2. **db** - PostgreSQL 15
3. **cloudflared** - Cloudflare tunnel (optional)

### Network Flow

```
Internet → Cloudflare → Docker (8504) → FastAPI
                                      ↓
                                  PostgreSQL
```

### Volume Mounts

- `/app/static` - React build output
- `/app/uploads` - Screenshot storage
- `postgres_data` - Database persistence

## Performance Considerations

### Backend

- **Async I/O**: All database operations async
- **Connection Pooling**: SQLAlchemy async engine
- **Caching**: Instrument configs cached in memory
- **OCR**: GPU-accelerated (optional), batch processing

### Frontend

- **Code Splitting**: Vite automatic chunking
- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Compressed screenshots
- **API Caching**: React Query (optional)

## Scalability

### Horizontal Scaling

- Stateless FastAPI workers (uvicorn)
- PostgreSQL read replicas (optional)
- Redis cache layer (optional)
- CDN for static assets (optional)

### Vertical Scaling

- Increase Docker resources
- PostgreSQL tuning
- OCR worker processes

## Monitoring & Logging

### Application Logs

- Structured JSON logging
- Log levels: DEBUG, INFO, WARNING, ERROR
- Request tracing with correlation IDs

### Metrics (Optional)

- Prometheus + Grafana
- API response times
- Database query performance
- OCR processing times

## Future Enhancements

1. **Real-time Price Feeds**: WebSocket integration
2. **Multi-Account Support**: Track multiple trading accounts
3. **Advanced Analytics**: P/L charts, risk metrics
4. **Mobile App**: React Native client
5. **Broker Integration**: Direct MT5 API connection
