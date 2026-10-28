from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SprintTopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str
    observed_frequency: int
    similarity_confidence: float
    priority_rank: int
    priority_level: str
    calculation_notes: Optional[str] = None
    source_chunk_ids: List[str] = []


class SprintTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    day_number: int
    scheduled_date: datetime
    task_type: str
    title: str
    description: Optional[str] = None
    estimated_minutes: int
    is_completed: bool
    completed_at: Optional[datetime] = None


class SprintCreateRequest(BaseModel):
    title: str
    textbook_document_id: str
    pyq_document_id: Optional[str] = None
    exam_date: datetime
    daily_study_hours: float = Field(default=2.5, ge=0.5, le=12.0)
    preferences: Optional[dict] = Field(default_factory=dict)


class SprintRegenerateRequest(BaseModel):
    exam_date: Optional[datetime] = None
    daily_study_hours: Optional[float] = Field(default=None, ge=0.5, le=12.0)
    preferences: Optional[dict] = None


class SprintResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    textbook_document_id: str
    pyq_document_id: Optional[str] = None
    exam_date: datetime
    daily_study_hours: float
    status: str
    created_at: datetime
    topics: List[SprintTopicResponse] = []
    tasks: List[SprintTaskResponse] = []
    total_days: int = 0
    completed_tasks_count: int = 0
    progress_percentage: float = 0.0


class TaskUpdateStatusRequest(BaseModel):
    is_completed: bool
