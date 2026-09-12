"""
MLCalc — FastAPI Application Entry Point.

Margin Level Calculator backend with OCR, OAuth, and simulation capabilities.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.config import settings

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup and shutdown events."""
    logger.info(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"   Database: {settings.DATABASE_URL.split('@')[-1]}")
    logger.info(f"   OCR Engine: {settings.OCR_ENGINE}")
    yield
    logger.info("👋 Shutting down MLCalc backend")


# ─── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Margin Level Calculator — Calculate liquidation prices, "
                "required balance adjustments, and extract data from trading screenshots.",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# ─── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


# ─── Routes ────────────────────────────────────────────────────────────────────

app.include_router(v1_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/")
async def root():
    """Root endpoint — API info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
        "health": "/api/health",
    }

from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

# Serve the React frontend built by Docker
static_dir = "/app/static" # This matches the destination in your Dockerfile
if os.path.exists(static_dir):
    # Mount the static assets (JS/CSS files)
    app.mount("/assets", StaticFiles(directory=static_dir), name="static")

    # Serve the main index.html at the root URL
    @app.get("/", response_class=HTMLResponse)
    async def serve_frontend():
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            with open(index_path, "r") as f:
                return f.read()
        return HTMLResponse(content="<h1>Frontend not found. Please rebuild Docker.</h1>", status_code=404)