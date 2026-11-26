import json
import logging
import re
from typing import List, Dict, Any, Optional
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)

_FILLER_PATTERNS = [
    r"\bum+\b",
    r"\buh+\b",
    r"\berm+\b",
    r"\blike\b",
    r"\byou know\b",
    r"\bbasically\b",
    r"\bactually\b",
    r"\bliterally\b",
    r"\bkind of\b",
    r"\bsort of\b",
    r"\bi mean\b",
    r"\bi guess\b",
]


def analyze_speech_and_knowledge_gaps(
    answer_text: str,
    question_text: str = "",
    category: str = "Technical",
) -> Dict[str, Any]:
    """
    Detect filler words, missing technical depth (complexity/metrics/trade-offs),
    and structural weaknesses in a candidate answer.
    """
    lower = (answer_text or "").lower()
    words = (answer_text or "").split()
    word_count = len(words)

    filler_counts: Dict[str, int] = {}
    total_fillers = 0
    for pat in _FILLER_PATTERNS:
        matches = re.findall(pat, lower)
        if matches:
            label = matches[0].strip()
            filler_counts[label] = filler_counts.get(label, 0) + len(matches)
            total_fillers += len(matches)

    has_complexity = bool(
        re.search(
            r"\bo\s*\(|time complexity|space complexity|latency|throughput|logarithmic|linear|amortized",
            lower,
        )
    )
    has_tradeoffs = bool(
        re.search(
            r"trade-?off|edge case|bottleneck|fallback|failover|consistency|concurrency|index|cache|lock",
            lower,
        )
    )
    has_structure = bool(
        re.search(
            r"first|second|finally|for example|because|result|measured|improved|reduced",
            lower,
        )
    )

    mistakes: List[str] = []
    if word_count < 25:
        mistakes.append("Answer was too brief and lacked concrete implementation walk-through")
    if not has_complexity and category in ("Technical", "Problem Solving", "System Design"):
        mistakes.append("Did not state time/space complexity or latency/throughput bounds")
    if not has_tradeoffs and category in ("Technical", "System Design", "Domain Application"):
        mistakes.append("Missed architectural trade-offs, edge cases, or failure-mode handling")
    if not has_structure:
        mistakes.append("Lacked structured STAR / step-by-step progression and measurable impact")
    if total_fillers >= 3:
        top_f = ", ".join(f"'{k}' ({v}x)" for k, v in list(filler_counts.items())[:3])
        mistakes.append(f"High filler-word usage ({total_fillers} fillers: {top_f})")

    return {
        "word_count": word_count,
        "total_fillers": total_fillers,
        "filler_counts": filler_counts,
        "has_complexity": has_complexity,
        "has_tradeoffs": has_tradeoffs,
        "has_structure": has_structure,
        "mistakes": mistakes,
    }


class InterviewService:
    @staticmethod
    def extract_resume_profile(resume_text: str) -> Dict[str, Any]:
        """
        Extract candidate skills, years/background, and project highlights from resume text.
        """
        system_instruction = (
            "You are a technical talent assessor. Extract candidate skills, primary technologies, "
            "and a 2-sentence career summary from the provided resume text. Respond strictly in JSON."
        )

        prompt = f"""
Candidate Resume Text:
{resume_text[:3000]}

Extract into JSON:
{{
  "skills": ["Skill1", "Skill2", "Skill3"],
  "summary": "Brief summary of candidate experience and focus areas"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "skills" not in result or not result["skills"]:
            found_skills = []
            keywords = [
                "Python", "JavaScript", "TypeScript", "React", "Next.js", "FastAPI",
                "Node.js", "SQL", "PostgreSQL", "Docker", "AWS", "Git", "Machine Learning",
                "Data Structures", "Algorithms", "REST API", "Tailwind", "CSS", "HTML"
            ]
            resume_lower = resume_text.lower()
            for kw in keywords:
                if kw.lower() in resume_lower:
                    found_skills.append(kw)

            if not found_skills:
                found_skills = ["Software Engineering", "Problem Solving", "System Architecture"]

            result = {
                "skills": found_skills[:8],
                "summary": f"Candidate with demonstrated proficiency in {', '.join(found_skills[:4])} based on uploaded profile."
            }

        return result

    @staticmethod
    def generate_next_question(
        job_title: str,
        job_description: str,
        candidate_skills: List[str],
        question_index: int,
        current_difficulty: str,
        previous_qa: List[Dict[str, Any]],
        past_session_mistakes: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Generate the next question adapted to candidate's prior performance, explicitly
        remembering and probing previous mistakes from earlier questions or past sessions.
        """
        categories = ["Technical", "System Design", "Behavioral", "Problem Solving", "Domain Application"]
        cat = categories[(question_index - 1) % len(categories)]

        # Identify the most recent mistake in this session or from previous sessions
        recent_mistake: Optional[Dict[str, Any]] = None
        for q in reversed(previous_qa or []):
            score = q.get("score")
            q_mistakes = q.get("mistakes") or []
            if (score is not None and score <= 3) or q_mistakes:
                recent_mistake = {
                    "source": f"Question {q.get('index')}",
                    "question_text": q.get("question_text", ""),
                    "candidate_answer": q.get("candidate_answer", ""),
                    "feedback": q.get("feedback", ""),
                    "ideal_points": q.get("ideal_points", ""),
                    "mistakes": q_mistakes,
                    "category": q.get("category", cat),
                }
                break

        if not recent_mistake and past_session_mistakes:
            pm = past_session_mistakes[0]
            recent_mistake = {
                "source": "a previous interview session",
                "question_text": pm.get("question_text", ""),
                "candidate_answer": pm.get("candidate_answer", ""),
                "feedback": pm.get("feedback", ""),
                "ideal_points": pm.get("ideal_points", ""),
                "mistakes": pm.get("mistakes", []),
                "category": pm.get("category", cat),
            }

        system_instruction = (
            "You are a sharp, attentive senior technical interviewer with full memory of the candidate's "
            "previous answers and mistakes. When the candidate made a mistake, gave a shallow answer, or "
            "missed edge cases/complexity in an earlier question (or past session), your next question MUST "
            "explicitly follow up on that mistake or probe the weak concept deeper. Respond strictly in JSON."
        )

        history_summary = ""
        if previous_qa:
            lines = []
            for q in previous_qa:
                m_str = "; ".join(q.get("mistakes") or [])
                lines.append(
                    f"Q{q.get('index')} ({q.get('category', 'Technical')} - {q.get('difficulty')}): {q.get('question_text')}\n"
                    f"  Candidate Answer: {str(q.get('candidate_answer') or '')[:350]}\n"
                    f"  Score: {q.get('score', 'N/A')}/5 | Feedback: {q.get('feedback', '')} | Missed/Mistakes: {m_str or q.get('ideal_points', '')}"
                )
            history_summary = "\n".join(lines)

        mistake_directive = ""
        if recent_mistake:
            missed_detail = (
                "; ".join(recent_mistake["mistakes"])
                if recent_mistake.get("mistakes")
                else (recent_mistake.get("feedback") or recent_mistake.get("ideal_points") or "depth and edge-case handling")
            )
            mistake_directive = (
                f"\nIMPORTANT MISTAKE MEMORY DIRECTIVE:\n"
                f"In {recent_mistake['source']} (\"{recent_mistake['question_text'][:140]}\"), "
                f"the candidate struggled with: {missed_detail}.\n"
                f"You MUST frame Question #{question_index} to directly test or follow up on this gap "
                f"(begin the question by briefly referencing their earlier gap/answer so they know you remember)."
            )

        prompt = f"""
Role: {job_title}
Job Requirements: {job_description[:1000]}
Candidate Skills: {', '.join(candidate_skills)}
Target Question #{question_index}
Difficulty Level: {current_difficulty}
Category: {cat}

Previous Interview Progression & Mistakes:
{history_summary if history_summary else "This is the initial question of this session."}
{mistake_directive}

Generate the next question as JSON:
{{
  "question_text": "The exact interview question prompt spoken to candidate (referencing their previous mistake if applicable)",
  "difficulty": "{current_difficulty}",
  "category": "{cat}",
  "ideal_points": "Key points or concepts a great answer should mention"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "question_text" not in result:
            # Mistake-aware deterministic adaptive fallback!
            if recent_mistake:
                prev_q_short = recent_mistake["question_text"][:90].rstrip("?. ")
                mistakes_list = recent_mistake.get("mistakes") or []
                primary_gap = (
                    mistakes_list[0]
                    if mistakes_list
                    else "edge-case trade-offs and complexity guarantees"
                )
                follow_ups = {
                    "Technical": (
                        f"Following up on your earlier answer regarding \"{prev_q_short}\" "
                        f"where {primary_gap.lower()}: can you walk through the exact internal data structures, "
                        f"time/space complexity bounds, and how your implementation behaves under worst-case input?"
                    ),
                    "System Design": (
                        f"Building on your previous response where {primary_gap.lower()}: "
                        f"how would you redesign that component for {job_title} to prevent single points of failure, "
                        f"handle 10x traffic spikes, and maintain data consistency?"
                    ),
                    "Behavioral": (
                        f"Earlier we touched on a technical gap around \"{prev_q_short}\". "
                        f"Tell me about a real situation where you made a technical mistake or missed an edge case in a project—"
                        f"how did you diagnose it, fix it, and measure the result (using STAR)?"
                    ),
                    "Problem Solving": (
                        f"Revisiting the gap from {recent_mistake['source']} ({primary_gap.lower()}): "
                        f"if that exact bottleneck caused p99 latency to spike in production, what step-by-step "
                        f"instrumentation and algorithmic fix would you deploy?"
                    ),
                    "Domain Application": (
                        f"To dig deeper into {recent_mistake['source']} where {primary_gap.lower()}: "
                        f"what concrete concurrency, security, and indexing trade-offs would you enforce in a production {job_title} environment?"
                    ),
                }
                q_text = follow_ups.get(cat, follow_ups["Technical"])
                ideal = (
                    f"Directly address the previous gap ({primary_gap}), state explicit O(...) complexity or SLA numbers, "
                    f"and cover concrete failure recovery."
                )
            else:
                templates = {
                    "Technical": f"Can you explain your experience working with {candidate_skills[0] if candidate_skills else 'core technologies'} in the context of {job_title}, including time/space complexity and key trade-offs?",
                    "System Design": f"How would you approach designing a scalable, fault-tolerant service architecture for {job_title}, and how do you handle caching and database bottlenecks?",
                    "Behavioral": "Tell me about a challenging technical hurdle or production bug you faced in a recent project and how you resolved it (Situation, Task, Action, Result).",
                    "Problem Solving": "If an unexpected production latency spike occurred in a system you built, how would you isolate the root cause and verify the fix?",
                    "Domain Application": f"How do you evaluate security, concurrency, and performance trade-offs when delivering features for {job_title}?"
                }
                q_text = templates.get(cat, f"How do your technical capabilities align with the core requirements of {job_title}?")
                ideal = "Clear structured explanation, concrete examples, complexity/latency considerations, and measurable impact."

            result = {
                "question_text": q_text,
                "difficulty": current_difficulty,
                "category": cat,
                "ideal_points": ideal,
            }

        return result

    @staticmethod
    def evaluate_answer(
        question_text: str,
        difficulty: str,
        category: str,
        answer_text: str,
        job_title: str
    ) -> Dict[str, Any]:
        """
        Evaluate candidate's response on a 1-5 scale with multi-dimensional criteria,
        filler-word & mistake diagnostics, and constructive feedback.
        """
        diag = analyze_speech_and_knowledge_gaps(answer_text, question_text, category)
        word_count = diag["word_count"]
        total_fillers = diag["total_fillers"]

        system_instruction = (
            "You are an expert interview coach. Evaluate the candidate's answer constructively. "
            "Scores range from 1 (poor / unresponsive) to 5 (exceptional). "
            "Pinpoint specific mistakes or omitted concepts so the interviewer can follow up on them next. "
            "Respond strictly in JSON."
        )

        prompt = f"""
Target Role: {job_title}
Question ({category} - {difficulty}): {question_text}
Candidate's Answer: {answer_text}
Detected Diagnostics: {word_count} words, {total_fillers} filler words, mistakes={diag['mistakes']}

Provide structured evaluation in JSON:
{{
  "overall_score": 4,
  "technical_score": 4,
  "clarity_score": 4,
  "relevance_score": 5,
  "feedback": "Constructive feedback on what was strong, specific mistakes/omissions made, and filler-word / structure coaching",
  "ideal_points": "Key concepts that distinguish an outstanding answer for this question",
  "suggested_next_difficulty": "Easy | Medium | Hard"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "overall_score" not in result:
            if word_count < 15:
                score, tech, clarity, relevance = 2, 2, 3, 2
                feedback = (
                    "Answer is quite brief. Expanding with concrete data structures, time/space complexity, "
                    "and edge-case trade-offs will significantly strengthen your response."
                )
                next_diff = "Easy" if difficulty == "Medium" else "Medium"
            elif word_count < 50:
                score, tech, clarity, relevance = 3, 3, 4, 3
                feedback = (
                    "Solid baseline answer addressing the core prompt. To score 4–5, explicitly state "
                    "complexity bounds, failure modes, and measurable outcomes."
                )
                next_diff = difficulty
            elif word_count < 150:
                score, tech, clarity, relevance = 4, 4, 4, 4
                feedback = (
                    "Well-articulated response with good technical depth and logical structure. "
                    "Consider adding worst-case edge cases to make it airtight."
                )
                next_diff = "Hard" if difficulty == "Medium" else "Hard"
            else:
                score, tech, clarity, relevance = 5, 5, 5, 5
                feedback = (
                    "Exceptional, comprehensive answer covering architectural implications, edge cases, "
                    "and practical trade-offs."
                )
                next_diff = "Hard"

            if total_fillers >= 3:
                clarity = max(1, clarity - 1)
                top_f = ", ".join(f"'{k}' ({v}x)" for k, v in list(diag["filler_counts"].items())[:3])
                feedback += f" Coaching note: detected {total_fillers} filler words ({top_f})—replace fillers with a deliberate 1-second pause."

            if diag["mistakes"]:
                feedback += f" Next question will follow up on: {diag['mistakes'][0].lower()}."

            result = {
                "overall_score": score,
                "technical_score": tech,
                "clarity_score": clarity,
                "relevance_score": relevance,
                "feedback": feedback,
                "ideal_points": (
                    "; ".join(diag["mistakes"])
                    if diag["mistakes"]
                    else "Clear communication, specific technical decisions, complexity analysis, and measurable impact."
                ),
                "suggested_next_difficulty": next_diff,
            }

        result["overall_score"] = max(1, min(5, int(result.get("overall_score", 3))))
        result["technical_score"] = max(1, min(5, int(result.get("technical_score", 3))))
        result["clarity_score"] = max(1, min(5, int(result.get("clarity_score", 3))))
        result["relevance_score"] = max(1, min(5, int(result.get("relevance_score", 3))))
        result["mistakes"] = diag["mistakes"]

        if result["overall_score"] >= 4:
            result["next_difficulty"] = "Hard" if difficulty != "Hard" else "Hard"
        elif result["overall_score"] <= 2:
            result["next_difficulty"] = "Easy" if difficulty != "Easy" else "Easy"
        else:
            result["next_difficulty"] = "Medium"

        return result

    @staticmethod
    def generate_final_report(
        session_id: str,
        job_title: str,
        questions_evaluations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compile full interview analytics report including the 5 Actionable Coaching Pillars:
        1. Filler Words & Speech Fluency
        2. Knowledge Gaps & Previous Mistakes
        3. Technical Depth & Complexity Analysis
        4. Answer Structure & Conciseness (STAR)
        5. Role & Company Rubric Alignment
        """
        if not questions_evaluations:
            raise ValueError("No interview questions found to compile final report.")

        n = len(questions_evaluations)
        avg_overall = sum(q.get("score", 3) for q in questions_evaluations) / n
        avg_tech = sum(q.get("technical_score", 3) for q in questions_evaluations) / n
        avg_comm = sum(q.get("clarity_score", 3) for q in questions_evaluations) / n
        avg_rel = sum(q.get("relevance_score", 3) for q in questions_evaluations) / n

        percentage_score = round((avg_overall / 5.0) * 100, 1)

        # Aggregate diagnostics across all answers for the 5 Actionable Coaching Items
        total_words = 0
        total_fillers = 0
        agg_fillers: Dict[str, int] = {}
        complexity_hits = 0
        tradeoff_hits = 0
        structure_hits = 0
        weak_questions: List[str] = []

        for q in questions_evaluations:
            ans = str(q.get("candidate_answer") or "")
            d = analyze_speech_and_knowledge_gaps(ans, str(q.get("question_text") or ""))
            total_words += d["word_count"]
            total_fillers += d["total_fillers"]
            for k, v in d["filler_counts"].items():
                agg_fillers[k] = agg_fillers.get(k, 0) + v
            if d["has_complexity"]:
                complexity_hits += 1
            if d["has_tradeoffs"]:
                tradeoff_hits += 1
            if d["has_structure"]:
                structure_hits += 1
            if (q.get("score") or 3) <= 3:
                weak_questions.append(f"Q{q.get('question_index')}: {str(q.get('question_text') or '')[:70]}...")

        avg_words = round(total_words / max(1, n))
        top_fillers_str = (
            ", ".join(f"'{k}' ({v}x)" for k, v in sorted(agg_fillers.items(), key=lambda x: -x[1])[:4])
            if agg_fillers
            else "0 fillers detected"
        )

        five_action_items = [
            f"1. Filler Words & Speech Fluency: Detected {total_fillers} filler word(s) across {total_words} words ({top_fillers_str}). Drill: Pause silently for 1 second before transitions instead of saying 'um', 'like', or 'basically'.",
            f"2. Knowledge Gaps & Mistake Recovery: {len(weak_questions)} of {n} question(s) scored <= 3/5 ({'; '.join(weak_questions[:2]) if weak_questions else 'no major conceptual drops'}). Drill: Re-answer weak questions by stating the core invariant first.",
            f"3. Technical Depth & Complexity Bounds: Stated explicit complexity/latency bounds in {complexity_hits}/{n} answers and trade-offs/edge cases in {tradeoff_hits}/{n} answers. Drill: Always close technical answers with Time O(...), Space O(...), and 1 failure mode.",
            f"4. Answer Structure & Pacing (STAR): Averaged {avg_words} words/answer with clear structural signposts in {structure_hits}/{n} answers. Drill: Target 75–140 words using Situation -> Action -> Trade-off -> Quantified Result.",
            f"5. Role & Rubric Alignment ({job_title}): Achieved {avg_rel:.1f}/5 role relevance. Drill: Connect every architectural choice directly back to {job_title} production reliability and user impact.",
        ]

        system_instruction = (
            "You are an executive talent coach. Analyze the candidate's interview session across questions. "
            "Produce structured strengths, 5 concrete areas to work on (1. Filler words, 2. Knowledge gaps/mistakes, "
            "3. Technical depth/complexity, 4. STAR structure/pacing, 5. Role alignment), and prioritized study recommendations. "
            "Remind the student constructively that this practice report is an educational simulation, not an objective hiring outcome."
        )

        qa_summary = "\n".join([
            f"Q{q.get('question_index')}: {q.get('question_text')} | Answer: {q.get('candidate_answer', 'None')} | Score: {q.get('score')}/5"
            for q in questions_evaluations
        ])

        prompt = f"""
Role: {job_title}
Performance Data:
- Average Score: {avg_overall:.1f}/5
- Technical: {avg_tech:.1f}/5
- Communication: {avg_comm:.1f}/5
- Relevance: {avg_rel:.1f}/5
- Speech & Mistake Diagnostics: {total_fillers} fillers ({top_fillers_str}), avg {avg_words} words/answer, complexity in {complexity_hits}/{n} answers.

Question Details:
{qa_summary}

Respond in JSON:
{{
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["1. Filler Words & Fluency: ...", "2. Knowledge Gaps & Mistakes: ...", "3. Technical Depth & Complexity: ...", "4. Answer Structure (STAR): ...", "5. Role Alignment: ..."],
  "recommended_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "detailed_summary": "In-depth 3-paragraph evaluation explaining the performance breakdown and encouragement"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "strengths" not in result:
            strengths = [
                f"Consistent problem articulation and engagement across {n} adaptive interview questions.",
                f"Maintained an average response length of {avg_words} words with {avg_rel:.1f}/5 role relevance.",
                "Demonstrated adaptability when probed on follow-up technical constraints."
            ]
            recommended_topics = [
                "Time & space complexity analysis + worst-case edge cases",
                "System architecture scalability, indexing, and failure recovery",
                "Eliminating speech filler words using structured STAR signposting"
            ]
            detailed_summary = (
                f"The candidate achieved an overall performance score of {percentage_score}% across {n} mistake-aware adaptive interview questions for the {job_title} role.\n\n"
                f"Technical knowledge averaged {avg_tech:.1f}/5, communication clarity rated {avg_comm:.1f}/5 ({total_fillers} filler words detected across {total_words} total words), and answer relevance scored {avg_rel:.1f}/5.\n\n"
                "Educational Note: This simulation score is designed to highlight areas for self-directed practice and mock interview readiness. It does not constitute an objective employment determination."
            )
            result = {
                "strengths": strengths,
                "improvements": five_action_items,
                "recommended_topics": recommended_topics,
                "detailed_summary": detailed_summary
            }
        else:
            # Ensure all 5 actionable coaching pillars are always present
            raw_imps = result.get("improvements")
            if not isinstance(raw_imps, list) or len(raw_imps) < 5:
                result["improvements"] = five_action_items

        return {
            "session_id": session_id,
            "overall_score": percentage_score,
            "technical_score": round(avg_tech, 1),
            "communication_score": round(avg_comm, 1),
            "relevance_score": round(avg_rel, 1),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", five_action_items),
            "recommended_topics": result.get("recommended_topics", []),
            "detailed_summary": result.get("detailed_summary", "")
        }
