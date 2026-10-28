from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    module_order: int
    title: str
    summary: Optional[str] = None
    key_topics: List[str] = []
    learning_content: str
    source_chunk_ids: List[str] = []
    created_at: datetime


class CheatSheetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    course_id: str
    title: str
    summary: Optional[str] = None
    key_definitions: List[str] = []
    important_formulas: List[str] = []
    high_yield_revision_points: List[str] = []
    source_chunk_ids: List[str] = []
    created_at: datetime


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    title: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    modules: List[ModuleResponse] = []
    cheat_sheets: List[CheatSheetResponse] = []


class CourseCreateRequest(BaseModel):
    document_id: str
    title: Optional[str] = None
    target_modules: int = Field(default=4, ge=2, le=10)


class SourceReferenceResponse(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    content_snippet: str
    similarity_score: Optional[float] = None
