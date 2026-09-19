from services.gemini_service import generate_text


prompt = """
Explain statistical reasoning in simple terms
for a government employee learning data analysis.
Keep the answer under 100 words.
"""

result = generate_text(prompt)

print("\n===== GEMINI RESPONSE =====\n")
print(result)