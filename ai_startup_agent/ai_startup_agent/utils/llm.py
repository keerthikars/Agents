"""
utils/llm.py
Thin wrapper around the Groq chat completion API.
Centralizing this means every agent calls the LLM the same way,
with the same retry/error handling, so agents.py files stay short.
"""

import os
import time
import json
from groq import Groq

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


class LLMClient:
    def __init__(self, api_key: str | None = None, model: str = DEFAULT_MODEL):
        api_key = api_key or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to your .env file. "
                "Get a free key at https://console.groq.com"
            )
        self.client = Groq(api_key=api_key)
        self.model = model

    def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.4,
        max_tokens: int = 2048,
        json_mode: bool = False,
        retries: int = 3,
    ) -> str:
        """Send a single-turn chat request and return raw text content."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        kwargs = {}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        last_err = None
        for attempt in range(retries):
            try:
                resp = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs,
                )
                return resp.choices[0].message.content
            except Exception as e:  # noqa: BLE001
                last_err = e
                time.sleep(1.5 * (attempt + 1))
        raise RuntimeError(f"LLM call failed after {retries} attempts: {last_err}")

    def chat_json(self, system_prompt: str, user_prompt: str, **kwargs) -> dict:
        """Call the model expecting a JSON object back, parse, and return dict.
        Falls back to extracting the first {...} block if the model wraps
        the JSON in prose despite instructions.
        """
        raw = self.chat(system_prompt, user_prompt, json_mode=True, **kwargs)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                return json.loads(raw[start : end + 1])
            raise
