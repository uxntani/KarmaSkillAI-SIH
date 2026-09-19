from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Employee, EmployeeCompetency
from services.competency_engine import calculate_gap
from schemas import EmployeeCreate, EmployeeResponse
from services.role_engine import assign_role_competencies

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


@router.post("/", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db)
):

    # Check duplicate email
    existing = db.query(Employee).filter(
        Employee.email == employee.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Employee with this email already exists"
        )

    # Create employee
    new_employee = Employee(
        name=employee.name,
        email=employee.email,
        department=employee.department,
        role=employee.role,
        experience=employee.experience
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    # Assign competencies based on role
    try:

        assign_role_competencies(
            new_employee,
            db
        )

    except ValueError as e:

        # Remove employee if role is invalid
        db.delete(new_employee)
        db.commit()

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    return new_employee

@router.get("/", response_model=list[EmployeeResponse])
def get_employees(
    db: Session = Depends(get_db)
):

    return db.query(Employee).all()


@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(
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

    return employee

@router.get("/{employee_id}/gap-analysis")
def get_gap_analysis(
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

    competency_data = db.query(
        EmployeeCompetency
    ).filter(
        EmployeeCompetency.employee_id == employee_id
    ).all()

    results = []

    for item in competency_data:

        analysis = calculate_gap(
            item.current_level,
            item.required_level
        )

        results.append({
            "competency": item.competency.name,
            **analysis
        })

    results.sort(
        key=lambda x: x["gap"],
        reverse=True
    )

    return {
        "employee_id": employee.id,
        "employee_name": employee.name,
        "role": employee.role,
        "competencies": results
    }