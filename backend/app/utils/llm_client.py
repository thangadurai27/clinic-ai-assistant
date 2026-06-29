"""
Groq LLM client — thin wrapper around LangChain's ChatGroq.
"""
import json
import logging
from typing import Optional

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser

from app.config.settings import settings

logger = logging.getLogger(__name__)

_llm_pool: dict[float, ChatGroq] = {}


def get_llm(temperature: float = 0.3) -> ChatGroq:
    """Return a reused ChatGroq instance for the given temperature."""
    if temperature not in _llm_pool:
        _llm_pool[temperature] = ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL,
            temperature=temperature,
            max_tokens=1024,
            timeout=30,
            max_retries=1,
        )
    return _llm_pool[temperature]


async def call_llm(
    system_prompt: str,
    human_prompt: str,
    temperature: float = 0.3,
) -> str:
    """
    Async call to the Groq LLM. Returns the assistant's text response.
    """
    llm = get_llm(temperature=temperature)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=human_prompt),
    ]
    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise


async def call_llm_json(
    system_prompt: str,
    human_prompt: str,
    temperature: float = 0.1,
) -> dict:
    """
    Call LLM and parse the response as JSON.
    Raises ValueError if JSON cannot be parsed.
    """
    raw = await call_llm(system_prompt, human_prompt, temperature)

    # Strip markdown code blocks if present
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:-1]) if len(lines) > 2 else cleaned

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}\nRaw: {raw}")
        raise ValueError(f"LLM returned invalid JSON: {e}") from e
