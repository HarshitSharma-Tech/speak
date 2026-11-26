def test_auth_register_login_me_and_progress(client):
    # Register returns 201 with bearer token
    reg_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "Alex@Example.com",
            "name": "Alex Candidate",
            "password": "securepassword123",
        },
    )
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["token_type"] == "bearer"
    assert reg_data["access_token"]
    assert reg_data["user"]["email"] == "alex@example.com"

    # Duplicate register returns 409
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "alex@example.com",
            "name": "Alex Again",
            "password": "securepassword123",
        },
    )
    assert dup_res.status_code == 409

    # Wrong password returns 401
    bad_login = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@example.com", "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # Correct login returns 200
    good_login = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@example.com", "password": "securepassword123"},
    )
    assert good_login.status_code == 200
    token = good_login.json()["access_token"]
    assert token

    # /auth/me with bearer token returns user email
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "alex@example.com"

    # /progress without token returns 401
    unauth_progress = client.get("/api/v1/progress")
    assert unauth_progress.status_code == 401

    # PUT then GET /progress round-trips
    put_res = client.put(
        "/api/v1/progress",
        headers={"Authorization": f"Bearer {token}"},
        json={"data": {"practiced": ["amazon-1"]}},
    )
    assert put_res.status_code == 200
    assert put_res.json()["data"] == {"practiced": ["amazon-1"]}

    get_res = client.get(
        "/api/v1/progress",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["data"] == {"practiced": ["amazon-1"]}


def test_practice_evaluate_heuristic_fallback(client):
    res = client.post(
        "/api/v1/practice/evaluate",
        json={
            "question": "Design and implement an LRU Cache supporting O(1) get and put.",
            "model_approach": (
                "Combine a HashMap (key -> node) with a doubly linked list ordered from "
                "most-recently-used at head to least-recently-used at tail."
            ),
            "category": "DSA",
            "difficulty": "Medium",
            "company": "Amazon",
            "answer_text": (
                "Use a HashMap mapping keys to nodes in a doubly linked list. "
                "On get or put, move the node to head in O(1) and evict tail when over capacity."
            ),
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["graded_by"] == "heuristic"
    assert 0 <= body["score"] <= 10
    assert body["verdict"] in ("Strong", "Good", "Needs work", "Weak")
    assert any("hashmap" in p.lower() for p in body["covered_points"])


def test_interviewer_remembers_mistakes_and_builds_five_coaching_items(client):
    # Start a 3-question interview session
    start_res = client.post(
        "/api/v1/interviews/start",
        json={
            "job_title": "Backend Engineer",
            "job_description": "Distributed APIs, SQL indexing, and caching.",
            "total_questions": 3,
        },
    )
    assert start_res.status_code == 201
    session = start_res.json()
    session_id = session["id"]
    q1 = session["questions"][0]

    # Submit a brief, filler-heavy answer with mistakes on Q1
    ans1 = client.post(
        f"/api/v1/interviews/{session_id}/questions/{q1['id']}/answer",
        json={
            "answer_text": "Um like basically I would just use a database table you know sort of.",
            "use_voice": True,
        },
    )
    assert ans1.status_code == 200
    eval1 = ans1.json()
    assert eval1["score"] <= 3

    # Fetch updated session and verify Q2 explicitly follows up on Q1's mistake
    updated_session = client.get(f"/api/v1/interviews/{session_id}").json()
    q2 = next(q for q in updated_session["questions"] if q["question_index"] == 2)
    q2_lower = q2["question_text"].lower()
    assert (
        "following up" in q2_lower
        or "building on" in q2_lower
        or "earlier" in q2_lower
        or "revisiting" in q2_lower
        or "dig deeper" in q2_lower
    )

    # Answer Q2 and Q3 to complete the session and verify the 5 coaching pillars in report
    client.post(
        f"/api/v1/interviews/{session_id}/questions/{q2['id']}/answer",
        json={
            "answer_text": "First, I would index the lookup key with a B+ tree for O(log n) time complexity, handle cache invalidation trade-offs, and measure p99 latency.",
            "use_voice": False,
        },
    )
    s_after_q2 = client.get(f"/api/v1/interviews/{session_id}").json()
    q3 = next(q for q in s_after_q2["questions"] if q["question_index"] == 3)
    client.post(
        f"/api/v1/interviews/{session_id}/questions/{q3['id']}/answer",
        json={
            "answer_text": "For example, when a deadlock occurred under concurrent writes, we enforced lock ordering and reduced error rate by 90%.",
            "use_voice": False,
        },
    )

    rep_res = client.get(f"/api/v1/interviews/{session_id}/report")
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert len(rep["improvements"]) >= 5
    joined_imp = " ".join(rep["improvements"]).lower()
    assert "filler" in joined_imp
    assert "knowledge" in joined_imp or "mistake" in joined_imp
    assert "complexity" in joined_imp or "depth" in joined_imp

