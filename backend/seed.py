from database import SessionLocal, engine, Base

from models import (
    Employee,
    Competency,
    EmployeeCompetency,
    Course,
    CourseCompetency,
    Role,
    RoleCompetency
)


Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Clear existing data

db.query(CourseCompetency).delete()
db.query(EmployeeCompetency).delete()
db.query(Course).delete()
db.query(Employee).delete()
db.query(Competency).delete()

db.commit()


# Competencies

competencies = [

    Competency(
        name="Data Analysis",
        description="Ability to analyse and interpret datasets.",
        category="Technical"
    ),

    Competency(
        name="Statistical Reasoning",
        description="Ability to apply statistical concepts and interpret results.",
        category="Technical"
    ),

    Competency(
        name="Data Visualization",
        description="Ability to communicate insights through effective visualizations.",
        category="Technical"
    ),

    Competency(
        name="Communication",
        description="Ability to communicate findings clearly to stakeholders.",
        category="Behavioural"
    ),

    Competency(
        name="Policy Understanding",
        description="Understanding of policy implications of statistical information.",
        category="Domain"
    )
]


db.add_all(competencies)
db.commit()


# Refresh IDs
for competency in competencies:
    db.refresh(competency)


# Employee

employee = Employee(
    name="Rahul Sharma",
    email="rahul.sharma@gov.in",
    department="Statistics Department",
    role="Statistical Officer",
    experience=4
)

db.add(employee)
db.commit()
db.refresh(employee)


# Employee Competencies

levels = {
    "Data Analysis": (72, 85),
    "Statistical Reasoning": (48, 80),
    "Data Visualization": (55, 80),
    "Communication": (76, 75),
    "Policy Understanding": (68, 70)
}


for competency in competencies:

    current, required = levels[competency.name]

    db.add(
        EmployeeCompetency(
            employee_id=employee.id,
            competency_id=competency.id,
            current_level=current,
            required_level=required
        )
    )


# Courses

courses = [

    Course(
        title="Advanced Statistical Reasoning",
        description=(
            "Statistical inference, hypothesis testing, "
            "sampling and statistical interpretation."
        ),
        difficulty="Intermediate",
        duration=6,
        content=(
            "This course covers statistical reasoning, "
            "sampling methods, hypothesis testing and "
            "interpretation of statistical results."
        )
    ),

    Course(
        title="Data Visualization Fundamentals",
        description=(
            "Learn how to communicate data insights "
            "using effective visualizations."
        ),
        difficulty="Beginner",
        duration=4,
        content=(
            "Charts, graphs, dashboards, visual storytelling "
            "and communicating insights."
        )
    ),

    Course(
        title="Advanced Data Analysis",
        description=(
            "Practical methods for analysing government datasets."
        ),
        difficulty="Advanced",
        duration=8,
        content=(
            "Data cleaning, exploratory analysis, statistical "
            "analysis and interpretation."
        )
    )
]


db.add_all(courses)
db.commit()

for course in courses:
    db.refresh(course)


# Course → Competency mapping

competency_map = {
    "Advanced Statistical Reasoning": {
        "Statistical Reasoning": 90,
        "Data Analysis": 70
    },

    "Data Visualization Fundamentals": {
        "Data Visualization": 95,
        "Communication": 60
    },

    "Advanced Data Analysis": {
        "Data Analysis": 95,
        "Statistical Reasoning": 75
    }
}


for course in courses:

    mappings = competency_map[course.title]

    for competency_name, coverage in mappings.items():

        competency = next(
            c for c in competencies
            if c.name == competency_name
        )

        db.add(
            CourseCompetency(
                course_id=course.id,
                competency_id=competency.id,
                coverage=coverage
            )
        )


db.commit()
db.close()

# Create roles
statistical_officer = Role(
    name="Statistical Officer",
    description="Government officer responsible for statistical analysis, reporting and interpretation."
)

data_analyst = Role(
    name="Data Analyst",
    description="Professional responsible for analysing datasets and communicating data insights."
)

db.add_all([
    statistical_officer,
    data_analyst
])

db.commit()

db.refresh(statistical_officer)
db.refresh(data_analyst)

# Role competency requirements

role_requirements = {
    "Statistical Officer": {
        "Data Analysis": 85,
        "Statistical Reasoning": 80,
        "Data Visualization": 80,
        "Communication": 75,
        "Policy Understanding": 70
    },

    "Data Analyst": {
        "Data Analysis": 90,
        "Statistical Reasoning": 75,
        "Data Visualization": 85,
        "Communication": 75
    }
}

roles = {
    "Statistical Officer": statistical_officer,
    "Data Analyst": data_analyst
}

for role_name, requirements in role_requirements.items():

    role = roles[role_name]

    for competency_name, required_level in requirements.items():

        competency = next(
            c for c in competencies
            if c.name == competency_name
        )

        db.add(
            RoleCompetency(
                role_id=role.id,
                competency_id=competency.id,
                required_level=required_level
            )
        )

db.commit()

print("KarmaSkill database seeded successfully.")