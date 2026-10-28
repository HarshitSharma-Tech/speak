import hashlib
import re
from typing import Tuple


def sanitize_filename(filename: str) -> str:
    """Sanitize uploaded filenames to prevent path traversal and unsafe characters."""
    clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', filename)
    return clean[:120]


def calculate_file_hash(content: bytes) -> str:
    """Return SHA256 hash for document content deduplication and integrity check."""
    return hashlib.sha256(content).hexdigest()


def validate_file_metadata(filename: str, content: bytes, max_mb: int = 50) -> Tuple[bool, str]:
    """Validate uploaded document file size, extension, and non-emptiness."""
    if not filename.lower().endswith(".pdf"):
        return False, "Only PDF documents (.pdf) are supported."
    
    if len(content) == 0:
        return False, "Uploaded file is empty (0 bytes)."
    
    max_bytes = max_mb * 1024 * 1024
    if len(content) > max_bytes:
        return False, f"File size exceeds maximum allowed limit of {max_mb} MB."
    
    # Check PDF magic bytes (%PDF)
    if not content.startswith(b"%PDF"):
        return False, "File does not appear to be a valid PDF document (missing %PDF signature)."
    
    return True, ""
