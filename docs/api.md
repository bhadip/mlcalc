# MLCalc API Documentation

## Base URL

```
Production: https://mlcalc.prasanti.com/api/v1
Local: http://localhost:8504/api/v1
```

## Authentication

All endpoints (except health check) require JWT authentication.

### Request Header

```
Authorization: Bearer <access_token>
```

### Token Lifecycle

1. **Access Token**: Short-lived (30 minutes)
2. **Refresh Token**: Long-lived (7 days)
3. **Token Refresh**: POST `/auth/refresh`

---

## Authentication Endpoints

### Google OAuth

#### Initiate Login

```http
GET /auth/google/login
```

**Response:**
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state_token"
}
```

#### OAuth Callback

```http
GET /auth/google/callback?code=<code>&state=<state>
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "visitor",
    "is_approved": false
  }
}
```

### Microsoft OAuth

#### Initiate Login

```http
GET /auth/microsoft/login
```

**Response:** Same structure as Google

#### OAuth Callback

```http
GET /auth/microsoft/callback?code=<code>&state=<state>
```

**Response:** Same structure as Google

### Token Refresh

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Get Current User

```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user",
  "is_approved": true,
  "avatar_url": "https://..."
}
```

---

## Screenshot Endpoints

### Upload Screenshot

```http
POST /screenshots/upload
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

file: <image_file>
```

**Supported Formats:** JPEG, PNG, WebP  
**Max Size:** 10MB

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "filename": "screenshot.jpg",
  "file_size_bytes": 123456,
  "content_type": "image/jpeg",
  "ocr_status": "pending",
  "created_at": "2026-01-15T12:00:00Z",
  "updated_at": "2026-01-15T12:00:00Z"
}
```

### Process Screenshot (OCR)

```http
POST /screenshots/{screenshot_id}/process
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid",
  "ocr_status": "completed",
  "extracted_data": {
    "balance": 10000.00,
    "equity": 10250.00,
    "margin": 1080.00,
    "free_margin": 9170.00,
    "margin_level_percent": 949.07,
    "credit": 0.0,
    "positions": [
      {
        "symbol": "EURUSD",
        "type": "buy",
        "volume": 1.0,
        "open_price": 1.0850,
        "current_price": 1.0875,
        "profit": 250.00,
        "swap": 0.0,
        "commission": 0.0
      }
    ],
    "raw_ocr_text": "...",
    "confidence": 0.95,
    "validation_passed": true,
    "validation_errors": []
  }
}
```

### List Screenshots

```http
GET /screenshots?page=1&page_size=20&status=completed
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)
- `status`: Filter by OCR status (pending, processing, completed, failed)

**Response:**
```json
{
  "items": [...],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

### Get Screenshot

```http
GET /screenshots/{screenshot_id}
Authorization: Bearer <access_token>
```

**Response:** Full screenshot object with extracted_data

### Delete Screenshot (Soft Delete)

```http
DELETE /screenshots/{screenshot_id}
Authorization: Bearer <access_token>
```

**Response:** 204 No Content

### Share Screenshot

```http
POST /screenshots/{screenshot_id}/share
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_ids": ["uuid1", "uuid2"],
  "is_public": false
}
```

**Response:** Updated screenshot object with `shared_with` field

---

## Simulation Endpoints

### Calculate Liquidation Price

```http
POST /simulations/liquidation-price
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "balance": 10000.0,
  "credit": 0.0,
  "used_margin": 1000.0,
  "positions": [
    {
      "symbol": "EURUSD",
      "type": "buy",
      "volume": 1.0,
      "open_price": 1.0850,
      "current_price": 1.0875
    }
  ]
}
```

**Response:**
```json
{
  "is_stopped_out": false,
  "stopped_out_reason": null,
  "margin_level_percent": 949.07,
  "liquidation_price": 1.0765,
  "equity": 10250.0,
  "floating_pl": 250.0,
  "details": {
    "EURUSD": {
      "liquidation_price": 1.0765,
      "net_exposure": 100000.0,
      "current_pl": 250.0,
      "positions_count": 1
    }
  }
}
```

**STOPPED OUT Response:**
```json
{
  "is_stopped_out": true,
  "stopped_out_reason": "Balance equals Equity — account has been stopped out",
  "margin_level_percent": 100.0,
  "liquidation_price": null,
  "equity": 10000.0,
  "floating_pl": 0.0
}
```

### Calculate Balance Adjustment

```http
POST /simulations/balance-adjustment
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "balance": 10000.0,
  "credit": 0.0,
  "used_margin": 1000.0,
  "target_price": 1.0700,
  "positions": [
    {
      "symbol": "EURUSD",
      "type": "buy",
      "volume": 1.0,
      "open_price": 1.0850,
      "current_price": 1.0875
    }
  ]
}
```

**Response:**
```json
{
  "is_stopped_out": false,
  "stopped_out_reason": null,
  "balance_required": 2500.0,
  "additional_deposit": 0.0,
  "floating_pl_at_target": -1500.0,
  "equity_at_target": 8500.0,
  "margin_level_at_target": 850.0,
  "details": {
    "EURUSD": {
      "pl_at_target": -1500.0,
      "positions": [...]
    }
  }
}
```

### Get Simulation History

```http
GET /simulations/history?sim_type=liquidation_price&limit=50
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `sim_type`: Filter by type (liquidation_price, balance_adjustment)
- `limit`: Max results (default: 50, max: 200)

**Response:**
```json
[
  {
    "id": "uuid",
    "sim_type": "liquidation_price",
    "balance": 10000.0,
    "credit": 0.0,
    "used_margin": 1000.0,
    "result_value": 1.0765,
    "is_stopped_out": false,
    "margin_level_percent": 949.07,
    "label": "EURUSD scenario",
    "created_at": "2026-01-15T12:00:00Z"
  }
]
```

---

## Instrument Endpoints

### List Instruments

```http
GET /instruments?category=forex&active_only=true
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `category`: Filter by category (forex, metals, indices, crypto, commodities)
- `active_only`: Only return active instruments (default: true)

**Response:**
```json
[
  {
    "id": "uuid",
    "symbol": "EURUSD",
    "name": "Euro / US Dollar",
    "category": "forex",
    "contract_size": 100000.0,
    "tick_size": 0.00001,
    "tick_value": 1.0,
    "margin_currency": "USD",
    "leverage": 100,
    "stop_out_percent": null,
    "description": "Standard forex pair. 1 lot = 100,000 units.",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

### Get Instrument

```http
GET /instruments/{symbol}
Authorization: Bearer <access_token>
```

**Response:** Full instrument object

### Create Instrument (Admin Only)

```http
POST /instruments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "symbol": "XAUUSD",
  "name": "Gold Spot / US Dollar",
  "category": "metals",
  "contract_size": 100.0,
  "tick_size": 0.01,
  "tick_value": 1.0,
  "margin_currency": "USD",
  "leverage": 100,
  "description": "Gold. 1 lot = 100 oz."
}
```

**Response:** Created instrument object

### Update Instrument (Admin Only)

```http
PATCH /instruments/{symbol}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "contract_size": 100.0,
  "leverage": 50
}
```

**Response:** Updated instrument object

### Deactivate Instrument (Admin Only)

```http
DELETE /instruments/{symbol}
Authorization: Bearer <access_token>
```

**Response:** 204 No Content

---

## Admin Endpoints

### List Users

```http
GET /admin/users?page=1&page_size=20&role=user&include_deleted=false
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number
- `page_size`: Items per page
- `role`: Filter by role (visitor, user, admin)
- `include_deleted`: Include soft-deleted users

**Response:**
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "is_approved": true,
    "avatar_url": "https://...",
    "created_at": "2026-01-01T00:00:00Z",
    "is_deleted": false,
    "deleted_at": null
  }
]
```

### Update User

```http
PATCH /admin/users/{user_id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "admin",
  "is_approved": true
}
```

**Response:** Updated user object

### Undelete User

```http
POST /admin/users/{user_id}/undelete
Authorization: Bearer <access_token>
```

**Response:** Restored user object

### List Audit Logs

```http
GET /admin/audit-logs?page=1&page_size=50&action=user.login&user_id=uuid
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number
- `page_size`: Items per page
- `action`: Filter by action (partial match)
- `user_id`: Filter by user

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "action": "user.login",
      "resource_type": "user",
      "resource_id": "uuid",
      "details": {"email": "user@example.com"},
      "ip_address": "192.168.1.1",
      "created_at": "2026-01-15T12:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 50
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Invalid instrument symbol"
}
```

### 401 Unauthorized

```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden

```json
{
  "detail": "Requires admin role or higher"
}
```

### 404 Not Found

```json
{
  "detail": "Screenshot not found"
}
```

### 409 Conflict

```json
{
  "detail": "Instrument 'EURUSD' already exists"
}
```

### 413 Payload Too Large

```json
{
  "detail": "File too large. Max: 10MB"
}
```

### 422 Validation Error

```json
{
  "detail": [
    {
      "loc": ["body", "balance"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    }
  ]
}
```

### 500 Internal Server Error

```json
{
  "detail": "OCR processing failed"
}
```

---

## Rate Limiting

### Limits

- **Anonymous**: 10 calculations per hour
- **Authenticated**: 100 calculations per hour
- **Admin**: Unlimited

### Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642291200
```

---

## CORS Configuration

### Allowed Origins

```python
ALLOWED_ORIGINS=https://mlcalc.prasanti.com,http://localhost:3000
```

### Allowed Methods

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Allowed Headers

```
Authorization, Content-Type, Accept
```

---

## API Documentation (Auto-generated)

### Swagger UI

```
http://localhost:8504/api/docs
```

### ReDoc

```
http://localhost:8504/api/redoc
```

### OpenAPI JSON

```
http://localhost:8504/api/openapi.json
```
