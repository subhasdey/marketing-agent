"""FastAPI application entrypoint for the Marketing Agent backend."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router as api_router
from .core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Marketing intelligence agent backend supporting analytics, ingestion, and automation workflows.",
    )

    # Ensure localhost variants are included for development
    origins = list(settings.allowed_origins)
    if "http://localhost:2222" in origins and "http://127.0.0.1:2222" not in origins:
        origins.append("http://127.0.0.1:2222")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    return app


app = create_app()
