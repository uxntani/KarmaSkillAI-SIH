import json
import re

from services.gemini_service import generate_text


def clean_json_response(text: str):
    """
    Remove markdown code fences if Gemini returns JSON
    inside ```json ... ```.
    """

    text = text.strip()

    text = re.sub(r"^```json\s*", "", text)
    text = re.sub(r"^```\s*", "", text)
    text = re.sub(r"\s*```$", "", text)

    return text.strip()


def generate_mcqs(material_text: str, number_of_questions: int = 5):

    prompt = f"""
You are an expert assessment designer for India's
government capacity-building ecosystem.

Analyze the learning material below and generate
{number_of_questions} high-quality multiple choice questions.

IMPORTANT RULES:

1. Questions must be based ONLY on the provided material.
2. Do not invent facts that are not present in the material.
3. Each question must have exactly 4 options.
4. There must be exactly one correct answer.
5. Include a short explanation for the correct answer.
6. Questions should test understanding, not just memorization.
7. Use a mixture of easy, medium and difficult questions.
8. Return ONLY valid JSON.
9. Do NOT use markdown.
10. Do NOT include ```json or ```.

Return exactly this structure:

{{
    "questions": [
        {{
            "question": "Question text",
            "options": {{
                "A": "Option A",
                "B": "Option B",
                "C": "Option C",
                "D": "Option D"
            }},
            "correct_answer": "A",
            "explanation": "Explanation of the correct answer",
            "difficulty": "Medium"
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
            "Gemini returned an invalid JSON response"
        )

    if "questions" not in result:
        raise ValueError(
            "Gemini response does not contain questions"
        )

    return result