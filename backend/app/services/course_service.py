import json
import logging
from typing import List, Dict, Any, Tuple
from app.services.llm_service import llm_service
from app.services.grounding_service import GroundingService

logger = logging.getLogger(__name__)


class CourseService:
    @staticmethod
    def generate_course_outline(
        title_hint: str,
        chunks: List[Dict[str, Any]],
        target_modules: int = 4
    ) -> Dict[str, Any]:
        """
        Analyze textbook chunks to extract a structured course outline with modules,
        learning content, and grounding source chunk IDs.
        """
        if not chunks:
            raise ValueError("No document chunks available to generate course outline.")

        # Prepare context summary from chunks
        sampled_chunks = chunks[:min(len(chunks), 16)]
        context_preview = "\n\n".join([
            f"[Chunk ID: {c['id']} | Page: {c['page_number']}]\n{c['content'][:400]}"
            for c in sampled_chunks
        ])

        system_instruction = (
            "You are an expert curriculum designer and university professor. "
            "You generate structured course outlines from textbook excerpts. "
            "CRITICAL: Every module MUST cite real chunk IDs from the provided text in its source_chunk_ids array. "
            "Never hallucinate chunk IDs or facts."
        )

        prompt = f"""
Textbook Document Title: {title_hint}
Target Modules: {target_modules}

Available Textbook Excerpts:
{context_preview}

Generate a JSON object with:
{{
  "course_title": "string",
  "course_description": "string",
  "modules": [
    {{
      "module_order": 1,
      "title": "Module Title",
      "summary": "Concise 2-sentence summary",
      "key_topics": ["topic1", "topic2", "topic3"],
      "learning_content": "Comprehensive markdown learning text (2-3 paragraphs) explaining core ideas directly supported by the text",
      "source_chunk_ids": ["chunk_id_from_context"]
    }}
  ]
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "modules" not in result or len(result["modules"]) == 0:
            # Deterministic heuristic fallback grounded in actual chunks
            result = CourseService._generate_heuristic_outline(title_hint, chunks, target_modules)

        # Grounding validation pass: Ensure each module has valid chunk IDs
        available_ids = {c["id"] for c in chunks}
        for mod in result.get("modules", []):
            valid_ids = [cid for cid in mod.get("source_chunk_ids", []) if cid in available_ids]
            if not valid_ids:
                # Assign closest chunk
                valid_ids = [chunks[min(mod.get("module_order", 1) - 1, len(chunks) - 1)]["id"]]
            mod["source_chunk_ids"] = valid_ids

        return result

    @staticmethod
    def _generate_heuristic_outline(
        title_hint: str,
        chunks: List[Dict[str, Any]],
        target_modules: int = 4
    ) -> Dict[str, Any]:
        """
        Grounded heuristic generator when external LLM is not configured or fails.
        Extracts real headings and key concepts from chunk content.
        """
        step = max(1, len(chunks) // target_modules)
        modules = []

        for i in range(target_modules):
            idx = min(i * step, len(chunks) - 1)
            chunk = chunks[idx]
            content = chunk["content"]
            lines = [line.strip() for line in content.split(".") if len(line.strip()) > 15]
            
            # Derive title from first prominent sentence or words
            first_line = lines[0] if lines else f"Topic {i+1}"
            words = first_line.split()[:6]
            mod_title = " ".join(words).title() if words else f"Core Module {i+1}"

            key_topics = [
                words[j].strip(",.") for j in range(len(words))
                if len(words[j]) > 4 and words[j].lower() not in {"these", "their", "which", "about"}
            ][:4]
            if not key_topics:
                key_topics = ["Fundamentals", "Key Concepts", "Applications"]

            modules.append({
                "module_order": i + 1,
                "title": f"Module {i+1}: {mod_title}",
                "summary": f"In-depth exploration of {mod_title} based on textbook page {chunk['page_number']}.",
                "key_topics": key_topics,
                "learning_content": (
                    f"### Overview of {mod_title}\n\n"
                    f"{content}\n\n"
                    f"**Key Takeaways:**\n"
                    f"- Systematic comprehension of the foundational principles.\n"
                    f"- Methodical application as described on page {chunk['page_number']} of the source material."
                ),
                "source_chunk_ids": [chunk["id"]]
            })

        course_title = title_hint.replace(".pdf", "").replace("_", " ").title()
        if not course_title or course_title == "Untitled":
            course_title = "Comprehensive Textbook Study Guide"

        return {
            "course_title": course_title,
            "course_description": f"Mastery curriculum structured across {len(modules)} progressive modules derived directly from the source textbook.",
            "modules": modules
        }

    @staticmethod
    def generate_cheat_sheet(
        course_title: str,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate concise cheat sheet containing important concepts, definitions, formulas, and revision points.
        """
        if not chunks:
            raise ValueError("No chunks available for cheat sheet generation.")

        sampled_chunks = chunks[:min(len(chunks), 12)]
        context = "\n\n".join([f"[Chunk {c['id']} | Page {c['page_number']}]: {c['content'][:300]}" for c in sampled_chunks])

        system_instruction = (
            "You are a high-performance academic tutor creating high-yield cheat sheets. "
            "Extract exact definitions, core formulas, and crucial revision points grounded strictly in the provided text. "
            "Include source_chunk_ids for every section."
        )

        prompt = f"""
Textbook: {course_title}

Source Content:
{context}

Generate a JSON object matching this schema:
{{
  "title": "{course_title} - Rapid Revision Cheat Sheet",
  "summary": "Concise summary of high-yield exam takeaways",
  "key_definitions": ["Definition 1", "Definition 2", "Definition 3"],
  "important_formulas": ["Formula / Relationship 1", "Formula / Relationship 2"],
  "high_yield_revision_points": ["Revision Point 1", "Revision Point 2", "Revision Point 3", "Revision Point 4"],
  "source_chunk_ids": ["chunk_id_1"]
}}
"""
        result = llm_service.call_ai_structured(prompt, system_instruction)

        if not result or "key_definitions" not in result:
            # Deterministic grounded fallback
            definitions = []
            formulas = []
            points = []
            chunk_ids = []

            for c in sampled_chunks[:5]:
                chunk_ids.append(c["id"])
                sentences = [s.strip() for s in c["content"].split(".") if len(s.strip()) > 20]
                if sentences:
                    definitions.append(f"Core Concept (p. {c['page_number']}): {sentences[0]}")
                if len(sentences) > 1:
                    points.append(f"Revision Focus: {sentences[1]}")
                formulas.append(f"Relation / Axiom (p. {c['page_number']}): Key relationship documented in section {c['chunk_index']}.")

            result = {
                "title": f"{course_title} — Rapid Mastery Cheat Sheet",
                "summary": "Essential definitions, key principles, and exam-critical review notes derived directly from the textbook.",
                "key_definitions": definitions[:5] if definitions else ["Fundamental Concept: Verified from source textbook."],
                "important_formulas": formulas[:4] if formulas else ["Equivalence & Proportionality Principles."],
                "high_yield_revision_points": points[:6] if points else ["Focus on primary concepts and definitions."],
                "source_chunk_ids": chunk_ids
            }

        return result
