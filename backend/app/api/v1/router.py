"""
API v1 router — aggregates all route modules.
"""

from fastapi import APIRouter

from app.api.v1.routes import admin, auth, instruments, screenshots, simulations

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(screenshots.router)
router.include_router(simulations.router)
router.include_router(instruments.router)
router.include_router(admin.router)
