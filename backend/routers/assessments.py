from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.assessment_engine import update_employee_competency

from database import get_db
from models import (
    Assessment,
    Employee,
    Competency,
    EmployeeCompetency
)
from schemas import AssessmentCreate, AssessmentResponse

router = APIRouter(
    prefix="/assessments",
    tags=["Assessments"]
)


@router.post("/", response_model=AssessmentResponse)
def create_assessment(
    assessment: AssessmentCreate,
    db: Session = Depends(get_db)
):

    # Check employee
    employee = db.query(Employee).filter(
        Employee.id == assessment.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    # Check competency
    competency = db.query(Competency).filter(
        Competency.id == assessment.competency_id
    ).first()

    if not competency:
        raise HTTPException(
            status_code=404,
            detail="Competency not found"
        )

    # Validate assessment
    if assessment.total_questions <= 0:
        raise HTTPException(
            status_code=400,
            detail="Total questions must be greater than 0"
        )

    if assessment.score < 0 or assessment.score > assessment.total_questions:
        raise HTTPException(
            status_code=400,
            detail="Score must be between 0 and total questions"
        )

    # Calculate percentage
    percentage = (
        assessment.score / assessment.total_questions
    ) * 100

    # Store assessment
    new_assessment = Assessment(
        employee_id=assessment.employee_id,
        competency_id=assessment.competency_id,
        score=assessment.score,
        total_questions=assessment.total_questions,
        percentage=round(percentage, 2)
    )

    db.add(new_assessment)

    # Update current competency level
    db.commit()
    db.refresh(new_assessment)

    update_employee_competency(
    assessment.employee_id,
    assessment.competency_id,
    db
)

    return new_assessment


@router.get(
    "/employee/{employee_id}",
    response_model=list[AssessmentResponse]
)
def get_employee_assessments(
    employee_id: int,
    db: Session = Depends(get_db)
):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return db.query(Assessment).filter(
        Assessment.employee_id == employee_id
    ).all()