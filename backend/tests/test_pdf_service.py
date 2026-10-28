import pytest
from app.services.pdf_service import PDFService
from app.core.security import validate_file_metadata


def test_validate_file_metadata_valid(sample_pdf_bytes):
    is_valid, err = validate_file_metadata("textbook.pdf", sample_pdf_bytes, max_mb=50)
    assert is_valid is True
    assert err == ""


def test_validate_file_metadata_invalid_extension(sample_pdf_bytes):
    is_valid, err = validate_file_metadata("textbook.exe", sample_pdf_bytes)
    assert is_valid is False
    assert "Only PDF documents" in err


def test_validate_file_metadata_empty():
    is_valid, err = validate_file_metadata("empty.pdf", b"")
    assert is_valid is False
    assert "empty" in err


def test_validate_file_metadata_corrupt_header():
    is_valid, err = validate_file_metadata("corrupt.pdf", b"NOT_A_PDF_STREAM")
    assert is_valid is False
    assert "%PDF signature" in err


def test_pdf_extraction_and_chunking(sample_pdf_bytes):
    extraction = PDFService.inspect_and_extract(sample_pdf_bytes, "test.pdf")
    assert extraction["readable"] is True
    assert extraction["page_count"] == 2
    assert len(extraction["pages"]) == 2

    # Verify chunking
    chunks = PDFService.chunk_document_pages(extraction["pages"], chunk_size=300, chunk_overlap=50)
    assert len(chunks) >= 2
    for c in chunks:
        assert "chunk_index" in c
        assert "page_number" in c
        assert "content" in c
        assert len(c["content"]) > 20
        assert c["token_count"] > 0


def test_recursive_text_split():
    long_text = "Paragraph one with detailed content. " * 20
    chunks = PDFService.recursive_split_text(long_text, chunk_size=200, chunk_overlap=30)
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= 250
