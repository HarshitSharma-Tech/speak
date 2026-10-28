import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="ready")
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.module_order")
    cheat_sheets = relationship("CheatSheet", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    module_order = Column(Integer, nullable=False, default=1)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    key_topics_json = Column(Text, default="[]")
    learning_content = Column(Text, nullable=False)
    source_chunk_ids_json = Column(Text, default="[]")  # Grounding chunk references
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="modules")
    quizzes = relationship("Quiz", back_populates="module", cascade="all, delete-orphan")


class CheatSheet(Base):
    __tablename__ = "cheat_sheets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    key_definitions_json = Column(Text, default="[]")
    important_formulas_json = Column(Text, default="[]")
    high_yield_revision_points_json = Column(Text, default="[]")
    source_chunk_ids_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="cheat_sheets")
