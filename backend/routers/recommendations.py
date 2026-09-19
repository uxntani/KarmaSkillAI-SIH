from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Employee

from services.recommendation_engine import get_recommendations


router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"]
)


@router.get("/employee/{employee_id}")
def get_employee_recommendations(
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

    recommendations = get_recommendations(
        employee_id,
        db
    )

    return {
        "employee_id": employee.id,
        "employee_name": employee.name,
        "role": employee.role,
        "recommendations": recommendations
    }