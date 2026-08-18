import json
import logging
from typing import List, Dict, Any, Optional
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, FALLBACK_GROQ_MODEL

logger = logging.getLogger(__name__)

# Active, verified Groq models for text completion & JSON generation
SUPPORTED_GROQ_MODELS = [
    "groq/compound-mini",
    "groq/compound",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b"
]

class GroqLLMService:
    def __init__(self):
        self.api_key = GROQ_API_KEY.strip("'\"") if GROQ_API_KEY else ""
        self.client = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.error(f"[LLM] Failed to initialize Groq client: {e}")

    def generate(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.5,
        max_tokens: int = 2048,
        response_format: Optional[Dict[str, str]] = None
    ) -> str:
        """
        Executes Groq LLM reasoning across verified active models with automatic fallback.
        """
        if not self.client:
            from config import GROQ_API_KEY as latest_key
            if latest_key:
                self.api_key = latest_key.strip("'\"")
                self.client = Groq(api_key=self.api_key)
            else:
                raise RuntimeError("GROQ_API_KEY environment variable is not configured.")

        # Deduplicate models
        models_to_try = []
        for m in SUPPORTED_GROQ_MODELS:
            clean_m = (m or "").strip("'\"")
            if clean_m and clean_m not in models_to_try:
                models_to_try.append(clean_m)

        last_error = None

        # 1st Pass: Try models with response_format (if requested)
        if response_format:
            for model in models_to_try:
                try:
                    completion = self.client.chat.completions.create(
                        messages=messages,
                        model=model,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format=response_format
                    )
                    content = completion.choices[0].message.content
                    if content and content.strip():
                        return content
                except Exception as e:
                    err_msg = str(e)
                    logger.warning(f"[LLM] Pass 1 (JSON mode) warning for model '{model}': {err_msg}")
                    last_error = e

        # 2nd Pass: Fallback retry WITHOUT response_format (text extraction)
        for model in models_to_try:
            try:
                completion = self.client.chat.completions.create(
                    messages=messages,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                content = completion.choices[0].message.content
                if content and content.strip():
                    return content
            except Exception as e:
                err_msg = str(e)
                logger.warning(f"[LLM] Pass 2 (Text mode) warning for model '{model}': {err_msg}")
                last_error = e

        raise RuntimeError(f"Groq LLM Service execution failed: {last_error}")

llm_service = GroqLLMService()
