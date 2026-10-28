import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Sprint(Base):
    __tablename__ = "sprints"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    textbook_document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    pyq_document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    exam_date = Column(DateTime, nullable=False)
    daily_study_hours = Column(Float, nullable=False, default=2.0)
    preferences_json = Column(Text, default="{}")
    status = Column(String(50), default="ready")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    topics = relationship("SprintTopic", back_populates="sprint", cascade="all, delete-orphan", order_by="SprintTopic.priority_rank")
    tasks = relationship("SprintTask", back_populates="sprint", cascade="all, delete-orphan", order_by="SprintTask.day_number")
    regeneration_history = relationship("SprintRegenerationHistory", back_populates="sprint", cascade="all, delete-orphan")


class SprintTopic(Base):
    __tablename__ = "sprint_topics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sprint_id = Column(String(36), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="General")
    observed_frequency = Column(Integer, default=1)  # Number of appearances in PYQs
    similarity_confidence = Column(Float, default=0.85)  # Cosine similarity match score (0.0 to 1.0)
    priority_rank = Column(Integer, default=1)
    priority_level = Column(String(20), default="High")  # High, Medium, Low
    calculation_notes = Column(Text, nullable=True)  # Transparent breakdown of priority logic
    source_chunk_ids_json = Column(Text, default="[]")

    sprint = relationship("Sprint", back_populates="topics")


class SprintTask(Base):
    __tablename__ = "sprint_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sprint_id = Column(String(36), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    scheduled_date = Column(DateTime, nullable=False)
    task_type = Column(String(50), nullable=False)  # Topic Study, Revision, Practice Questions, Mock Test
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    estimated_minutes = Column(Integer, default=60)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    sprint = relationship("Sprint", back_populates="tasks")


class SprintRegenerationHistory(Base):
    __tablename__ = "sprint_regeneration_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sprint_id = Column(String(36), ForeignKey("sprints.id", ondelete="CASCADE"), nullable=False, index=True)
    regenerated_at = Column(DateTime, default=datetime.utcnow)
    preserved_completed_tasks_count = Column(Integer, default=0)
    notes = Column(Text, nullable=True)

    sprint = relationship("Sprint", back_populates="regeneration_history")
