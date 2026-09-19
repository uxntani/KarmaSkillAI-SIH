from pydantic import BaseModel, EmailStr

class EmployeeCreate(BaseModel):
    name: str
    email: EmailStr
    department: str
    role: str
    experience: float = 0

class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str
    department: str
    role: str
    experience: float

    class Config:
        from_attributes = True

class CompetencyResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    category: str | None = None

    class Config:
        from_attributes = True

class EmployeeCompetencyResponse(BaseModel):
    competency: CompetencyResponse
    current_level: float
    required_level: float

class AssessmentCreate(BaseModel):
    employee_id: int
    competency_id: int
    score: float
    total_questions: int

class AssessmentResponse(BaseModel):
    id: int
    employee_id: int
    competency_id: int
    score: float
    total_questions: int
    percentage: float

    class Config:
        from_attributes = True

class QuizAnswer(BaseModel):
    question_id: int
    answer: str

class QuizAttemptCreate(BaseModel):
    employee_id: int
    answers: list[QuizAnswer]