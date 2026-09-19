from services.mcq_engine import generate_mcqs


material = """
Statistical reasoning is the process of using data
and statistical methods to understand patterns,
evaluate evidence and make informed decisions.

The mean is calculated by adding all observations
and dividing the total by the number of observations.

The median is the middle value when observations
are arranged in ascending or descending order.

The mode is the value that occurs most frequently
in a dataset.
"""


result = generate_mcqs(
    material,
    number_of_questions=5
)


print("\n===== GENERATED MCQs =====\n")

for index, question in enumerate(
    result["questions"],
    start=1
):

    print(f"Question {index}:")
    print(question["question"])

    print("\nOptions:")

    for option, text in question["options"].items():
        print(f"{option}. {text}")

    print(
        f"\nCorrect Answer: "
        f"{question['correct_answer']}"
    )

    print(
        f"Explanation: "
        f"{question['explanation']}"
    )

    print(
        f"Difficulty: "
        f"{question['difficulty']}"
    )

    print("\n" + "-" * 60 + "\n")