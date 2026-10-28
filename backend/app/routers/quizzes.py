import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.course import Module
from app.models.document import DocumentChunk
from app.models.quiz import Quiz, QuizQuestion, QuizAttempt
from app.schemas.quiz import (
    QuizResponse,
    QuizQuestionItem,
    QuizSubmitRequest,
    QuizResultResponse,
    QuestionResultFeedback
)
from app.services.quiz_service import QuizService

router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.post("/generate/{module_id}", response_model=QuizResponse, status_code=status.HTTP_201_CREATED)
def generate_module_quiz(
    module_id: str,
    db: Session = Depends(get_db)
):
    """
    Generate an authentic, grounded 5-question multiple-choice quiz for a module.
    Every question is linked to its exact supporting source chunk.
    """
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    # Retrieve source chunks for module
    source_chunk_ids = json.loads(module.source_chunk_ids_json) if module.source_chunk_ids_json else []
    chunks = []
    if source_chunk_ids:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.id.in_(source_chunk_ids)).all()

    # Augment with document chunks to ensure comprehensive grounding context
    if len(chunks) < 3:
        from app.models.course import Course
        course = db.query(Course).filter(Course.id == module.course_id).first()
        if course:
            doc_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == course.document_id).all()
            existing_ids = {c.id for c in chunks}
            for dc in doc_chunks:
                if dc.id not in existing_ids:
                    chunks.append(dc)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No source chunks available to generate questions from."
        )

    chunk_dicts = [
        {"id": c.id, "chunk_index": c.chunk_index, "page_number": c.page_number, "content": c.content}
        for c in chunks
    ]

    # Generate 5 grounded questions
    questions_data = QuizService.generate_five_question_quiz(
        module_title=module.title,
        chunks=chunk_dicts
    )

    # Create Quiz in DB
    quiz_id = str(uuid.uuid4())
    quiz = Quiz(
        id=quiz_id,
        module_id=module.id,
        title=f"{module.title} — Grounded Quiz"
    )
    db.add(quiz)
    db.flush()

    # Create QuizQuestions
    question_objs = []
    for q in questions_data:
        qq = QuizQuestion(
            id=str(uuid.uuid4()),
            quiz_id=quiz_id,
            question_text=q["question_text"],
            options_json=json.dumps(q["options"]),
            correct_option_index=q["correct_option_index"],
            explanation=q["explanation"],
            source_chunk_id=q["source_chunk_id"],
            source_text_snippet=q.get("source_text_snippet", "")
        )
        question_objs.append(qq)

    db.add_all(question_objs)
    db.commit()
    db.refresh(quiz)

    return _format_quiz_response(quiz)


@router.get("/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: str, db: Session = Depends(get_db)):
    """Retrieve quiz questions and answer choices for the student."""
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")
    return _format_quiz_response(quiz)


@router.post("/{quiz_id}/submit", response_model=QuizResultResponse)
def submit_quiz_answers(
    quiz_id: str,
    submission: QuizSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Submit quiz answers, get instant scoring, detailed explanations,
    and verified source citations for every question.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found.")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).all()
    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quiz contains no questions.")

    answers_payload = [
        {"question_id": a.question_id, "selected_option_index": a.selected_option_index}
        for a in submission.answers
    ]

    evaluation = QuizService.evaluate_quiz_submission(questions, answers_payload)

    # Save attempt in database
    attempt_id = str(uuid.uuid4())
    attempt = QuizAttempt(
        id=attempt_id,
        quiz_id=quiz_id,
        score=evaluation["score"],
        total_questions=evaluation["total_questions"],
        answers_json=json.dumps(answers_payload)
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    feedbacks = [
        QuestionResultFeedback(
            question_id=f["question_id"],
            question_text=f["question_text"],
            options=f["options"],
            selected_option_index=f["selected_option_index"],
            correct_option_index=f["correct_option_index"],
            is_correct=f["is_correct"],
            explanation=f["explanation"],
            source_chunk_id=f["source_chunk_id"],
            source_text_snippet=f["source_text_snippet"]
        )
        for f in evaluation["feedback"]
    ]

    return QuizResultResponse(
        attempt_id=attempt.id,
        quiz_id=quiz.id,
        score=evaluation["score"],
        total_questions=evaluation["total_questions"],
        percentage=evaluation["percentage"],
        feedback=feedbacks,
        completed_at=attempt.created_at
    )


@router.get("/module/{module_id}", response_model=List[QuizResponse])
def get_module_quizzes(module_id: str, db: Session = Depends(get_db)):
    """Retrieve quizzes belonging to a specific module."""
    quizzes = db.query(Quiz).filter(Quiz.module_id == module_id).order_by(Quiz.created_at.desc()).all()
    return [_format_quiz_response(q) for q in quizzes]


def _format_quiz_response(quiz: Quiz) -> QuizResponse:
    question_items = []
    for q in quiz.questions:
        options = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json
        question_items.append(QuizQuestionItem(
            id=q.id,
            question_text=q.question_text,
            options=options,
            source_chunk_id=q.source_chunk_id,
            source_text_snippet=q.source_text_snippet
        ))

    return QuizResponse(
        id=quiz.id,
        module_id=quiz.module_id,
        title=quiz.title,
        questions=question_items,
        created_at=quiz.created_at
    )
