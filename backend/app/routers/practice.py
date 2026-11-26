from typing import List, Literal, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.services.practice_service import evaluate_pyq_answer

router = APIRouter(prefix="/practice", tags=["Practice"])


class PyqEvaluateRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    model_approach: str = Field(default="", max_length=4000)
    category: str = Field(default="General", max_length=80)
    difficulty: str = Field(default="Medium", max_length=40)
    company: Optional[str] = Field(default=None, max_length=120)
    answer_text: str = Field(..., min_length=1, max_length=8000)


class PyqEvaluateResponse(BaseModel):
    score: int = Field(..., ge=0, le=10)
    verdict: Literal["Strong", "Good", "Needs work", "Weak"]
    covered_points: List[str]
    missing_points: List[str]
    feedback: str
    improved_answer: str
    graded_by: Literal["ai", "heuristic"]


@router.post("/evaluate", response_model=PyqEvaluateResponse)
def evaluate_answer_endpoint(payload: PyqEvaluateRequest):
    result = evaluate_pyq_answer(
        question=payload.question,
        model_approach=payload.model_approach,
        category=payload.category,
        difficulty=payload.difficulty,
        company=payload.company,
        answer_text=payload.answer_text,
    )
    return PyqEvaluateResponse(**result)
