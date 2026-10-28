from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class QuizQuestionItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    question_text: str
    options: List[str]
    source_chunk_id: str
    source_text_snippet: Optional[str] = None


class QuizQuestionAdmin(QuizQuestionItem):
    correct_option_index: int
    explanation: str


class QuizResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    module_id: str
    title: str
    questions: List[QuizQuestionItem]
    created_at: datetime


class AnswerSubmission(BaseModel):
    question_id: str
    selected_option_index: int = Field(ge=0, le=3)


class QuizSubmitRequest(BaseModel):
    answers: List[AnswerSubmission]


class QuestionResultFeedback(BaseModel):
    question_id: str
    question_text: str
    options: List[str]
    selected_option_index: int
    correct_option_index: int
    is_correct: bool
    explanation: str
    source_chunk_id: str
    source_text_snippet: Optional[str] = None


class QuizResultResponse(BaseModel):
    attempt_id: str
    quiz_id: str
    score: int
    total_questions: int
    percentage: float
    feedback: List[QuestionResultFeedback]
    completed_at: datetime
