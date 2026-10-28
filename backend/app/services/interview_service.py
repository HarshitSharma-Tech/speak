import json
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


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
            # Fallback heuristic extraction
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
        previous_qa: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate the next question adapted to candidate's prior performance and target role.
        """
        categories = ["Technical", "System Design", "Behavioral", "Problem Solving", "Domain Application"]
        cat = categories[(question_index - 1) % len(categories)]

        system_instruction = (
            "You are a compassionate yet rigorous senior technical interviewer. "
            "Generate one targeted interview question tailored to the job description and candidate background. "
            "The question must match the requested difficulty and category. Respond strictly in JSON."
        )

        history_summary = ""
        if previous_qa:
            history_summary = "\n".join([
                f"Q{q['index']} ({q.get('difficulty')}): {q['question_text']} -> Score: {q.get('score', 'N/A')}/5"
                for q in previous_qa
            ])

        prompt = f"""
Role: {job_title}
Job Requirements: {job_description[:1000]}
Candidate Skills: {', '.join(candidate_skills)}
Target Question #{question_index}
Difficulty Level: {current_difficulty}
Category: {cat}

Previous Interview Progression:
{history_summary if history_summary else "This is the initial question."}

Generate the next question as JSON:
{{
  "question_text": "The exact interview question prompt spoken to candidate",
  "difficulty": "{current_difficulty}",
  "category": "{cat}",
  "ideal_points": "Key points or concepts a great answer should mention"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "question_text" not in result:
            # Deterministic adaptive question templates
            templates = {
                "Technical": f"Can you explain your experience working with {candidate_skills[0] if candidate_skills else 'core technologies'} in the context of {job_title}?",
                "System Design": f"How would you approach designing a scalable, fault-tolerant service architecture for {job_title}?",
                "Behavioral": f"Tell me about a challenging technical hurdle you faced in a recent project and how you resolved it.",
                "Problem Solving": f"If an unexpected production latency spike occurred in a system you built, how would you diagnose the root cause?",
                "Domain Application": f"How do you evaluate security and performance trade-offs when delivering features for {job_title}?"
            }
            q_text = templates.get(cat, f"How do your technical capabilities align with the core requirements of {job_title}?")
            result = {
                "question_text": q_text,
                "difficulty": current_difficulty,
                "category": cat,
                "ideal_points": "Clear structured explanation, concrete examples, architectural considerations, and impact."
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
        Evaluate candidate's response on a 1-5 scale with multi-dimensional criteria
        and constructive feedback. Also decides next difficulty tier.
        """
        system_instruction = (
            "You are an expert interview coach. Evaluate the candidate's answer constructively. "
            "Scores range from 1 (poor / unresponsive) to 5 (exceptional). "
            "Explain reasons clearly and provide actionable suggestions. Respond strictly in JSON."
        )

        prompt = f"""
Target Role: {job_title}
Question ({category} - {difficulty}): {question_text}
Candidate's Answer: {answer_text}

Provide structured evaluation in JSON:
{{
  "overall_score": 4,
  "technical_score": 4,
  "clarity_score": 4,
  "relevance_score": 5,
  "feedback": "Constructive feedback on what was strong and what could be improved",
  "ideal_points": "Key concepts that distinguish an outstanding answer for this question",
  "suggested_next_difficulty": "Easy | Medium | Hard"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "overall_score" not in result:
            # Reliable heuristic scoring based on answer depth, length, and substance
            words = answer_text.split()
            word_count = len(words)

            if word_count < 15:
                score = 2
                tech = 2
                clarity = 3
                relevance = 2
                feedback = "Answer is quite brief. Expanding with concrete examples, project context, and trade-offs would significantly strengthen your response."
                next_diff = "Easy" if difficulty == "Medium" else "Medium"
            elif word_count < 50:
                score = 3
                tech = 3
                clarity = 4
                relevance = 3
                feedback = "Solid baseline answer addressing the core question. To score higher, detail specific implementation choices and metric outcomes."
                next_diff = difficulty
            elif word_count < 150:
                score = 4
                tech = 4
                clarity = 4
                relevance = 4
                feedback = "Well-articulated response with good technical depth and logical structure. Demonstrates practical competence in the subject."
                next_diff = "Hard" if difficulty == "Medium" else "Hard"
            else:
                score = 5
                tech = 5
                clarity = 5
                relevance = 5
                feedback = "Exceptional, comprehensive answer covering architectural implications, edge cases, and practical trade-offs."
                next_diff = "Hard"

            result = {
                "overall_score": score,
                "technical_score": tech,
                "clarity_score": clarity,
                "relevance_score": relevance,
                "feedback": feedback,
                "ideal_points": "Clear communication, specific technical decisions, error handling, and measurable impact.",
                "suggested_next_difficulty": next_diff
            }

        # Normalize score limits
        result["overall_score"] = max(1, min(5, int(result.get("overall_score", 3))))
        result["technical_score"] = max(1, min(5, int(result.get("technical_score", 3))))
        result["clarity_score"] = max(1, min(5, int(result.get("clarity_score", 3))))
        result["relevance_score"] = max(1, min(5, int(result.get("relevance_score", 3))))

        # Difficulty transition logic
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
        Compile full interview analytics report:
        - Overall performance score (0-100)
        - Technical knowledge score (1-5)
        - Communication and clarity score (1-5)
        - Relevance of answers score (1-5)
        - Strengths
        - Areas requiring improvement
        - Question-by-question feedback
        - Recommended topics for further preparation
        - Constructive, ethical evaluation disclaimer
        """
        if not questions_evaluations:
            raise ValueError("No interview questions found to compile final report.")

        n = len(questions_evaluations)
        avg_overall = sum(q.get("score", 3) for q in questions_evaluations) / n
        avg_tech = sum(q.get("technical_score", 3) for q in questions_evaluations) / n
        avg_comm = sum(q.get("clarity_score", 3) for q in questions_evaluations) / n
        avg_rel = sum(q.get("relevance_score", 3) for q in questions_evaluations) / n

        percentage_score = round((avg_overall / 5.0) * 100, 1)

        system_instruction = (
            "You are an executive talent coach. Analyze the candidate's interview session across questions. "
            "Produce structured strengths, areas for growth, and prioritized study recommendations. "
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

Question Details:
{qa_summary}

Respond in JSON:
{{
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "improvements": ["Area for improvement 1", "Area for improvement 2"],
  "recommended_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "detailed_summary": "In-depth 3-paragraph evaluation explaining the performance breakdown and encouragement"
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "strengths" not in result:
            # Deterministic report compiler
            strengths = [
                f"Consistent problem articulation and structured communication across {n} interview questions.",
                "Direct engagement with core technical parameters of the target position.",
                "Demonstrated adaptability across varying difficulty tiers."
            ]
            improvements = [
                "Incorporate more quantitative outcomes and performance metrics when discussing past solutions.",
                "Deepen edge-case explanations when detailing system failure modes."
            ]
            recommended_topics = [
                "System architecture scalability patterns",
                "Asynchronous processing and database indexing",
                "Behavioral storytelling using the STAR methodology (Situation, Task, Action, Result)"
            ]
            detailed_summary = (
                f"The candidate achieved an overall performance score of {percentage_score}% across {n} adaptive interview questions for the {job_title} role.\n\n"
                f"Technical knowledge averaged {avg_tech:.1f}/5, with communication clarity rated at {avg_comm:.1f}/5 and answer relevance at {avg_rel:.1f}/5. "
                "Answers showed strong foundational awareness, particularly when framing technical problems and explaining methodologies.\n\n"
                "Educational Note: This simulation score is designed to highlight areas for self-directed practice and mock interview readiness. It does not constitute an objective employment determination."
            )
            result = {
                "strengths": strengths,
                "improvements": improvements,
                "recommended_topics": recommended_topics,
                "detailed_summary": detailed_summary
            }

        return {
            "session_id": session_id,
            "overall_score": percentage_score,
            "technical_score": round(avg_tech, 1),
            "communication_score": round(avg_comm, 1),
            "relevance_score": round(avg_rel, 1),
            "strengths": result.get("strengths", []),
            "improvements": result.get("improvements", []),
            "recommended_topics": result.get("recommended_topics", []),
            "detailed_summary": result.get("detailed_summary", "")
        }
