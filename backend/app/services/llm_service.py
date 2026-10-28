import json
import logging
import re
from typing import Dict, Any, Optional, List, Type
from pydantic import BaseModel
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        import httpx
        self.groq_client = None
        self.gemini_client = None
        self.http_client = httpx.Client(
            timeout=httpx.Timeout(22.0, connect=6.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20)
        )
        self.refresh_clients()

    def refresh_clients(self):
        """Initialize or refresh provider clients when API keys change."""
        self.groq_client = None
        self.gemini_client = None

        if settings.GROQ_API_KEY:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                logger.warning(f"Failed to initialize Groq client: {e}")

        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                self.gemini_client = genai.GenerativeModel(settings.GEMINI_MODEL)
            except Exception as e:
                logger.warning(f"Failed to initialize Gemini client: {e}")

    def call_ai_structured(
        self,
        prompt: str,
        system_instruction: str,
        schema_model: Optional[Type[BaseModel]] = None,
        prefer_provider: str = "auto",
        max_tokens: int = 1800
    ) -> Dict[str, Any]:
        """
        Query AI with automatic failover across:
        1. Groq (llama-3.3-70b-versatile) — ultra-fast sub-second inference when configured
        2. NVIDIA Nemotron 3.5 (with thinking disabled for fast direct JSON generation)
        3. Gemini (gemini-2.0-flash)
        4. Robust deterministic grounded parser fallback
        """
        # 1. Try Groq first if configured (sub-second LPU speed)
        if self.groq_client:
            try:
                res = self._call_groq(prompt, system_instruction, max_tokens=max_tokens)
                parsed = self._extract_json(res)
                if parsed and (schema_model is None or self._validate_schema(parsed, schema_model)):
                    return parsed
            except Exception as e:
                logger.warning(f"Groq API call failed or rate-limited: {e}. Trying NVIDIA NIM.")

        # 2. Try NVIDIA Nemotron 3.5 if configured (direct non-thinking mode for 5x faster response)
        if settings.NVIDIA_API_KEY:
            try:
                res = self._call_nvidia(prompt, system_instruction, max_tokens=max_tokens)
                parsed = self._extract_json(res)
                if parsed and (schema_model is None or self._validate_schema(parsed, schema_model)):
                    return parsed
            except Exception as e:
                logger.warning(f"NVIDIA Nemotron API call failed or rate-limited: {e}. Trying secondary provider.")

        # 3. Try Gemini
        if self.gemini_client:
            try:
                res = self._call_gemini(prompt, system_instruction)
                parsed = self._extract_json(res)
                if parsed and (schema_model is None or self._validate_schema(parsed, schema_model)):
                    return parsed
            except Exception as e:
                logger.warning(f"Gemini API call failed or rate-limited: {e}. Trying fallback.")

        # If external AI providers are unavailable or failed, return empty to trigger grounded fallback
        return {}

    def _call_nvidia(self, prompt: str, system_instruction: str, max_tokens: int = 1800) -> str:
        """Call NVIDIA NIM endpoint for Nemotron 3.5 with thinking disabled for low latency."""
        headers = {
            "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "model": settings.NVIDIA_MODEL,
            "messages": [
                {"role": "system", "content": f"{system_instruction}\nRespond strictly with a valid JSON object only. Do not include markdown prose."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
            "chat_template_kwargs": {"enable_thinking": False}
        }
        response = self.http_client.post(
            f"{settings.NVIDIA_BASE_URL}/chat/completions",
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        choice = data["choices"][0]["message"]
        content = choice.get("content")
        if not content and choice.get("reasoning_content"):
            content = choice["reasoning_content"]
        return content or ""

    def _call_groq(self, prompt: str, system_instruction: str, max_tokens: int = 2000) -> str:
        completion = self.groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=max_tokens,
            timeout=15.0
        )
        return completion.choices[0].message.content

    def _call_gemini(self, prompt: str, system_instruction: str) -> str:
        full_prompt = f"{system_instruction}\n\nRespond strictly in valid JSON format.\n\nUser Prompt:\n{prompt}"
        response = self.gemini_client.generate_content(
            full_prompt,
            generation_config={"temperature": 0.2, "response_mime_type": "application/json"}
        )
        return response.text

    @staticmethod
    def _extract_json(text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON safely from text or markdown fences."""
        if not text:
            return None

        try:
            return json.loads(text)
        except Exception:
            pass

        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        # Try finding outermost curly brackets
        first_brace = text.find('{')
        last_brace = text.rfind('}')
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            try:
                return json.loads(text[first_brace:last_brace+1])
            except Exception:
                pass

        return None

    @staticmethod
    def _validate_schema(data: Dict[str, Any], schema_model: Type[BaseModel]) -> bool:
        """Validate parsed dictionary against the Pydantic schema."""
        try:
            schema_model.model_validate(data)
            return True
        except Exception as e:
            logger.warning(f"Schema validation error: {e}")
            return False


llm_service = LLMService()
