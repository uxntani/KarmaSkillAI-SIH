from services.material_engine import extract_competencies


material = """
Statistical reasoning involves analyzing data,
understanding distributions, calculating measures
such as mean and median, identifying patterns,
and drawing conclusions from statistical evidence.

The material also discusses how analysts should
interpret datasets and use statistical techniques
to support decision making.
"""


result = extract_competencies(material)


print("\n===== IDENTIFIED COMPETENCIES =====\n")

for competency in result["competencies"]:

    print(
        f"{competency['name']}: "
        f"{competency['relevance']}%"
    )