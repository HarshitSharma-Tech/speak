import io
import re
from typing import List, Dict, Any, Tuple

# Try importing PyMuPDF (fitz)
fitz_available = False
try:
    import fitz
    fitz_available = True
except Exception:
    fitz_available = False

try:
    import pypdf
except ImportError:
    pypdf = None


class PDFService:
    @staticmethod
    def inspect_and_extract(file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extract text from PDF using PyMuPDF (or pure-python pypdf fallback)
        and validate document readability, encryption, and page integrity.
        """
        if fitz_available:
            try:
                return PDFService._extract_with_fitz(file_bytes)
            except Exception:
                pass

        # Resilient fallback with pypdf
        if pypdf is not None:
            return PDFService._extract_with_pypdf(file_bytes)

        return {
            "readable": False,
            "error": "No available PDF parser engine installed.",
            "page_count": 0,
            "pages": []
        }

    @staticmethod
    def _extract_with_fitz(file_bytes: bytes) -> Dict[str, Any]:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        if doc.is_encrypted:
            doc.close()
            return {
                "readable": False,
                "error": "PDF document is encrypted or password-protected.",
                "page_count": 0,
                "pages": []
            }

        page_count = len(doc)
        if page_count == 0:
            doc.close()
            return {
                "readable": False,
                "error": "PDF document has no pages.",
                "page_count": 0,
                "pages": []
            }

        pages_data = []
        total_text_length = 0

        for page_idx in range(page_count):
            page = doc[page_idx]
            text = page.get_text("text")
            clean_text = re.sub(r'\s+', ' ', text).strip()
            total_text_length += len(clean_text)
            pages_data.append({
                "page_number": page_idx + 1,
                "text": clean_text
            })

        doc.close()

        if total_text_length < 30 and page_count > 0:
            return {
                "readable": False,
                "error": "Document contains insufficient extractable text. It may be an image-only scan or empty.",
                "page_count": page_count,
                "pages": pages_data
            }

        return {
            "readable": True,
            "error": None,
            "page_count": page_count,
            "total_characters": total_text_length,
            "pages": pages_data
        }

    @staticmethod
    def _extract_with_pypdf(file_bytes: bytes) -> Dict[str, Any]:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        except Exception as e:
            return {
                "readable": False,
                "error": f"Failed to parse PDF: {str(e)}",
                "page_count": 0,
                "pages": []
            }

        if reader.is_encrypted:
            return {
                "readable": False,
                "error": "PDF document is encrypted or password-protected.",
                "page_count": 0,
                "pages": []
            }

        page_count = len(reader.pages)
        if page_count == 0:
            return {
                "readable": False,
                "error": "PDF document has no pages.",
                "page_count": 0,
                "pages": []
            }

        pages_data = []
        total_text_length = 0

        for page_idx in range(page_count):
            page = reader.pages[page_idx]
            text = page.extract_text() or ""
            clean_text = re.sub(r'\s+', ' ', text).strip()
            total_text_length += len(clean_text)
            pages_data.append({
                "page_number": page_idx + 1,
                "text": clean_text
            })

        if total_text_length < 30 and page_count > 0:
            return {
                "readable": False,
                "error": "Document contains insufficient extractable text. It may be an image-only scan or empty.",
                "page_count": page_count,
                "pages": pages_data
            }

        return {
            "readable": True,
            "error": None,
            "page_count": page_count,
            "total_characters": total_text_length,
            "pages": pages_data
        }

        # If average text per page is under 15 characters, it might be an image-only / unreadable scan
        if total_text_length < 30 and page_count > 0:
            return {
                "readable": False,
                "error": "Document contains insufficient extractable text. It may be an image-only scan or empty.",
                "page_count": page_count,
                "pages": pages_data
            }

        return {
            "readable": True,
            "error": None,
            "page_count": page_count,
            "total_characters": total_text_length,
            "pages": pages_data
        }

    @staticmethod
    def recursive_split_text(
        text: str,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
        separators: List[str] = None
    ) -> List[str]:
        """
        Recursive character text splitting to maintain semantic coherence.
        Splits by double newlines, single newlines, periods, spaces.
        """
        if separators is None:
            separators = ["\n\n", "\n", ". ", "; ", ", ", " "]

        if len(text) <= chunk_size:
            return [text.strip()] if text.strip() else []

        # Find best separator
        separator = ""
        for sep in separators:
            if sep in text:
                separator = sep
                break

        splits = text.split(separator) if separator else list(text)
        chunks = []
        current_chunk = ""

        for part in splits:
            candidate = f"{current_chunk}{separator}{part}" if current_chunk else part
            if len(candidate) <= chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                # If a single part is larger than chunk_size, recursively split it
                if len(part) > chunk_size and len(separators) > 1:
                    sub_chunks = PDFService.recursive_split_text(
                        part,
                        chunk_size=chunk_size,
                        chunk_overlap=chunk_overlap,
                        separators=separators[1:]
                    )
                    chunks.extend(sub_chunks)
                    current_chunk = ""
                else:
                    # Apply overlap from the tail of previous chunk
                    if chunks and chunk_overlap > 0:
                        overlap_text = chunks[-1][-chunk_overlap:]
                        current_chunk = f"{overlap_text} {part}".strip()
                    else:
                        current_chunk = part

        if current_chunk and current_chunk.strip():
            chunks.append(current_chunk.strip())

        return [c for c in chunks if len(c) > 20]

    @classmethod
    def chunk_document_pages(
        cls,
        pages_data: List[Dict[str, Any]],
        chunk_size: int = 800,
        chunk_overlap: int = 150
    ) -> List[Dict[str, Any]]:
        """
        Generate grounded chunks from extracted PDF pages with page numbers and indices.
        """
        chunks_result = []
        chunk_counter = 0

        for page in pages_data:
            page_num = page["page_number"]
            page_text = page["text"]
            if not page_text:
                continue

            raw_chunks = cls.recursive_split_text(
                page_text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )

            for chunk_content in raw_chunks:
                chunk_counter += 1
                approx_tokens = max(1, len(chunk_content.split()))
                chunks_result.append({
                    "chunk_index": chunk_counter,
                    "page_number": page_num,
                    "content": chunk_content,
                    "token_count": approx_tokens
                })

        return chunks_result
