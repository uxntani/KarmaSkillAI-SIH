from fastapi import FastAPI

from database import Base, engine

from routers import employees
from routers import competencies
from routers import assessments
from routers import roles
from routers import recommendations
from routers import materials
from routers import quizzes
from routers import courses
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="KarmaSkill AI",
    description=(
        "AI-powered Competency Gap and "
        "Personalized Learning Engine"
    ),
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5501",
        "http://127.0.0.1:5501",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(employees.router)
app.include_router(competencies.router)
app.include_router(assessments.router)
app.include_router(roles.router)
app.include_router(recommendations.router)
app.include_router(materials.router)
app.include_router(quizzes.router)
app.include_router(courses.router)

@app.get("/")
def root():

    return {
        "project": "KarmaSkill AI",
        "message": "Competency Gap Engine API",
        "status": "running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }