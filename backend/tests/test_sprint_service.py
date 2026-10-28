import datetime
import pytest
from app.services.sprint_service import SprintService


def test_extract_topics_from_pyq_with_frequency_and_confidence():
    pyq_text = """
    Q1. Explain Database Normalization and BCNF with examples. (10 marks)
    Q2. Discuss Indexing techniques and B-Trees in database systems. (10 marks)
    Q3. Explain Database Normalization and 3NF anomalies. (5 marks)
    """
    textbook_chunks = [
        {"id": "tb-1", "chunk_index": 1, "page_number": 12, "content": "Database Normalization eliminates redundant data in relations."},
        {"id": "tb-2", "chunk_index": 2, "page_number": 45, "content": "B-Trees and Indexing structures expedite record retrieval."}
    ]

    topics = SprintService.extract_topics_from_pyq(pyq_text, textbook_chunks)
    assert len(topics) >= 2

    # Verify that frequency and confidence are separate
    for t in topics:
        assert "observed_frequency" in t
        assert t["observed_frequency"] >= 1
        assert "similarity_confidence" in t
        assert 0.0 <= t["similarity_confidence"] <= 1.0
        assert "priority_rank" in t
        assert t["priority_level"] in {"High", "Medium", "Low"}
        assert "calculation_notes" in t
        assert "Historical frequency indicates past emphasis but does not guarantee inclusion" in t["calculation_notes"]


def test_generate_day_by_day_schedule():
    now = datetime.datetime.utcnow()
    exam_date = now + datetime.timedelta(days=7)  # 7-day sprint

    topics = [
        {"name": "Database Normalization", "priority_level": "High"},
        {"name": "Transaction Concurrency", "priority_level": "High"},
        {"name": "Query Optimization", "priority_level": "Medium"}
    ]

    tasks = SprintService.generate_day_by_day_schedule(
        exam_date=exam_date,
        daily_study_hours=2.0,
        topics=topics,
        start_date=now
    )

    assert len(tasks) >= 7
    days = {t["day_number"] for t in tasks}
    assert len(days) >= 7

    task_types = {t["task_type"] for t in tasks}
    assert "Topic Study" in task_types
    assert "Revision" in task_types
    assert "Practice Questions" in task_types
    assert "Mock Test" in task_types


def test_regenerate_schedule_preserving_completed_tasks():
    class DummyTask:
        def __init__(self, day, is_completed):
            self.day_number = day
            self.is_completed = is_completed

    existing = [
        DummyTask(1, True),
        DummyTask(2, True),
        DummyTask(3, False),
        DummyTask(4, False)
    ]

    now = datetime.datetime.utcnow()
    new_exam = now + datetime.timedelta(days=10)

    topics = [{"name": "Relational Calculus", "priority_level": "High"}]

    new_tasks, preserved_count = SprintService.regenerate_schedule_preserving_progress(
        existing_tasks=existing,
        new_exam_date=new_exam,
        new_daily_hours=3.0,
        topics=topics
    )

    assert preserved_count == 2
    assert len(new_tasks) > 0
