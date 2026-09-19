from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Course, CourseCompetency

router = APIRouter(
    prefix="/courses",
    tags=["Courses"]
)


@router.get("/")
def get_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()

    result = []
    for course in courses:
        mappings = db.query(CourseCompetency).filter(
            CourseCompetency.course_id == course.id
        ).all()

        result.append({
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "difficulty": course.difficulty,
            "duration": course.duration,
            "content": course.content,
            "competencies": [
                {
                    "competency_id": m.competency_id,
                    "competency_name": m.competency.name if m.competency else "Unknown",
                    "coverage": m.coverage
                }
                for m in mappings
            ]
        })

    return result


@router.get("/{course_id}")
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()

    if not course:
        raise HTTPException(
            status_code=404,
            detail="Course not found"
        )

    mappings = db.query(CourseCompetency).filter(
        CourseCompetency.course_id == course.id
    ).all()

    return {
        "id": course.id,
        "title": course.title,
        "description": course.description,
        "difficulty": course.difficulty,
        "duration": course.duration,
        "content": course.content,
        "competencies": [
            {
                "competency_id": m.competency_id,
                "competency_name": m.competency.name if m.competency else "Unknown",
                "coverage": m.coverage
            }
            for m in mappings
        ]
    }
