import datetime
import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.sprint import Sprint, SprintTopic, SprintTask, SprintRegenerationHistory
from app.schemas.sprint import (
    SprintResponse,
    SprintCreateRequest,
    SprintRegenerateRequest,
    SprintTopicResponse,
    SprintTaskResponse,
    TaskUpdateStatusRequest
)
from app.services.sprint_service import SprintService

router = APIRouter(prefix="/sprints", tags=["Sprints"])


@router.post("", response_model=SprintResponse, status_code=status.HTTP_201_CREATED)
def create_sprint_plan(
    request: SprintCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Create an intelligent exam preparation planner (Sprint Engine).
    Matches previous-year questions against textbook topics using cosine similarity,
    calculates topic frequency and confidence scores, and produces a day-by-day study schedule.
    """
    textbook = db.query(Document).filter(Document.id == request.textbook_document_id).first()
    if not textbook:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Textbook document not found.")

    textbook_chunks = db.query(DocumentChunk).filter(
        DocumentChunk.document_id == textbook.id
    ).order_by(DocumentChunk.chunk_index).all()

    if not textbook_chunks:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Textbook has no processed text chunks.")

    tb_chunk_dicts = [
        {"id": c.id, "chunk_index": c.chunk_index, "page_number": c.page_number, "content": c.content}
        for c in textbook_chunks
    ]

    pyq_text = ""
    if request.pyq_document_id:
        pyq_doc = db.query(Document).filter(Document.id == request.pyq_document_id).first()
        if pyq_doc:
            pyq_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == pyq_doc.id).all()
            pyq_text = "\n\n".join(c.content for c in pyq_chunks)

    # Extract & rank topics with frequency and similarity confidence
    ranked_topics = SprintService.extract_topics_from_pyq(
        pyq_text=pyq_text,
        textbook_chunks=tb_chunk_dicts
    )

    # Generate day-by-day tasks
    scheduled_tasks = SprintService.generate_day_by_day_schedule(
        exam_date=request.exam_date,
        daily_study_hours=request.daily_study_hours,
        topics=ranked_topics
    )

    # Save Sprint in DB
    sprint_id = str(uuid.uuid4())
    sprint = Sprint(
        id=sprint_id,
        title=request.title,
        textbook_document_id=textbook.id,
        pyq_document_id=request.pyq_document_id,
        exam_date=request.exam_date,
        daily_study_hours=request.daily_study_hours,
        preferences_json=json.dumps(request.preferences or {}),
        status="ready"
    )
    db.add(sprint)
    db.flush()

    # Save Topics
    topic_objs = []
    for t in ranked_topics:
        st = SprintTopic(
            id=str(uuid.uuid4()),
            sprint_id=sprint_id,
            name=t["name"],
            category=t.get("category", "General"),
            observed_frequency=t.get("observed_frequency", 1),
            similarity_confidence=t.get("similarity_confidence", 0.8),
            priority_rank=t.get("priority_rank", 1),
            priority_level=t.get("priority_level", "Medium"),
            calculation_notes=t.get("calculation_notes", ""),
            source_chunk_ids_json=json.dumps(t.get("source_chunk_ids", []))
        )
        topic_objs.append(st)
    db.add_all(topic_objs)

    # Save Tasks
    task_objs = []
    for tk in scheduled_tasks:
        stk = SprintTask(
            id=str(uuid.uuid4()),
            sprint_id=sprint_id,
            day_number=tk["day_number"],
            scheduled_date=tk["scheduled_date"],
            task_type=tk["task_type"],
            title=tk["title"],
            description=tk.get("description", ""),
            estimated_minutes=tk.get("estimated_minutes", 60),
            is_completed=False
        )
        task_objs.append(stk)
    db.add_all(task_objs)

    db.commit()
    db.refresh(sprint)

    return _format_sprint_response(sprint)


@router.get("", response_model=List[SprintResponse])
def list_sprints(db: Session = Depends(get_db)):
    """List all created exam sprints."""
    sprints = db.query(Sprint).order_by(Sprint.created_at.desc()).all()
    return [_format_sprint_response(s) for s in sprints]


@router.get("/{sprint_id}", response_model=SprintResponse)
def get_sprint(sprint_id: str, db: Session = Depends(get_db)):
    """Get sprint timeline, topics, and completion status."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")
    return _format_sprint_response(sprint)


@router.patch("/{sprint_id}/tasks/{task_id}", response_model=SprintTaskResponse)
def toggle_task_status(
    sprint_id: str,
    task_id: str,
    payload: TaskUpdateStatusRequest,
    db: Session = Depends(get_db)
):
    """Mark a sprint task as completed or incomplete."""
    task = db.query(SprintTask).filter(SprintTask.id == task_id, SprintTask.sprint_id == sprint_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this sprint.")

    task.is_completed = payload.is_completed
    task.completed_at = datetime.datetime.utcnow() if payload.is_completed else None
    db.commit()
    db.refresh(task)

    return _format_task_response(task)


@router.post("/{sprint_id}/regenerate", response_model=SprintResponse)
def regenerate_sprint_plan(
    sprint_id: str,
    payload: SprintRegenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Regenerate remaining study schedule without losing previously completed tasks!
    Adapts to newly adjusted exam dates or study hour allocations.
    """
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")

    if payload.exam_date:
        sprint.exam_date = payload.exam_date
    if payload.daily_study_hours:
        sprint.daily_study_hours = payload.daily_study_hours
    if payload.preferences:
        sprint.preferences_json = json.dumps(payload.preferences)

    # Format existing topics
    topics_data = [
        {
            "name": t.name,
            "category": t.category,
            "observed_frequency": t.observed_frequency,
            "similarity_confidence": t.similarity_confidence,
            "priority_level": t.priority_level,
            "priority_rank": t.priority_rank,
            "source_chunk_ids": json.loads(t.source_chunk_ids_json) if t.source_chunk_ids_json else []
        }
        for t in sprint.topics
    ]

    # Regenerate schedule preserving completed tasks
    new_tasks_data, preserved_count = SprintService.regenerate_schedule_preserving_progress(
        existing_tasks=sprint.tasks,
        new_exam_date=sprint.exam_date,
        new_daily_hours=sprint.daily_study_hours,
        topics=topics_data
    )

    # Delete incomplete tasks
    db.query(SprintTask).filter(SprintTask.sprint_id == sprint_id, SprintTask.is_completed == False).delete()

    # Determine highest existing day_number among completed tasks
    max_completed_day = max((t.day_number for t in sprint.tasks if t.is_completed), default=0)

    # Append newly generated future tasks
    new_task_objs = []
    for tk in new_tasks_data:
        adjusted_day = max_completed_day + tk["day_number"]
        stk = SprintTask(
            id=str(uuid.uuid4()),
            sprint_id=sprint_id,
            day_number=adjusted_day,
            scheduled_date=tk["scheduled_date"],
            task_type=tk["task_type"],
            title=tk["title"],
            description=tk.get("description", ""),
            estimated_minutes=tk.get("estimated_minutes", 60),
            is_completed=False
        )
        new_task_objs.append(stk)
    db.add_all(new_task_objs)

    # Record regeneration history
    hist = SprintRegenerationHistory(
        id=str(uuid.uuid4()),
        sprint_id=sprint_id,
        preserved_completed_tasks_count=preserved_count,
        notes=f"Plan recalibrated. Preserved {preserved_count} completed tasks."
    )
    db.add(hist)

    db.commit()
    db.refresh(sprint)

    return _format_sprint_response(sprint)


@router.delete("/{sprint_id}", status_code=status.HTTP_200_OK)
def delete_sprint(sprint_id: str, db: Session = Depends(get_db)):
    """Cascade delete sprint and all associated topics, tasks, and history."""
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sprint not found.")
    db.delete(sprint)
    db.commit()
    return {"message": "Sprint plan deleted successfully.", "id": sprint_id}


# Helper formatters
def _format_topic_response(t: SprintTopic) -> SprintTopicResponse:
    return SprintTopicResponse(
        id=t.id,
        name=t.name,
        category=t.category,
        observed_frequency=t.observed_frequency,
        similarity_confidence=t.similarity_confidence,
        priority_rank=t.priority_rank,
        priority_level=t.priority_level,
        calculation_notes=t.calculation_notes,
        source_chunk_ids=json.loads(t.source_chunk_ids_json) if t.source_chunk_ids_json else []
    )


def _format_task_response(tk: SprintTask) -> SprintTaskResponse:
    return SprintTaskResponse(
        id=tk.id,
        day_number=tk.day_number,
        scheduled_date=tk.scheduled_date,
        task_type=tk.task_type,
        title=tk.title,
        description=tk.description,
        estimated_minutes=tk.estimated_minutes,
        is_completed=tk.is_completed,
        completed_at=tk.completed_at
    )


def _format_sprint_response(s: Sprint) -> SprintResponse:
    topics = [_format_topic_response(t) for t in s.topics]
    tasks = [_format_task_response(tk) for tk in s.tasks]
    total_tasks = len(tasks)
    completed_count = sum(1 for tk in tasks if tk.is_completed)
    progress_pct = round((completed_count / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    unique_days = len({tk.day_number for tk in tasks})

    return SprintResponse(
        id=s.id,
        title=s.title,
        textbook_document_id=s.textbook_document_id,
        pyq_document_id=s.pyq_document_id,
        exam_date=s.exam_date,
        daily_study_hours=s.daily_study_hours,
        status=s.status,
        created_at=s.created_at,
        topics=topics,
        tasks=tasks,
        total_days=unique_days,
        completed_tasks_count=completed_count,
        progress_percentage=progress_pct
    )
