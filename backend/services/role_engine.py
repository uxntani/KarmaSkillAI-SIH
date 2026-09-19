from sqlalchemy.orm import Session

from models import (
    Employee,
    Competency,
    EmployeeCompetency,
    Role,
    RoleCompetency
)


def assign_role_competencies(
    employee: Employee,
    db: Session
):
    """
    Assign competencies required by the employee's role.
    """

    # Find employee role
    role = db.query(Role).filter(
        Role.name == employee.role
    ).first()

    if not role:
        raise ValueError(
            f"Role '{employee.role}' not found"
        )

    # Get competency requirements for the role
    role_competencies = db.query(RoleCompetency).filter(
        RoleCompetency.role_id == role.id
    ).all()

    for role_competency in role_competencies:

        competency_id = role_competency.competency_id
        required_level = role_competency.required_level

        # Check whether employee already has this competency
        existing = db.query(EmployeeCompetency).filter(
            EmployeeCompetency.employee_id == employee.id,
            EmployeeCompetency.competency_id == competency_id
        ).first()

        if existing:
            # Update required level from role
            existing.required_level = required_level

        else:
            # Create competency for employee
            employee_competency = EmployeeCompetency(
                employee_id=employee.id,
                competency_id=competency_id,
                current_level=0,
                required_level=required_level
            )

            db.add(employee_competency)

    db.commit()

    return role_competencies