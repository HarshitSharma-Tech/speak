import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.session import engine, Base
import app.models  # Ensure all models are registered
from app.routers import documents, courses, quizzes, sprints, interviews

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("learnsync")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    logger.info("Initializing relational database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
    yield
    logger.info("Shutting down LearnSync AI backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="LearnSync AI — Production-ready backend for AI-powered study companion, exam sprint planner, and mock mentor.",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local and cloud deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to provide clean, informative error responses without raw stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred while processing your request. Please try again.",
            "path": request.url.path
        }
    )


from pydantic import BaseModel
from typing import Optional
from app.services.llm_service import llm_service


class ApiKeysUpdateRequest(BaseModel):
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    nvidia_api_key: Optional[str] = None


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "nvidia_configured": bool(settings.NVIDIA_API_KEY),
        "nvidia_model": settings.NVIDIA_MODEL,
        "groq_configured": bool(settings.GROQ_API_KEY),
        "groq_model": settings.GROQ_MODEL,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
    }


@app.post("/health/keys", tags=["Health"])
@app.post(f"{settings.API_V1_STR}/health/keys", tags=["Health"])
def update_api_keys(payload: ApiKeysUpdateRequest):
    """Dynamically update AI provider keys at runtime without server restart."""
    if payload.groq_api_key is not None:
        settings.GROQ_API_KEY = payload.groq_api_key.strip() or None
    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip() or None
    if payload.nvidia_api_key is not None:
        settings.NVIDIA_API_KEY = payload.nvidia_api_key.strip() or None

    llm_service.refresh_clients()
    return health_check()


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to LearnSync AI API",
        "docs_url": "/docs",
        "health_url": "/health",
        "version": settings.VERSION
    }


# Mount feature routers
api_prefix = settings.API_V1_STR
app.include_router(documents.router, prefix=api_prefix)
app.include_router(courses.router, prefix=api_prefix)
app.include_router(quizzes.router, prefix=api_prefix)
app.include_router(sprints.router, prefix=api_prefix)
app.include_router(interviews.router, prefix=api_prefix)
