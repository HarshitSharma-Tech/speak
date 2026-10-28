import pytest
from app.services.interview_service import InterviewService


def test_extract_resume_profile():
    resume_text = """
    Jane Doe - Full Stack AI Engineer
    Experienced in Python, FastAPI, TypeScript, Next.js, and PostgreSQL.
    Built automated machine learning pipelines with Docker and AWS.
    """
    profile = InterviewService.extract_resume_profile(resume_text)
    assert "skills" in profile
    assert len(profile["skills"]) > 0
    assert any(s in profile["skills"] for s in ["Python", "FastAPI", "TypeScript", "Next.js"])
    assert "summary" in profile


def test_generate_next_question():
    q_data = InterviewService.generate_next_question(
        job_title="Senior Python Backend Engineer",
        job_description="Design high-throughput distributed REST APIs with FastAPI and PostgreSQL.",
        candidate_skills=["Python", "FastAPI", "PostgreSQL"],
        question_index=1,
        current_difficulty="Medium",
        previous_qa=[]
    )

    assert "question_text" in q_data
    assert len(q_data["question_text"]) > 15
    assert q_data["difficulty"] == "Medium"
    assert "category" in q_data


def test_evaluate_answer_scoring_and_adaptation():
    eval_short = InterviewService.evaluate_answer(
        question_text="Explain database connection pooling.",
        difficulty="Medium",
        category="Technical",
        answer_text="It reuses connections.",
        job_title="Backend Engineer"
    )
    # Short answer should score moderately (e.g. 2/5)
    assert 1 <= eval_short["overall_score"] <= 3
    assert "feedback" in eval_short
    assert eval_short["next_difficulty"] in {"Easy", "Medium"}

    eval_deep = InterviewService.evaluate_answer(
        question_text="Explain database connection pooling.",
        difficulty="Medium",
        category="Technical",
        answer_text=(
            "Connection pooling maintains a cache of active database connections that can be reused across incoming requests. "
            "Instead of executing a costly TCP handshake and authentication on every query, worker threads acquire a connection from "
            "the pool and return it upon completion. Key configuration parameters include min/max pool size, connection timeout, and "
            "idle connection reaping to prevent resource exhaustion under high load."
        ),
        job_title="Backend Engineer"
    )
    assert eval_deep["overall_score"] >= 4
    assert eval_deep["technical_score"] >= 4
    assert eval_deep["next_difficulty"] == "Hard"


def test_final_report_generation():
    questions_evaluations = [
        {"question_index": 1, "question_text": "Q1", "candidate_answer": "Answer 1", "score": 4, "technical_score": 4, "clarity_score": 4, "relevance_score": 4},
        {"question_index": 2, "question_text": "Q2", "candidate_answer": "Answer 2", "score": 5, "technical_score": 5, "clarity_score": 5, "relevance_score": 5},
        {"question_index": 3, "question_text": "Q3", "candidate_answer": "Answer 3", "score": 3, "technical_score": 3, "clarity_score": 4, "relevance_score": 3}
    ]

    report = InterviewService.generate_final_report("sess-123", "Full Stack Engineer", questions_evaluations)

    assert report["session_id"] == "sess-123"
    assert 0.0 <= report["overall_score"] <= 100.0
    assert 1.0 <= report["technical_score"] <= 5.0
    assert len(report["strengths"]) > 0
    assert len(report["improvements"]) > 0
    assert len(report["recommended_topics"]) > 0
    # Must contain constructive educational disclaimer
    assert "not constitute an objective employment determination" in report["detailed_summary"] or "educational" in report["detailed_summary"].lower()
