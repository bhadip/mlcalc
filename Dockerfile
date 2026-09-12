# ──────────────────────────────────────────────────────────────────────────────
# MLCalc — Multi-stage Dockerfile
# Stage 1: Build React frontend (Node)
# Stage 2: Python FastAPI backend serving static frontend on port 8504
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Frontend Build ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production=false

# Copy source and build config files
COPY tsconfig.json vite.config.js ./
COPY src ./src
COPY index.html ./
RUN npm run build

# ─── Stage 2: Python Backend ──────────────────────────────────────────────────
FROM python:3.12-slim AS production

# System dependencies for OCR and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
# RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu

# Copy backend code
COPY backend/ ./

# Copy frontend build into /static
COPY --from=frontend-builder /app/frontend/dist /app/static

# Create upload directory
RUN mkdir -p /app/uploads/screenshots

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8504

# Expose port
EXPOSE 8504

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8504/api/health').raise_for_status()" || exit 1

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8504", "--workers", "2"]
