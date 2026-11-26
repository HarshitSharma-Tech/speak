import re
from typing import Any, Dict, List, Optional
from app.services.llm_service import llm_service

_STOPWORDS = {
    "that", "with", "from", "this", "then", "each", "when", "into", "your",
    "have", "will", "they", "them", "using", "where", "which", "while", "than",
    "only", "also", "more", "most", "both", "such", "over", "time", "space",
    "first", "return", "returns", "value", "values", "check", "every",
}


def _score_to_verdict(score: int) -> str:
    if score >= 8:
        return "Strong"
    if score >= 6:
        return "Good"
    if score >= 4:
        return "Needs work"
    return "Weak"


def _extract_keywords(model_approach: str) -> List[str]:
    if not model_approach:
        return []
    keywords: List[str] = []
    seen = set()

    for m in re.finditer(r"`([^`]+)`", model_approach):
        term = m.group(1).strip().lower()
        if len(term) >= 2 and term not in _STOPWORDS and term not in seen:
            seen.add(term)
            keywords.append(term)
            if len(keywords) >= 12:
                return keywords

    for m in re.finditer(r"[a-zA-Z][a-zA-Z0-9+#-]{3,}", model_approach):
        word = m.group(0).lower()
        if word not in _STOPWORDS and word not in seen:
            seen.add(word)
            keywords.append(word)
            if len(keywords) >= 12:
                return keywords

    return keywords


def _coerce_points(value: Any) -> List[str]:
    if not isinstance(value, list):
        return []
    out: List[str] = []
    for item in value:
        text = str(item).strip()
        if text:
            out.append(text)
        if len(out) >= 6:
            break
    return out


def evaluate_pyq_answer(
    question: str,
    model_approach: str,
    category: str,
    difficulty: str,
    company: Optional[str],
    answer_text: str,
) -> Dict[str, Any]:
    """Evaluate a candidate's written PYQ answer via LLM with deterministic keyword fallback."""
    system_instruction = (
        "You are a strict but encouraging technical interview grader. "
        "Evaluate the candidate's answer accurately against the question and reference approach. "
        "Respond strictly in valid JSON only."
    )

    company_label = company or "General Tech"
    prompt = f"""Company: {company_label}
Category: {category}
Difficulty: {difficulty}
Question: {question}
Reference Approach: {model_approach or "Not provided"}

Candidate's Answer:
{answer_text}

Return strictly valid JSON:
{{
  "score": 0,
  "covered_points": ["point covered"],
  "missing_points": ["important point missed"],
  "feedback": "2-3 sentences of direct constructive feedback",
  "improved_answer": "a concise ideal answer (<=180 words)"
}}
Score must be an integer from 0 to 10."""

    ai_result = llm_service.call_ai_structured(prompt, system_instruction, max_tokens=1200)

    raw_score = ai_result.get("score") if isinstance(ai_result, dict) else None
    if raw_score is not None and not isinstance(raw_score, bool):
        try:
            score = max(0, min(10, int(round(float(raw_score)))))
            covered_points = _coerce_points(ai_result.get("covered_points"))
            missing_points = _coerce_points(ai_result.get("missing_points"))
            feedback = str(ai_result.get("feedback") or "").strip() or (
                "Reviewed against the reference interview criteria."
            )
            improved_answer = str(ai_result.get("improved_answer") or "").strip() or (
                model_approach.strip()
                or "Structure your answer: restate the problem, outline the approach, analyse complexity, and cover edge cases."
            )
            return {
                "score": score,
                "verdict": _score_to_verdict(score),
                "covered_points": covered_points,
                "missing_points": missing_points,
                "feedback": feedback,
                "improved_answer": improved_answer,
                "graded_by": "ai",
            }
        except (TypeError, ValueError):
            pass

    keywords = _extract_keywords(model_approach)
    answer_lower = answer_text.lower()

    covered = [kw for kw in keywords if kw in answer_lower]
    missing = [kw for kw in keywords if kw not in answer_lower]

    coverage = (len(covered) / len(keywords)) if keywords else 0.5
    wc = len(answer_text.split())
    score = max(0, min(10, round(10 * (0.7 * coverage + 0.3 * min(1.0, wc / 80.0)))))

    if score >= 8:
        feedback = (
            "Strong response hitting most core ideas from the model approach with solid detail. "
            "Double-check any remaining edge cases or complexity bounds."
        )
    elif score >= 6:
        feedback = (
            "Good explanation covering several key concepts. "
            "Incorporating the missing terms and explicitly stating time/space trade-offs would strengthen it further."
        )
    elif score >= 4:
        feedback = (
            "Partial answer that touches on the topic but misses key technical steps. "
            "Expand your explanation around the core data structures or workflow below."
        )
    else:
        feedback = (
            "Brief or incomplete response relative to the expected interview points. "
            "Review the key concepts below and explain both how and why your approach works."
        )

    improved = (
        model_approach.strip()
        or "Structure your answer: restate the problem, outline the approach, analyse complexity, and cover edge cases."
    )

    return {
        "score": score,
        "verdict": _score_to_verdict(score),
        "covered_points": [f"Mentioned: {kw}" for kw in covered[:6]],
        "missing_points": [f"Consider covering: {kw}" for kw in missing[:6]],
        "feedback": feedback,
        "improved_answer": improved,
        "graded_by": "heuristic",
    }
