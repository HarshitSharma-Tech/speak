import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app

@pytest.fixture(autouse=True)
def mock_external_ai_apis(monkeypatch):
    """
    Mock external AI APIs for unit tests per Section 9 requirement:
    'Mock external AI APIs in unit tests so tests do not require paid API calls.'
    """
    monkeypatch.setattr(settings, "NVIDIA_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_API_KEY", None)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

# In-memory SQLite engine for fast, isolated testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory database schema for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_pdf_bytes():
    """Generate a valid 2-page educational PDF for testing."""
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 7 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>\nendobj\n"
        b"5 0 obj\n<< /Length 205 >>\nstream\nBT\n/F1 14 Tf\n50 720 Td\n(Chapter 1: Foundational Database Systems. Relational database management systems use structured query language to maintain tabular data. ACID properties guarantee atomicity, consistency, isolation, and durability.) Tj\nET\nendstream\nendobj\n"
        b"6 0 obj\n<< /Length 205 >>\nstream\nBT\n/F1 14 Tf\n50 720 Td\n(Chapter 2: Vector Embeddings and Indexing. Vector databases store high-dimensional embeddings representing semantic meanings of texts. Cosine similarity measures the angle between vector representations.) Tj\nET\nendstream\nendobj\n"
        b"7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 8\n0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000234 00000 n \n"
        b"0000000353 00000 n \n"
        b"0000000613 00000 n \n"
        b"0000000873 00000 n \n"
        b"trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n944\n%%EOF\n"
    )
    return pdf_content
