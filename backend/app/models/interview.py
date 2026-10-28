import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    resume_document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    job_title = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=False)
    candidate_skills_json = Column(Text, default="[]")
    candidate_experience_summary = Column(Text, nullable=True)
    current_question_index = Column(Integer, default=0)
    total_target_questions = Column(Integer, default=5)
    current_difficulty = Column(String(20), default="Medium")  # Easy, Medium, Hard
    state = Column(String(30), default="SETUP")  # SETUP, IN_PROGRESS, EVALUATING, COMPLETED, ABORTED
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    questions = relationship("InterviewQuestion", back_populates="session", cascade="all, delete-orphan", order_by="InterviewQuestion.question_index")
    report = relationship("InterviewReport", back_populates="session", uselist=False, cascade="all, delete-orphan")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_index = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    difficulty = Column(String(20), default="Medium")
    category = Column(String(50), default="Technical")  # Technical, Behavioral, System Design, Problem Solving
    candidate_answer = Column(Text, nullable=True)
    
    # Evaluation
    score = Column(Integer, nullable=True)  # 1 to 5
    technical_score = Column(Integer, nullable=True)  # 1 to 5
    clarity_score = Column(Integer, nullable=True)  # 1 to 5
    relevance_score = Column(Integer, nullable=True)  # 1 to 5
    feedback = Column(Text, nullable=True)
    ideal_points = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="questions")


class InterviewReport(Base):
    __tablename__ = "interview_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    overall_score = Column(Float, nullable=False)  # 0 to 100
    technical_score = Column(Float, nullable=False)  # 1 to 5
    communication_score = Column(Float, nullable=False)  # 1 to 5
    relevance_score = Column(Float, nullable=False)  # 1 to 5
    strengths_json = Column(Text, default="[]")
    improvements_json = Column(Text, default="[]")
    recommended_topics_json = Column(Text, default="[]")
    detailed_summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("InterviewSession", back_populates="report")
