import json
import os

import requests


PLACEHOLDER_KEYS = {"", "your_openrouter_api_key_here", "YOUR_OPENROUTER_API_KEY"}
VALID_CONFIDENCE = {"high", "medium", "low"}


def has_real_openrouter_key() -> bool:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    return api_key not in PLACEHOLDER_KEYS


def _build_ai_prompt(local_analysis: dict, local_suggestions: list[dict]) -> str:
    payload = {
        "analysis_from_local_scripts": local_analysis,
        "suggestions_from_local_scripts": local_suggestions,
    }
    return f"""
You are a senior data scientist for an AI dataset analyzer.

You must produce the FINAL scoring output from the provided local signals.
Do not mention internal reasoning.

Input signals:
{json.dumps(payload, ensure_ascii=True)}

Return STRICT JSON only with this schema:
{{
  "quality_score": <number between 0 and 100>,
  "risk_flags": ["<short bullet>", "..."],
  "sections": {{
    "ABOUT DATASET": ["...", "..."],
    "RISKS": ["..."],
    "BIAS": ["..."],
    "CLEANING": ["..."],
    "ML IMPACT": ["..."],
    "METADATA": ["..."]
  }}
  ,
  "suggestions_confidence": [
    {{
      "column": "<column name>",
      "fill_method": "median"|"mode"|"minmax",
      "confidence": "high"|"medium"|"low",
      "reason": "<one short sentence>"
    }}
  ]
}}

Rules:
- quality_score must be your own AI judgement from all provided signals.
- Keep every bullet concise and actionable.
- Include all section keys, even if some arrays are short.
- Provide a suggestions_confidence entry for each suggestion in suggestions_from_local_scripts.
""".strip()


def _coerce_lines(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    out: list[str] = []
    for item in value:
        if isinstance(item, str):
            cleaned = item.strip()
            if cleaned:
                out.append(cleaned)
    return out


def _coerce_confidence(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    v = value.strip().lower()
    if v in VALID_CONFIDENCE:
        return v
    return None


def get_ai_report(local_analysis: dict, local_suggestions: list[dict]) -> dict:
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if api_key in PLACEHOLDER_KEYS:
        raise RuntimeError("AI API key is missing.")

    prompt = _build_ai_prompt(local_analysis, local_suggestions)
    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": "openai/gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
        },
        timeout=45,
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    parsed = json.loads(content)

    quality_score = float(parsed.get("quality_score", 0))
    quality_score = max(0.0, min(100.0, quality_score))

    risk_flags = parsed.get("risk_flags", [])
    if not isinstance(risk_flags, list):
        risk_flags = []
    risk_flags = [str(flag).strip() for flag in risk_flags if str(flag).strip()]

    sections = parsed.get("sections", {})
    if not isinstance(sections, dict):
        sections = {}

    required = ["ABOUT DATASET", "RISKS", "BIAS", "CLEANING", "ML IMPACT", "METADATA"]
    normalized_sections: dict[str, list[str]] = {}
    for key in required:
        normalized_sections[key] = _coerce_lines(sections.get(key, []))

    suggestions_conf = parsed.get("suggestions_confidence", [])
    if not isinstance(suggestions_conf, list):
        suggestions_conf = []

    suggestions_confidence_by_key: dict[str, dict[str, str]] = {}
    for item in suggestions_conf:
        if not isinstance(item, dict):
            continue
        column = item.get("column")
        fill_method = item.get("fill_method")
        confidence = _coerce_confidence(item.get("confidence"))
        reason = item.get("reason")

        if not isinstance(column, str) or not isinstance(fill_method, str) or not confidence:
            continue

        key = f"{column}::{fill_method}"
        suggestions_confidence_by_key[key] = {
            "confidence": confidence,
            "reason": str(reason).strip() if isinstance(reason, str) and reason.strip() else "",
        }

    return {
        "quality_score": round(quality_score, 2),
        "risk_flags": risk_flags,
        "sections": normalized_sections,
        "suggestions_confidence_by_key": suggestions_confidence_by_key,
    }