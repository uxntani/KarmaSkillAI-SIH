from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Competency,
    EmployeeCompetency
)
from schemas import (
    CompetencyResponse,
    EmployeeCompetencyResponse
)


router = APIRouter(
    prefix="/competencies",
    tags=["Competencies"]
)


@router.get("/", response_model=list[CompetencyResponse])
def get_competencies(
    db: Session = Depends(get_db)
):

    return db.query(Competency).all()


@router.get(
    "/employee/{employee_id}",
    response_model=list[EmployeeCompetencyResponse]
)
def get_employee_competencies(
    employee_id: int,
    db: Session = Depends(get_db)
):

    results = db.query(
        EmployeeCompetency
    ).filter(
        EmployeeCompetency.employee_id == employee_id
    ).all()

    if not results:
        raise HTTPException(
            status_code=404,
            detail="No competency data found"
        )

    return results