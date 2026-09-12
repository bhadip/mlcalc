"""
MLCalc — FastAPI Application Entry Point.

Margin Level Calculator backend with OCR, OAuth, and simulation capabilities.
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

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


# ─── Static Files (Frontend) ───────────────────────────────────────────────────

# Mount static files AFTER all API routes
static_dir = Path("/app/static")
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="static-assets")
    
    # Catch-all route for SPA - serves index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA for all non-API routes."""
        # If requesting a static file that exists, serve it
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        
        # Otherwise, serve index.html for client-side routing
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        # Fallback to API info if frontend not built
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
            "health": "/api/health",
            "message": "Frontend not available. API is running.",
        }
else:
    # Fallback if static directory doesn't exist (development mode)
    @app.get("/")
    async def root():
        """Root endpoint — API info."""
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
            "health": "/api/health",
            "message": "Frontend not built. Run 'npm run build' in frontend/ directory.",
        }
