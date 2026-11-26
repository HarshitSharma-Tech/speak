import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocumentChunk
from app.models.interview import InterviewSession, InterviewQuestion, InterviewReport
from app.schemas.interview import (
    InterviewStartRequest,
    InterviewSessionResponse,
    InterviewQuestionResponse,
    InterviewAnswerSubmitRequest,
    InterviewAnswerEvaluationResponse,
    InterviewReportResponse
)
from app.services.interview_service import InterviewService, analyze_speech_and_knowledge_gaps

router = APIRouter(prefix="/interviews", tags=["Mock Mentor"])


def _ideal_str(value) -> str:
    """LLMs sometimes return ideal_points as a list; store/return as text."""
    if isinstance(value, (list, tuple)):
        return "; ".join(str(v) for v in value)
    return "" if value is None else str(value)


def _get_past_session_mistakes(
    db: Session,
    exclude_session_id: Optional[str] = None,
    limit: int = 4,
) -> List[Dict[str, Any]]:
    """
    Fetch recent questions from past interview sessions where the candidate struggled
    (score <= 3 or technical_score <= 3 or detected mistakes), so the interviewer
    remembers mistakes across sessions.
    """
    query = db.query(InterviewQuestion).filter(
        InterviewQuestion.candidate_answer.isnot(None)
    )
    if exclude_session_id:
        query = query.filter(InterviewQuestion.session_id != exclude_session_id)

    recent_answered = (
        query.order_by(InterviewQuestion.created_at.desc()).limit(25).all()
    )

    mistakes_list: List[Dict[str, Any]] = []
    for q in recent_answered:
        diag = analyze_speech_and_knowledge_gaps(
            q.candidate_answer or "",
            q.question_text or "",
            q.category or "Technical",
        )
        is_weak = (q.score is not None and q.score <= 3) or (
            q.technical_score is not None and q.technical_score <= 3
        ) or bool(diag["mistakes"])
        if is_weak:
            mistakes_list.append(
                {
                    "question_text": q.question_text,
                    "candidate_answer": q.candidate_answer,
                    "score": q.score,
                    "category": q.category,
                    "feedback": q.feedback,
                    "ideal_points": q.ideal_points,
                    "mistakes": diag["mistakes"],
                }
            )
            if len(mistakes_list) >= limit:
                break

    return mistakes_list


@router.get("", response_model=List[InterviewSessionResponse])
def list_interview_sessions(db: Session = Depends(get_db)):
    """List all mock interview sessions ordered by most recent."""
    sessions = db.query(InterviewSession).order_by(InterviewSession.created_at.desc()).all()
    return [_format_session_response(s) for s in sessions]


@router.post("/start", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
def start_interview_session(
    request: InterviewStartRequest,
    db: Session = Depends(get_db)
):
    """
    Initialize an adaptive mock interview session.
    Extracts candidate profile from resume PDF, loads cross-session mistake memory,
    and generates the initial interview question.
    """
    candidate_skills = []
    career_summary = ""
    resume_text = ""

    if request.resume_document_id:
        resume_doc = db.query(Document).filter(Document.id == request.resume_document_id).first()
        if resume_doc:
            chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == resume_doc.id).all()
            resume_text = "\n\n".join(c.content for c in chunks)

    seed_skills = ["Python", "FastAPI", "Next.js", "TypeScript", "System Architecture"]
    if resume_text:
        found = [
            kw for kw in [
                "Python", "JavaScript", "TypeScript", "React", "Next.js", "FastAPI",
                "Node.js", "SQL", "PostgreSQL", "Docker", "AWS", "Machine Learning", "Algorithms"
            ]
            if kw.lower() in resume_text.lower()
        ]
        if found:
            seed_skills = found[:6]

    past_mistakes = _get_past_session_mistakes(db, exclude_session_id=None, limit=3)

    with ThreadPoolExecutor(max_workers=2) as executor:
        profile_future = (
            executor.submit(InterviewService.extract_resume_profile, resume_text)
            if resume_text else None
        )
        first_q_future = executor.submit(
            InterviewService.generate_next_question,
            request.job_title,
            request.job_description,
            seed_skills,
            1,
            "Medium",
            [],
            past_mistakes,
        )

        if profile_future:
            profile = profile_future.result()
            candidate_skills = profile.get("skills", [])
            career_summary = profile.get("summary", "")

        first_q_data = first_q_future.result()

    if not candidate_skills:
        candidate_skills = seed_skills[:4]

    session_id = str(uuid.uuid4())
    session = InterviewSession(
        id=session_id,
        resume_document_id=request.resume_document_id,
        job_title=request.job_title,
        job_description=request.job_description,
        candidate_skills_json=json.dumps(candidate_skills),
        candidate_experience_summary=career_summary,
        current_question_index=1,
        total_target_questions=request.total_questions,
        current_difficulty="Medium",
        state="IN_PROGRESS"
    )
    db.add(session)
    db.flush()

    first_question = InterviewQuestion(
        id=str(uuid.uuid4()),
        session_id=session_id,
        question_index=1,
        question_text=first_q_data["question_text"],
        difficulty="Medium",
        category=first_q_data.get("category", "Technical"),
        ideal_points=_ideal_str(first_q_data.get("ideal_points", ""))
    )
    db.add(first_question)
    db.commit()
    db.refresh(session)

    return _format_session_response(session)


@router.get("/{session_id}", response_model=InterviewSessionResponse)
def get_interview_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieve current state and progression of an interview session."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")
    return _format_session_response(session)


@router.post("/{session_id}/questions/{question_id}/answer", response_model=InterviewAnswerEvaluationResponse)
def submit_answer_and_progress(
    session_id: str,
    question_id: str,
    payload: InterviewAnswerSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    Submit candidate answer (via voice or text), evaluate mistakes & filler words FIRST,
    and then generate the next question specifically probing any mistake or omission made.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")

    question = db.query(InterviewQuestion).filter(
        InterviewQuestion.id == question_id,
        InterviewQuestion.session_id == session_id
    ).first()
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found in session.")

    # 1. Record answer and evaluate FIRST so the next question generator sees the exact mistakes made!
    question.candidate_answer = payload.answer_text
    eval_result = InterviewService.evaluate_answer(
        question.question_text,
        question.difficulty,
        question.category,
        payload.answer_text,
        session.job_title
    )

    question.score = eval_result["overall_score"]
    question.technical_score = eval_result["technical_score"]
    question.clarity_score = eval_result["clarity_score"]
    question.relevance_score = eval_result["relevance_score"]
    question.feedback = eval_result["feedback"]
    question.ideal_points = _ideal_str(eval_result.get("ideal_points", ""))
    db.flush()

    next_diff = eval_result.get("next_difficulty") or eval_result.get(
        "suggested_next_difficulty", session.current_difficulty
    )
    session.current_difficulty = next_diff

    is_complete = (question.question_index >= session.total_target_questions)
    candidate_skills = json.loads(session.candidate_skills_json) if session.candidate_skills_json else []
    next_idx = question.question_index + 1

    if not is_complete:
        # Gather full answered history IN THIS SESSION (including the question just graded!)
        past_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session_id
        ).order_by(InterviewQuestion.question_index).all()

        history_payload = []
        for q in past_questions:
            diag = analyze_speech_and_knowledge_gaps(
                q.candidate_answer or "",
                q.question_text or "",
                q.category or "Technical",
            )
            history_payload.append(
                {
                    "index": q.question_index,
                    "difficulty": q.difficulty,
                    "category": q.category,
                    "question_text": q.question_text,
                    "candidate_answer": q.candidate_answer,
                    "score": q.score,
                    "technical_score": q.technical_score,
                    "feedback": q.feedback,
                    "ideal_points": q.ideal_points,
                    "mistakes": diag["mistakes"],
                }
            )

        past_session_mistakes = _get_past_session_mistakes(
            db, exclude_session_id=session_id, limit=3
        )

        next_q_data = InterviewService.generate_next_question(
            session.job_title,
            session.job_description,
            candidate_skills,
            next_idx,
            next_diff,
            history_payload,
            past_session_mistakes,
        )

        session.current_question_index = next_idx
        next_q = InterviewQuestion(
            id=str(uuid.uuid4()),
            session_id=session_id,
            question_index=next_idx,
            question_text=next_q_data["question_text"],
            difficulty=next_diff,
            category=next_q_data.get("category", "Technical"),
            ideal_points=_ideal_str(next_q_data.get("ideal_points", ""))
        )
        db.add(next_q)
    else:
        session.state = "COMPLETED"

        all_questions = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session_id
        ).order_by(InterviewQuestion.question_index).all()

        evaluations_summary = [
            {
                "question_index": q.question_index,
                "question_text": q.question_text,
                "candidate_answer": q.candidate_answer,
                "score": q.score or 3,
                "technical_score": q.technical_score or 3,
                "clarity_score": q.clarity_score or 3,
                "relevance_score": q.relevance_score or 3
            }
            for q in all_questions
        ]

        report_data = InterviewService.generate_final_report(
            session_id=session_id,
            job_title=session.job_title,
            questions_evaluations=evaluations_summary
        )

        report = InterviewReport(
            id=str(uuid.uuid4()),
            session_id=session_id,
            overall_score=report_data["overall_score"],
            technical_score=report_data["technical_score"],
            communication_score=report_data["communication_score"],
            relevance_score=report_data["relevance_score"],
            strengths_json=json.dumps(report_data.get("strengths", [])),
            improvements_json=json.dumps(report_data.get("improvements", [])),
            recommended_topics_json=json.dumps(report_data.get("recommended_topics", [])),
            detailed_summary=report_data["detailed_summary"]
        )
        db.add(report)

    db.commit()

    return InterviewAnswerEvaluationResponse(
        question_id=question.id,
        score=eval_result["overall_score"],
        technical_score=eval_result["technical_score"],
        clarity_score=eval_result["clarity_score"],
        relevance_score=eval_result["relevance_score"],
        feedback=eval_result["feedback"],
        ideal_points=_ideal_str(eval_result.get("ideal_points", "")),
        next_difficulty=next_diff,
        is_session_complete=is_complete
    )


@router.get("/{session_id}/report", response_model=InterviewReportResponse)
def get_interview_report(session_id: str, db: Session = Depends(get_db)):
    """Retrieve comprehensive analytics scorecard report for completed interview."""
    report = db.query(InterviewReport).filter(InterviewReport.session_id == session_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview report not found. Complete all questions to generate final report."
        )
    return _format_report_response(report)


@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
def delete_interview_session(session_id: str, db: Session = Depends(get_db)):
    """Cascade delete interview session, questions, and report."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")
    db.delete(session)
    db.commit()
    return {"message": "Interview session deleted successfully.", "id": session_id}


def _format_question_response(q: InterviewQuestion) -> InterviewQuestionResponse:
    return InterviewQuestionResponse(
        id=q.id,
        question_index=q.question_index,
        question_text=q.question_text,
        difficulty=q.difficulty,
        category=q.category,
        candidate_answer=q.candidate_answer,
        score=q.score,
        feedback=q.feedback
    )


def _format_report_response(r: InterviewReport) -> InterviewReportResponse:
    return InterviewReportResponse(
        id=r.id,
        session_id=r.session_id,
        overall_score=r.overall_score,
        technical_score=r.technical_score,
        communication_score=r.communication_score,
        relevance_score=r.relevance_score,
        strengths=json.loads(r.strengths_json) if r.strengths_json else [],
        improvements=json.loads(r.improvements_json) if r.improvements_json else [],
        recommended_topics=json.loads(r.recommended_topics_json) if r.recommended_topics_json else [],
        detailed_summary=r.detailed_summary,
        created_at=r.created_at
    )


def _format_session_response(s: InterviewSession) -> InterviewSessionResponse:
    questions = [_format_question_response(q) for q in s.questions]
    report = _format_report_response(s.report) if s.report else None

    return InterviewSessionResponse(
        id=s.id,
        job_title=s.job_title,
        job_description=s.job_description,
        resume_document_id=s.resume_document_id,
        candidate_skills=json.loads(s.candidate_skills_json) if s.candidate_skills_json else [],
        candidate_experience_summary=s.candidate_experience_summary,
        current_question_index=s.current_question_index,
        total_target_questions=s.total_target_questions,
        current_difficulty=s.current_difficulty,
        state=s.state,
        created_at=s.created_at,
        questions=questions,
        report=report
    )
