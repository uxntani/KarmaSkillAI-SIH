from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pypdf import PdfReader
import io

from services.mcq_engine import generate_mcqs
from services.material_engine import extract_competencies

from database import get_db
from sqlalchemy.orm import Session

from models import (
    LearningMaterial,
    MaterialCompetency,
    Quiz,
    QuizQuestion,
    Competency
)

router = APIRouter(
    prefix="/materials",
    tags=["Learning Materials"]
)


@router.get("/")
def get_learning_materials(db: Session = Depends(get_db)):
    """
    List all uploaded learning materials with mapped competencies and quizzes.
    """
    materials = db.query(LearningMaterial).all()

    result = []
    for mat in materials:
        mappings = db.query(MaterialCompetency).filter(
            MaterialCompetency.material_id == mat.id
        ).all()

        quizzes = db.query(Quiz).filter(
            Quiz.material_id == mat.id
        ).all()

        result.append({
            "id": mat.id,
            "filename": mat.filename,
            "title": mat.title,
            "pages": mat.pages,
            "characters": len(mat.extracted_text) if mat.extracted_text else 0,
            "snippet": (mat.extracted_text[:200] + "...") if mat.extracted_text else "",
            "competencies": [
                {
                    "competency_id": m.competency_id,
                    "competency_name": m.competency.name if m.competency else "Unknown",
                    "relevance": m.relevance
                }
                for m in mappings
            ],
            "quizzes": [
                {
                    "id": q.id,
                    "title": q.title,
                    "number_of_questions": q.number_of_questions
                }
                for q in quizzes
            ]
        })

    return result


@router.get("/{material_id}")
def get_learning_material(material_id: int, db: Session = Depends(get_db)):
    mat = db.query(LearningMaterial).filter(LearningMaterial.id == material_id).first()
    if not mat:
        raise HTTPException(
            status_code=404,
            detail="Learning material not found"
        )

    mappings = db.query(MaterialCompetency).filter(
        MaterialCompetency.material_id == mat.id
    ).all()

    quizzes = db.query(Quiz).filter(
        Quiz.material_id == mat.id
    ).all()

    return {
        "id": mat.id,
        "filename": mat.filename,
        "title": mat.title,
        "pages": mat.pages,
        "extracted_text": mat.extracted_text,
        "competencies": [
            {
                "competency_id": m.competency_id,
                "competency_name": m.competency.name if m.competency else "Unknown",
                "relevance": m.relevance
            }
            for m in mappings
        ],
        "quizzes": [
            {
                "id": q.id,
                "title": q.title,
                "number_of_questions": q.number_of_questions
            }
            for q in quizzes
        ]
    }


@router.post("/upload")
async def upload_material(
    file: UploadFile = File(...)
):
    """
    Upload a PDF and extract its text.
    """

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    contents = await file.read()

    pdf_file = io.BytesIO(contents)
    reader = PdfReader(pdf_file)

    extracted_text = ""

    for page in reader.pages:

        text = page.extract_text()

        if text:
            extracted_text += text + "\n"

    if not extracted_text.strip():

        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF"
        )

    return {
        "filename": file.filename,
        "pages": len(reader.pages),
        "characters": len(extracted_text),
        "text": extracted_text
    }


@router.post("/generate-quiz")
async def generate_quiz_from_pdf(
    file: UploadFile = File(...),
    number_of_questions: int = 5
):
    """
    Upload a PDF and automatically generate MCQs
    from its learning material using Gemini.
    """

    # Validate file
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Validate number of questions
    if number_of_questions < 1 or number_of_questions > 20:
        raise HTTPException(
            status_code=400,
            detail="Number of questions must be between 1 and 20"
        )

    # Read PDF
    contents = await file.read()

    pdf_file = io.BytesIO(contents)
    reader = PdfReader(pdf_file)

    # Extract text
    extracted_text = ""

    for page in reader.pages:

        text = page.extract_text()

        if text:
            extracted_text += text + "\n"

    if not extracted_text.strip():

        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF"
        )

    # Generate MCQs using Gemini
    try:

        quiz = generate_mcqs(
            extracted_text,
            number_of_questions
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI quiz generation failed: {str(e)}"
        )

    return {
        "filename": file.filename,
        "pages": len(reader.pages),
        "questions": quiz["questions"]
    }

@router.post("/analyze")
async def analyze_learning_material(
    file: UploadFile = File(...),
    number_of_questions: int = 5
):
    """
    Analyze a PDF learning material.

    The AI identifies relevant competencies and
    generates MCQs from the same material.
    """

    # Validate file
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Validate question count
    if number_of_questions < 1 or number_of_questions > 20:
        raise HTTPException(
            status_code=400,
            detail="Number of questions must be between 1 and 20"
        )

    # Read PDF
    contents = await file.read()

    pdf_file = io.BytesIO(contents)
    reader = PdfReader(pdf_file)

    # Extract text
    extracted_text = ""

    for page in reader.pages:

        text = page.extract_text()

        if text:
            extracted_text += text + "\n"

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF"
        )

    # AI analysis
    try:

        competencies = extract_competencies(
            extracted_text
        )

        quiz = generate_mcqs(
            extracted_text,
            number_of_questions
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

    return {
        "filename": file.filename,
        "pages": len(reader.pages),
        "characters": len(extracted_text),
        "competencies": competencies["competencies"],
        "questions": quiz["questions"]
    }

@router.post("/analyze-and-save")
async def analyze_and_save_material(
    file: UploadFile = File(...),
    number_of_questions: int = 5,
    db: Session = Depends(get_db)
):
    # -----------------------------
    # 1. Validate file
    # -----------------------------

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    if number_of_questions < 1 or number_of_questions > 20:
        raise HTTPException(
            status_code=400,
            detail="Number of questions must be between 1 and 20"
        )

    # -----------------------------
    # 2. Read PDF
    # -----------------------------

    contents = await file.read()

    pdf_file = io.BytesIO(contents)
    reader = PdfReader(pdf_file)

    extracted_text = ""

    for page in reader.pages:
        text = page.extract_text()

        if text:
            extracted_text += text + "\n"

    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from this PDF"
        )

    # -----------------------------
    # 3. AI analysis
    # -----------------------------

    try:
        competencies_result = extract_competencies(
            extracted_text
        )

        quiz_result = generate_mcqs(
            extracted_text,
            number_of_questions
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )

    # -----------------------------
    # 4. Save learning material
    # -----------------------------

    material = LearningMaterial(
        filename=file.filename,
        title=file.filename.rsplit(".", 1)[0],
        extracted_text=extracted_text,
        pages=len(reader.pages)
    )

    db.add(material)
    db.commit()
    db.refresh(material)
    

    # -----------------------------
    # 5. Determine primary competency
    # -----------------------------

    detected_competencies = competencies_result.get(
        "competencies",
        []
    )
    # -----------------------------------------------------
    # Save AI competency analysis
    # -----------------------------------------------------

    for detected in detected_competencies:
        competency = (
            db.query(Competency)
            .filter(
                Competency.name == detected["name"]
            )
            .first()
        )
        if not competency:
            continue

        material_competency = MaterialCompetency(
            material_id=material.id,
            competency_id=competency.id,
            relevance=detected["relevance"]
        )

        db.add(material_competency)

    db.commit()

    primary_competency = None
    if detected_competencies:
        highest = max(
            detected_competencies,
            key=lambda x: x["relevance"]
        )

        primary_competency = (
            db.query(Competency)
            .filter(
                Competency.name == highest["name"]
            )
            .first()
        )

    # -----------------------------
    # 6. Create quiz
    # -----------------------------

    quiz = Quiz(
        material_id=material.id,
        title=f"{material.title} - AI Assessment",
        number_of_questions=len(
            quiz_result["questions"]
        )
    )

    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    # -----------------------------
    # 7. Save questions
    # -----------------------------

    saved_questions = []

    for question in quiz_result["questions"]:

        question_record = QuizQuestion(
            quiz_id=quiz.id,

            question=question["question"],

            option_a=question["options"]["A"],
            option_b=question["options"]["B"],
            option_c=question["options"]["C"],
            option_d=question["options"]["D"],

            correct_answer=question["correct_answer"],

            explanation=question.get(
                "explanation",
                ""
            ),

            difficulty=question.get(
                "difficulty",
                "Medium"
            ),

            competency_id=(
                primary_competency.id
                if primary_competency
                else None
            )
        )

        db.add(question_record)

        saved_questions.append(
            question_record
        )

    db.commit()

    # -----------------------------
    # 8. Return everything
    # -----------------------------

    return {
        "message": "Learning material analyzed and quiz saved successfully",

        "material": {
            "id": material.id,
            "filename": material.filename,
            "title": material.title,
            "pages": material.pages,
            "characters": len(extracted_text)
        },

        "competencies": detected_competencies,

        "primary_competency": (
            primary_competency.name
            if primary_competency
            else None
        ),

        "quiz": {
            "id": quiz.id,
            "title": quiz.title,
            "number_of_questions": len(
                saved_questions
            ),

            "questions": [
                {
                    "id": q.id,
                    "question": q.question,

                    "options": {
                        "A": q.option_a,
                        "B": q.option_b,
                        "C": q.option_c,
                        "D": q.option_d
                    },

                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "difficulty": q.difficulty,

                    "competency": (
                        primary_competency.name
                        if primary_competency
                        else None
                    )
                }
                for q in saved_questions
            ]
        }
    }