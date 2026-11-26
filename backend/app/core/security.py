import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from typing import Optional, Tuple
from app.core.config import settings

_CACHED_AUTH_SECRET: Optional[bytes] = None
_AUTH_SECRET_PATH = "./.auth_secret"


def get_auth_secret() -> bytes:
    """Return signing secret from config or persistent local ./.auth_secret file."""
    global _CACHED_AUTH_SECRET
    if settings.AUTH_SECRET_KEY:
        return settings.AUTH_SECRET_KEY.encode("utf-8")
    if _CACHED_AUTH_SECRET is not None:
        return _CACHED_AUTH_SECRET

    if os.path.exists(_AUTH_SECRET_PATH):
        with open(_AUTH_SECRET_PATH, "r", encoding="utf-8") as f:
            secret_text = f.read().strip()
        if secret_text:
            _CACHED_AUTH_SECRET = secret_text.encode("utf-8")
            return _CACHED_AUTH_SECRET

    generated = secrets.token_hex(32)
    with open(_AUTH_SECRET_PATH, "w", encoding="utf-8") as f:
        f.write(generated)
    _CACHED_AUTH_SECRET = generated.encode("utf-8")
    return _CACHED_AUTH_SECRET


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random 16-byte hex salt."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 200_000).hex()
    return f"pbkdf2_sha256$200000${salt}${dk}"


def verify_password(password: str, stored: str) -> bool:
    """Verify a password against a stored pbkdf2_sha256 hash in constant time."""
    try:
        algo, iter_str, salt, expected_hex = stored.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_str)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations).hex()
        return hmac.compare_digest(dk, expected_hex)
    except Exception:
        return False


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def create_access_token(user_id: str) -> str:
    """Create a signed compact bearer token with expiration."""
    payload = {
        "sub": user_id,
        "exp": int(time.time()) + settings.AUTH_TOKEN_TTL_HOURS * 3600,
    }
    body = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = _b64url_encode(hmac.new(get_auth_secret(), body.encode("ascii"), hashlib.sha256).digest())
    return f"{body}.{sig}"


def decode_access_token(token: str) -> Optional[str]:
    """Verify signature and expiration of a bearer token and return user_id."""
    try:
        if not token or "." not in token:
            return None
        body, sig = token.split(".", 1)
        expected_sig = _b64url_encode(
            hmac.new(get_auth_secret(), body.encode("ascii"), hashlib.sha256).digest()
        )
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(_b64url_decode(body).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        sub = payload.get("sub")
        return str(sub) if sub else None
    except Exception:
        return None


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
