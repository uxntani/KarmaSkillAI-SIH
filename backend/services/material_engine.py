import json
import re

from services.gemini_service import generate_text


def clean_json_response(text: str):
    text = text.strip()

    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return text.strip()


def extract_competencies(material_text: str):

    prompt = f"""
You are an expert in competency-based learning
for India's government capacity-building ecosystem.

Analyze the learning material below.

Identify which competencies from the following
list are covered by the material:

1. Data Analysis
2. Statistical Reasoning
3. Data Visualization
4. Communication
5. Policy Understanding

For every competency that is genuinely relevant,
provide a relevance score from 0 to 100.

Rules:

- Use ONLY the five competencies listed above.
- Do not invent new competencies.
- Do not include competencies with relevance below 30.
- Base your decision only on the learning material.
- Return ONLY valid JSON.
- Do not use markdown.

Return exactly this structure:

{{
    "competencies": [
        {{
            "name": "Statistical Reasoning",
            "relevance": 90
        }}
    ]
}}

LEARNING MATERIAL:

{material_text}
"""

    response = generate_text(prompt)

    cleaned_response = clean_json_response(response)

    try:
        result = json.loads(cleaned_response)
    except json.JSONDecodeError:
        raise ValueError(
            "Gemini returned invalid JSON"
        )

    if "competencies" not in result:
        raise ValueError(
            "Gemini response does not contain competencies"
        )

    return result