from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Role, RoleCompetency

router = APIRouter(
    prefix="/roles",
    tags=["Roles"]
)


@router.get("/")
def get_roles(db: Session = Depends(get_db)):

    roles = db.query(Role).all()

    result = []

    for role in roles:

        competencies = db.query(RoleCompetency).filter(
            RoleCompetency.role_id == role.id
        ).all()

        result.append({
            "id": role.id,
            "name": role.name,
            "description": role.description,
            "required_competencies": [
                {
                    "competency": item.competency.name,
                    "required_level": item.required_level
                }
                for item in competencies
            ]
        })

    return result