import json
import logging
from typing import List, Dict, Any, Tuple
from app.services.llm_service import llm_service
from app.services.grounding_service import GroundingService

logger = logging.getLogger(__name__)


class QuizService:
    @staticmethod
    def generate_five_question_quiz(
        module_title: str,
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate exactly 5 grounded multiple-choice questions for the module.
        Each question contains:
        - question_text
        - options (4 options)
        - correct_option_index (0 to 3)
        - explanation
        - source_chunk_id (verified against chunks)
        - source_text_snippet (verbatim grounded extract)
        """
        if not chunks:
            raise ValueError("No source chunks available to generate quiz questions.")

        if not GroundingService.assert_sufficient_context(chunks, min_words=15):
            raise ValueError("Insufficient document text to formulate factual, grounded quiz questions.")

        # Prepare context blocks with explicit chunk IDs
        context_blocks = []
        for c in chunks[:min(len(chunks), 8)]:
            context_blocks.append(f"CHUNK ID: {c['id']}\nPAGE: {c['page_number']}\nTEXT: {c['content']}")

        full_context = "\n\n---\n\n".join(context_blocks)

        system_instruction = (
            "You are an academic testing specialist. You formulate rigorous 5-question multiple choice quizzes based strictly "
            "on provided educational text. Every single question MUST cite an exact CHUNK ID from the provided context in source_chunk_id. "
            "Every question must have exactly 4 choices (index 0 to 3), 1 correct answer index, a clear explanation, and a verbatim snippet. "
            "Never hallucinate facts not present in the provided chunks."
        )

        prompt = f"""
Module Topic: {module_title}

Verified Source Context:
{full_context}

Generate exactly 5 grounded multiple-choice questions in this JSON schema:
{{
  "questions": [
    {{
      "question_text": "Clear, direct conceptual or factual question?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_option_index": 0,
      "explanation": "Detailed explanation clarifying why the correct option is right and others are incorrect based on the textbook.",
      "source_chunk_id": "exact_chunk_id_from_above_context",
      "source_text_snippet": "Exact phrase or sentence from the source chunk"
    }}
  ]
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        questions = result.get("questions", []) if result else []

        # Validate that we have 5 valid grounded questions
        valid_chunk_ids = {c["id"]: c for c in chunks}
        validated_questions = []

        for q in questions:
            cid = q.get("source_chunk_id")
            if cid in valid_chunk_ids and len(q.get("options", [])) == 4 and 0 <= q.get("correct_option_index", 0) <= 3:
                chunk = valid_chunk_ids[cid]
                snippet = q.get("source_text_snippet") or GroundingService.extract_supporting_snippet(chunk["content"], q.get("question_text", ""))
                q["source_text_snippet"] = snippet
                validated_questions.append(q)

        # If LLM didn't return 5 valid questions, complete with deterministic grounded generator
        if len(validated_questions) < 5:
            fallback_questions = QuizService._generate_heuristic_grounded_questions(module_title, chunks, needed=5 - len(validated_questions))
            validated_questions.extend(fallback_questions)

        return validated_questions[:5]

    @staticmethod
    def _generate_heuristic_grounded_questions(
        module_title: str,
        chunks: List[Dict[str, Any]],
        needed: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate grounded questions directly extracted from verified textbook chunks.
        Guarantees 100% adherence to source_chunk_id without hallucination.
        """
        generated = []
        for i in range(needed):
            c = chunks[i % len(chunks)]
            content = c["content"]
            sentences = [s.strip() for s in content.split(".") if len(s.strip()) > 25]
            target_sentence = sentences[i % len(sentences)] if sentences else content[:100]

            words = target_sentence.split()
            concept = " ".join(words[:4]) if len(words) >= 4 else "This principle"

            question_text = f"According to the source text on {module_title}, what is stated regarding: \"{concept}\"?"
            correct_option = f"It states that {target_sentence.lower()}."
            distractor_1 = f"It is solely applicable under secondary conditions not mentioned in the text."
            distractor_2 = f"It is superseded by alternative theories without empirical confirmation."
            distractor_3 = f"It has no direct relationship to the principles described in {module_title}."

            options = [correct_option, distractor_1, distractor_2, distractor_3]
            # Rotate correct option index across 0, 1, 2, 3
            target_correct_idx = i % 4
            if target_correct_idx != 0:
                options[0], options[target_correct_idx] = options[target_correct_idx], options[0]

            snippet = target_sentence[:220]

            generated.append({
                "question_text": question_text,
                "options": options,
                "correct_option_index": target_correct_idx,
                "explanation": f"Grounded in textbook page {c['page_number']}: \"{snippet}\". The textbook explicitly confirms this assertion.",
                "source_chunk_id": c["id"],
                "source_text_snippet": snippet
            })

        return generated

    @staticmethod
    def evaluate_quiz_submission(
        quiz_questions: List[Any],
        user_answers: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluate student's answers, score the attempt, and provide instant explanation feedback.
        """
        answer_map = {a["question_id"]: a["selected_option_index"] for a in user_answers}
        total_questions = len(quiz_questions)
        correct_count = 0
        feedback_list = []

        for q in quiz_questions:
            q_id = str(q.id)
            selected_idx = answer_map.get(q_id, -1)
            is_correct = (selected_idx == q.correct_option_index)
            if is_correct:
                correct_count += 1

            options = json.loads(q.options_json) if isinstance(q.options_json, str) else q.options_json

            feedback_list.append({
                "question_id": q_id,
                "question_text": q.question_text,
                "options": options,
                "selected_option_index": selected_idx,
                "correct_option_index": q.correct_option_index,
                "is_correct": is_correct,
                "explanation": q.explanation,
                "source_chunk_id": q.source_chunk_id,
                "source_text_snippet": q.source_text_snippet
            })

        percentage = round((correct_count / total_questions * 100), 1) if total_questions > 0 else 0.0

        return {
            "score": correct_count,
            "total_questions": total_questions,
            "percentage": percentage,
            "feedback": feedback_list
        }
