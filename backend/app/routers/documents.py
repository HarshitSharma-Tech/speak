import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.schemas.document import DocumentResponse, DocumentDetailResponse, UploadValidationResponse
from app.core.config import settings
from app.core.security import sanitize_filename, validate_file_metadata
from app.services.pdf_service import PDFService
from app.services.embedding_service import embedding_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    file_type: str = Form(default="textbook"),  # textbook, pyq, resume, other
    db: Session = Depends(get_db)
):
    """
    Upload and process educational PDF documents.
    Validates file format, extracts readable text via PyMuPDF, chunks content,
    and indexes embeddings in ChromaDB.
    """
    contents = await file.read()
    filename = sanitize_filename(file.filename or "uploaded_document.pdf")

    # Validate file format and size
    is_valid, error_msg = validate_file_metadata(filename, contents, max_mb=settings.MAX_UPLOAD_SIZE_MB)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)

    # Save to local uploads folder
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # Inspect and extract text with PyMuPDF
    extraction = PDFService.inspect_and_extract(contents, filename)
    if not extraction["readable"]:
        # Remove invalid physical file
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unreadable PDF document: {extraction.get('error', 'Unable to parse text.')}"
        )

    # Chunk the extracted pages
    chunks_data = PDFService.chunk_document_pages(extraction["pages"])
    collection_name = f"doc_{doc_id}"

    # Create document record
    document = Document(
        id=doc_id,
        filename=stored_filename,
        original_name=file.filename or filename,
        file_type=file_type,
        file_size=len(contents),
        page_count=extraction["page_count"],
        chunk_count=len(chunks_data),
        chroma_collection_name=collection_name,
        status="ready"
    )
    db.add(document)
    db.flush()

    # Create chunk records
    chunk_objs = []
    chroma_chunks = []
    for c in chunks_data:
        chunk_id = str(uuid.uuid4())
        chunk = DocumentChunk(
            id=chunk_id,
            document_id=doc_id,
            chunk_index=c["chunk_index"],
            page_number=c["page_number"],
            content=c["content"],
            token_count=c["token_count"]
        )
        chunk_objs.append(chunk)
        chroma_chunks.append({
            "id": chunk_id,
            "chunk_index": c["chunk_index"],
            "page_number": c["page_number"],
            "content": c["content"]
        })

    db.add_all(chunk_objs)
    db.commit()
    db.refresh(document)

    # Index into ChromaDB vector store
    try:
        embedding_service.add_chunks_to_vector_store(collection_name, chroma_chunks)
    except Exception as e:
        # ChromaDB indexing warning - relational chunks remain accessible
        pass

    return document


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    file_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieve all uploaded documents, optionally filtered by file type."""
    query = db.query(Document)
    if file_type:
        query = query.filter(Document.file_type == file_type)
    return query.order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve document details along with its individual grounded chunks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Cascade delete document, all its chunks, associated courses/sprints,
    physical file, and ChromaDB vector collection.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Remove physical file
    file_path = os.path.join(settings.UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    # Delete Chroma collection
    embedding_service.delete_collection(doc.chroma_collection_name)

    # Cascade delete in DB
    db.delete(doc)
    db.commit()

    return {"message": "Document and associated artifacts deleted successfully.", "id": document_id}
