import requests
import os


def get_ai_insights(summary):
    api_key = os.getenv("OPENROUTER_API_KEY")

    prompt = f"""
You are a senior data scientist.

Analyze this dataset quality report:
{summary}

Respond ONLY in this format:

ABOUT DATASET:
- ...

RISKS:
- ...

BIAS:
- ...

CLEANING:
- ...

ML IMPACT:
- ...

METADATA:
- ...

Rules:
- ABOUT DATASET must be 2-3 simple bullet points for a non-technical user
- Each other point must be short (max 1 line)
- No paragraphs
- No explanations outside these sections
"""

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "openai/gpt-4o-mini",  # safer model
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
    )

    data = response.json()

    print("RAW AI RESPONSE:", data)

    if "choices" not in data:
        return f"Error from API: {data}"

    return data["choices"][0]["message"]["content"]