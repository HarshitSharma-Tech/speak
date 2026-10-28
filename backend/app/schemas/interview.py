from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class InterviewStartRequest(BaseModel):
    job_title: str
    job_description: str
    resume_document_id: Optional[str] = None
    total_questions: int = Field(default=5, ge=3, le=10)


class InterviewQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_index: int
    question_text: str
    difficulty: str
    category: str
    candidate_answer: Optional[str] = None
    score: Optional[int] = None
    feedback: Optional[str] = None


class InterviewAnswerSubmitRequest(BaseModel):
    answer_text: str = Field(..., min_length=2)
    use_voice: bool = False


class InterviewAnswerEvaluationResponse(BaseModel):
    question_id: str
    score: int  # 1 to 5
    technical_score: int
    clarity_score: int
    relevance_score: int
    feedback: str
    ideal_points: str
    next_difficulty: str
    is_session_complete: bool


class InterviewReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    overall_score: float
    technical_score: float
    communication_score: float
    relevance_score: float
    strengths: List[str]
    improvements: List[str]
    recommended_topics: List[str]
    detailed_summary: str
    created_at: datetime


class InterviewSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_title: str
    job_description: str
    resume_document_id: Optional[str] = None
    candidate_skills: List[str] = []
    candidate_experience_summary: Optional[str] = None
    current_question_index: int
    total_target_questions: int
    current_difficulty: str
    state: str
    created_at: datetime
    questions: List[InterviewQuestionResponse] = []
    report: Optional[InterviewReportResponse] = None
