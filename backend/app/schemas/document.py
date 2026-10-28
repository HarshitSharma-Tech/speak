from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    chunk_index: int
    page_number: int
    content: str
    token_count: int
    metadata_json: Optional[str] = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    page_count: int
    chunk_count: int
    chroma_collection_name: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime


class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []


class UploadValidationResponse(BaseModel):
    valid: bool
    filename: str
    file_size: int
    message: str
