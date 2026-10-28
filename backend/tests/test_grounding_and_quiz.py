import pytest
from app.services.grounding_service import GroundingService
from app.services.quiz_service import QuizService
from app.models.quiz import QuizQuestion


def test_grounding_validation_positive():
    available_chunks = [
        {"id": "chunk-101", "content": "Operating systems manage hardware resources.", "page_number": 3},
        {"id": "chunk-102", "content": "Paging avoids external fragmentation.", "page_number": 4}
    ]
    is_valid, snippet, page = GroundingService.validate_grounding("chunk-101", available_chunks)
    assert is_valid is True
    assert "Operating systems" in snippet
    assert page == 3


def test_grounding_validation_negative():
    available_chunks = [{"id": "chunk-101", "content": "Text", "page_number": 1}]
    is_valid, snippet, page = GroundingService.validate_grounding("hallucinated-id", available_chunks)
    assert is_valid is False
    assert snippet is None


def test_assert_insufficient_context_raises():
    sparse_chunks = [{"id": "sparse-1", "content": "Brief"}]
    with pytest.raises(ValueError, match="Insufficient document text"):
        QuizService.generate_five_question_quiz("Sparse Topic", sparse_chunks)


def test_generate_five_grounded_questions():
    chunks = [
        {
            "id": f"chunk-{i}",
            "chunk_index": i,
            "page_number": i + 1,
            "content": f"Database normalization principle number {i}: Eliminating data anomalies through normal forms."
        }
        for i in range(1, 6)
    ]

    questions = QuizService.generate_five_question_quiz("Database Normalization", chunks)
    assert len(questions) == 5

    valid_chunk_ids = {c["id"] for c in chunks}
    for q in questions:
        assert len(q["options"]) == 4
        assert 0 <= q["correct_option_index"] <= 3
        assert q["source_chunk_id"] in valid_chunk_ids
        assert len(q["explanation"]) > 10
        assert len(q["source_text_snippet"]) > 10


def test_evaluate_quiz_submission():
    class DummyQuestion:
        def __init__(self, q_id, correct_idx):
            self.id = q_id
            self.question_text = f"Question {q_id}"
            self.options_json = '["A", "B", "C", "D"]'
            self.correct_option_index = correct_idx
            self.explanation = "Verified by source chunk."
            self.source_chunk_id = "chunk-1"
            self.source_text_snippet = "Verified text snippet."

    questions = [
        DummyQuestion("q1", 0),
        DummyQuestion("q2", 2),
        DummyQuestion("q3", 1)
    ]

    # Student answers: q1 correct (0), q2 incorrect (1), q3 correct (1) -> score 2/3 (66.7%)
    submissions = [
        {"question_id": "q1", "selected_option_index": 0},
        {"question_id": "q2", "selected_option_index": 1},
        {"question_id": "q3", "selected_option_index": 1}
    ]

    result = QuizService.evaluate_quiz_submission(questions, submissions)
    assert result["score"] == 2
    assert result["total_questions"] == 3
    assert result["percentage"] == 66.7
    assert len(result["feedback"]) == 3
    assert result["feedback"][0]["is_correct"] is True
    assert result["feedback"][1]["is_correct"] is False
