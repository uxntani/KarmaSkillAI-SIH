from sqlalchemy.orm import Session

from models import (
    Employee,
    EmployeeCompetency,
    Course,
    CourseCompetency,
    LearningMaterial,
    MaterialCompetency
)


def get_recommendations(employee_id: int, db: Session):

    employee = (
        db.query(Employee)
        .filter(Employee.id == employee_id)
        .first()
    )

    if not employee:
        return None


    # =====================================================
    # 1. FIND EMPLOYEE COMPETENCY GAPS
    # =====================================================

    competency_data = (
        db.query(EmployeeCompetency)
        .filter(
            EmployeeCompetency.employee_id == employee_id
        )
        .all()
    )

    gaps = {}

    for item in competency_data:

        gap = (
            item.required_level -
            item.current_level
        )

        if gap > 0:

            gaps[item.competency_id] = {
                "competency_name": item.competency.name,
                "current_level": item.current_level,
                "required_level": item.required_level,
                "gap": round(gap, 2)
            }


    # =====================================================
    # 2. RECOMMEND SEEDED COURSES
    # =====================================================

    courses = db.query(Course).all()

    course_recommendations = []

    for course in courses:

        mappings = (
            db.query(CourseCompetency)
            .filter(
                CourseCompetency.course_id == course.id
            )
            .all()
        )

        best_match = None

        for mapping in mappings:

            if mapping.competency_id not in gaps:
                continue

            gap_data = gaps[mapping.competency_id]

            score = (
                gap_data["gap"] *
                mapping.coverage
            ) / 100

            if (
                best_match is None
                or score > best_match["score"]
            ):

                best_match = {
                    "competency": gap_data["competency_name"],
                    "current_level": gap_data["current_level"],
                    "required_level": gap_data["required_level"],
                    "gap": gap_data["gap"],
                    "coverage": mapping.coverage,
                    "score": round(score, 2)
                }


        if best_match:

            priority = get_priority(
                best_match["score"]
            )

            reason = (
                f"Your {best_match['competency']} "
                f"competency is currently "
                f"{best_match['current_level']}%, "
                f"while your role requires "
                f"{best_match['required_level']}%. "
                f"This course covers approximately "
                f"{best_match['coverage']}% "
                f"of that competency."
            )

            course_recommendations.append({

                "type": "course",

                "course_id": course.id,

                "title": course.title,

                "difficulty": course.difficulty,

                "duration": course.duration,

                "competency": best_match["competency"],

                "current_level": best_match["current_level"],

                "required_level": best_match["required_level"],

                "gap": best_match["gap"],

                "coverage": best_match["coverage"],

                "priority_score": best_match["score"],

                "priority": priority,

                "reason": reason
            })


    # =====================================================
    # 3. RECOMMEND AI-ANALYZED MATERIALS
    # =====================================================

    materials = (
        db.query(LearningMaterial)
        .all()
    )

    material_recommendations = []

    for material in materials:

        mappings = (
            db.query(MaterialCompetency)
            .filter(
                MaterialCompetency.material_id ==
                material.id
            )
            .all()
        )

        best_match = None

        for mapping in mappings:

            if mapping.competency_id not in gaps:
                continue

            gap_data = gaps[mapping.competency_id]

            score = (
                gap_data["gap"] *
                mapping.relevance
            ) / 100

            if (
                best_match is None
                or score > best_match["score"]
            ):

                best_match = {
                    "competency": gap_data["competency_name"],
                    "current_level": gap_data["current_level"],
                    "required_level": gap_data["required_level"],
                    "gap": gap_data["gap"],
                    "relevance": mapping.relevance,
                    "score": round(score, 2)
                }


        if best_match:

            priority = get_priority(
                best_match["score"]
            )

            reason = (
                f"This learning material is highly relevant "
                f"to your {best_match['competency']} gap. "
                f"Your current level is "
                f"{best_match['current_level']}%, "
                f"while the required level is "
                f"{best_match['required_level']}%. "
                f"AI analysis found "
                f"{best_match['relevance']}% relevance "
                f"to this competency."
            )

            material_recommendations.append({

                "type": "learning_material",

                "material_id": material.id,

                "title": material.title,

                "filename": material.filename,

                "pages": material.pages,

                "competency": best_match["competency"],

                "current_level": best_match["current_level"],

                "required_level": best_match["required_level"],

                "gap": best_match["gap"],

                "relevance": best_match["relevance"],

                "priority_score": best_match["score"],

                "priority": priority,

                "reason": reason
            })


    # =====================================================
    # 4. COMBINE EVERYTHING
    # =====================================================

    recommendations = (
        course_recommendations +
        material_recommendations
    )

    recommendations.sort(
        key=lambda x: x["priority_score"],
        reverse=True
    )

    return recommendations


# =========================================================
# PRIORITY HELPER
# =========================================================

def get_priority(score):

    if score >= 25:
        return "High"

    elif score >= 15:
        return "Medium"

    return "Low"