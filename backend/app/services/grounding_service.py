import re
from typing import List, Dict, Any, Optional, Tuple


class GroundingService:
    @staticmethod
    def extract_supporting_snippet(source_text: str, focus_topic: str, max_chars: int = 250) -> str:
        """
        Extract an authentic excerpt from source chunk that grounds the question or concept.
        """
        if not source_text:
            return "No source text available."

        words = [w for w in re.findall(r'\b\w{3,}\b', focus_topic.lower()) if w not in {"what", "which", "when", "where", "how", "the", "and", "for"}]
        
        sentences = re.split(r'(?<=[.!?])\s+', source_text)
        best_sentence = ""
        best_score = -1

        for sentence in sentences:
            s_lower = sentence.lower()
            score = sum(1 for w in words if w in s_lower)
            if score > best_score:
                best_score = score
                best_sentence = sentence

        if not best_sentence:
            best_sentence = sentences[0] if sentences else source_text[:max_chars]

        clean_snippet = best_sentence.strip()
        if len(clean_snippet) > max_chars:
            clean_snippet = clean_snippet[:max_chars].rsplit(' ', 1)[0] + "..."
        return clean_snippet

    @staticmethod
    def validate_grounding(
        source_chunk_id: str,
        available_chunks: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Ensure that source_chunk_id exists within the document chunks.
        Returns (is_valid, content_snippet, page_number).
        """
        for chunk in available_chunks:
            if chunk.get("id") == source_chunk_id:
                content = chunk.get("content", "")
                page = chunk.get("page_number", 1)
                snippet = content[:200] + ("..." if len(content) > 200 else "")
                return True, snippet, page
        return False, None, None

    @staticmethod
    def assert_sufficient_context(chunks: List[Dict[str, Any]], min_words: int = 20) -> bool:
        """
        Verify that retrieved chunks provide enough factual substance to support question generation.
        """
        total_words = sum(len(c.get("content", "").split()) for c in chunks)
        return total_words >= min_words
