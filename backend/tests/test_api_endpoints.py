import io
import datetime
import pytest


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["service"] == "LearnSync AI"


def test_document_upload_and_listing(client, sample_pdf_bytes):
    # Upload document
    files = {"file": ("test_textbook.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    data = {"file_type": "textbook"}
    res = client.post("/api/v1/documents/upload", files=files, data=data)
    assert res.status_code == 201
    doc_data = res.json()
    doc_id = doc_data["id"]
    assert doc_data["original_name"] == "test_textbook.pdf"
    assert doc_data["page_count"] == 2
    assert doc_data["chunk_count"] >= 2

    # List documents
    res_list = client.get("/api/v1/documents")
    assert res_list.status_code == 200
    docs = res_list.json()
    assert len(docs) >= 1
    assert any(d["id"] == doc_id for d in docs)

    # Get document details with chunks
    res_detail = client.get(f"/api/v1/documents/{doc_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert len(detail["chunks"]) >= 2


def test_course_engine_workflow(client, sample_pdf_bytes):
    # 1. Upload textbook
    files = {"file": ("os_book.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    res_up = client.post("/api/v1/documents/upload", files=files, data={"file_type": "textbook"})
    doc_id = res_up.json()["id"]

    # 2. Generate Course
    res_course = client.post("/api/v1/courses/generate", json={
        "document_id": doc_id,
        "title": "Operating Systems & Databases",
        "target_modules": 3
    })
    assert res_course.status_code == 201
    course = res_course.json()
    course_id = course["id"]
    assert len(course["modules"]) >= 2
    assert len(course["cheat_sheets"]) >= 1

    first_mod_id = course["modules"][0]["id"]

    # 3. Get Module
    res_mod = client.get(f"/api/v1/courses/{course_id}/modules/{first_mod_id}")
    assert res_mod.status_code == 200
    mod_data = res_mod.json()
    assert len(mod_data["learning_content"]) > 20
    assert len(mod_data["source_chunk_ids"]) > 0

    # 4. Generate 5-Question Grounded Quiz
    res_quiz = client.post(f"/api/v1/quizzes/generate/{first_mod_id}")
    assert res_quiz.status_code == 201
    quiz = res_quiz.json()
    assert len(quiz["questions"]) == 5
    for q in quiz["questions"]:
        assert len(q["options"]) == 4
        assert q["source_chunk_id"] is not None

    # 5. Submit Answers
    answers = [{"question_id": q["id"], "selected_option_index": 0} for q in quiz["questions"]]
    res_submit = client.post(f"/api/v1/quizzes/{quiz['id']}/submit", json={"answers": answers})
    assert res_submit.status_code == 200
    result = res_submit.json()
    assert "score" in result
    assert result["total_questions"] == 5
    assert len(result["feedback"]) == 5

    # 6. Get Cheat Sheet
    res_cs = client.get(f"/api/v1/courses/{course_id}/cheat-sheet")
    assert res_cs.status_code == 200
    cs = res_cs.json()
    assert len(cs["key_definitions"]) > 0


def test_sprint_engine_workflow(client, sample_pdf_bytes):
    # 1. Upload textbook
    files_tb = {"file": ("algo_book.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    res_tb = client.post("/api/v1/documents/upload", files=files_tb, data={"file_type": "textbook"})
    tb_id = res_tb.json()["id"]

    # 2. Upload PYQ
    files_pyq = {"file": ("algo_pyq.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")}
    res_pyq = client.post("/api/v1/documents/upload", files=files_pyq, data={"file_type": "pyq"})
    pyq_id = res_pyq.json()["id"]

    # 3. Create Sprint
    exam_dt = (datetime.datetime.utcnow() + datetime.timedelta(days=5)).isoformat()
    res_sprint = client.post("/api/v1/sprints", json={
        "title": "Algorithms Exam Sprint",
        "textbook_document_id": tb_id,
        "pyq_document_id": pyq_id,
        "exam_date": exam_dt,
        "daily_study_hours": 3.0
    })
    assert res_sprint.status_code == 201
    sprint = res_sprint.json()
    sprint_id = sprint["id"]
    assert len(sprint["topics"]) > 0
    assert len(sprint["tasks"]) >= 5

    first_task = sprint["tasks"][0]

    # 4. Mark Task Completed
    res_task = client.patch(f"/api/v1/sprints/{sprint_id}/tasks/{first_task['id']}", json={"is_completed": True})
    assert res_task.status_code == 200
    assert res_task.json()["is_completed"] is True

    # 5. Regenerate schedule (preserving completed tasks)
    new_exam = (datetime.datetime.utcnow() + datetime.timedelta(days=8)).isoformat()
    res_regen = client.post(f"/api/v1/sprints/{sprint_id}/regenerate", json={
        "exam_date": new_exam,
        "daily_study_hours": 3.5
    })
    assert res_regen.status_code == 200
    regen_sprint = res_regen.json()
    assert regen_sprint["completed_tasks_count"] >= 1


def test_mock_mentor_workflow(client):
    # 1. Start Interview Session
    res_start = client.post("/api/v1/interviews/start", json={
        "job_title": "Full Stack Engineer",
        "job_description": "Build high-throughput apps with Next.js, FastAPI, and PostgreSQL.",
        "total_questions": 3
    })
    assert res_start.status_code == 201
    session = res_start.json()
    sess_id = session["id"]
    assert session["state"] == "IN_PROGRESS"
    assert len(session["questions"]) == 1
    assert session["current_question_index"] == 1

    q1 = session["questions"][0]

    # 2. Submit Answer to Question 1
    res_ans1 = client.post(
        f"/api/v1/interviews/{sess_id}/questions/{q1['id']}/answer",
        json={"answer_text": "I design decoupled client and server architectures with clear API contracts and robust error handling.", "use_voice": False}
    )
    assert res_ans1.status_code == 200
    ans1_data = res_ans1.json()
    assert 1 <= ans1_data["score"] <= 5
    assert ans1_data["is_session_complete"] is False

    # Fetch updated session (should now have Question 2)
    res_sess = client.get(f"/api/v1/interviews/{sess_id}")
    sess_data = res_sess.json()
    assert len(sess_data["questions"]) == 2
    q2 = sess_data["questions"][1]

    # 3. Submit Answer to Question 2
    res_ans2 = client.post(
        f"/api/v1/interviews/{sess_id}/questions/{q2['id']}/answer",
        json={"answer_text": "I use connection pooling, database indices, and redis caching for performance optimization.", "use_voice": False}
    )
    assert res_ans2.status_code == 200
    assert res_ans2.json()["is_session_complete"] is False

    # Fetch updated session (should now have Question 3)
    res_sess = client.get(f"/api/v1/interviews/{sess_id}")
    q3 = res_sess.json()["questions"][2]

    # 4. Submit Answer to Final Question 3
    res_ans3 = client.post(
        f"/api/v1/interviews/{sess_id}/questions/{q3['id']}/answer",
        json={"answer_text": "I prioritize psychological safety and transparent code reviews using automated linters and CI pipelines.", "use_voice": False}
    )
    assert res_ans3.status_code == 200
    assert res_ans3.json()["is_session_complete"] is True

    # 5. Fetch Final Report
    res_rep = client.get(f"/api/v1/interviews/{sess_id}/report")
    assert res_rep.status_code == 200
    report = res_rep.json()
    assert 0 <= report["overall_score"] <= 100
    assert len(report["strengths"]) > 0
    assert len(report["improvements"]) > 0
    assert len(report["recommended_topics"]) > 0
