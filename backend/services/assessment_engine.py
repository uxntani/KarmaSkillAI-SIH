from sqlalchemy.orm import Session

from models import Assessment, EmployeeCompetency


def calculate_current_competency(
    employee_id: int,
    competency_id: int,
    db: Session
):
    """
    Calculate current competency level using assessment history.

    Most recent assessment gets the highest weight.
    """

    assessments = (
        db.query(Assessment)
        .filter(
            Assessment.employee_id == employee_id,
            Assessment.competency_id == competency_id
        )
        .order_by(Assessment.id.desc())
        .limit(3)
        .all()
    )

    if not assessments:
        return 0

    weights = [0.5, 0.3, 0.2]

    weighted_score = 0
    total_weight = 0

    for index, assessment in enumerate(assessments):

        weight = weights[index]

        weighted_score += (
            assessment.percentage * weight
        )

        total_weight += weight

    current_level = weighted_score / total_weight

    return round(current_level, 2)


def update_employee_competency(
    employee_id: int,
    competency_id: int,
    db: Session
):
    """
    Recalculate and update employee competency level.
    """

    employee_competency = (
        db.query(EmployeeCompetency)
        .filter(
            EmployeeCompetency.employee_id == employee_id,
            EmployeeCompetency.competency_id == competency_id
        )
        .first()
    )

    if not employee_competency:
        return None

    current_level = calculate_current_competency(
        employee_id,
        competency_id,
        db
    )

    employee_competency.current_level = current_level

    db.commit()
    db.refresh(employee_competency)

    return employee_competency