from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    department = Column(String, nullable=False)
    role = Column(String, nullable=False)
    experience = Column(Float, default=0)

    competencies = relationship(
        "EmployeeCompetency",
        back_populates="employee",
        cascade="all, delete-orphan"
    )

class Competency(Base):
    __tablename__ = "competencies"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    category = Column(String)

    employee_competencies = relationship(
        "EmployeeCompetency",
        back_populates="competency"
    )

class EmployeeCompetency(Base):
    __tablename__ = "employee_competencies"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    competency_id = Column(
        Integer,
        ForeignKey("competencies.id"),
        nullable=False
    )

    current_level = Column(Float, default=0)
    required_level = Column(Float, default=0)

    employee = relationship(
        "Employee",
        back_populates="competencies"
    )

    competency = relationship(
        "Competency",
        back_populates="employee_competencies"
    )

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(Text)
    difficulty = Column(String)
    duration = Column(Integer)

    content = Column(Text)

class CourseCompetency(Base):
    __tablename__ = "course_competencies"

    id = Column(Integer, primary_key=True, index=True)

    course_id = Column(
        Integer,
        ForeignKey("courses.id"),
        nullable=False
    )

    competency_id = Column(
        Integer,
        ForeignKey("competencies.id"),
        nullable=False
    )

    coverage = Column(Float, default=0)

    course = relationship("Course")
    competency = relationship("Competency")

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id"), nullable=False)

    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)

    employee = relationship("Employee")
    competency = relationship("Competency")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)

class RoleCompetency(Base):
    __tablename__ = "role_competencies"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    competency_id = Column(Integer, ForeignKey("competencies.id"), nullable=False)
    required_level = Column(Float, nullable=False)

    role = relationship("Role")
    competency = relationship("Competency")

class LearningMaterial(Base):
    __tablename__ = "learning_materials"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    title = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=False)
    pages = Column(Integer, default=0)

class MaterialCompetency(Base):
    __tablename__ = "material_competencies"

    id = Column(Integer, primary_key=True, index=True)

    material_id = Column(
        Integer,
        ForeignKey("learning_materials.id"),
        nullable=False
    )

    competency_id = Column(
        Integer,
        ForeignKey("competencies.id"),
        nullable=False
    )

    relevance = Column(Float, nullable=False)

    material = relationship("LearningMaterial")
    competency = relationship("Competency")

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(
        Integer,
        ForeignKey("learning_materials.id"),
        nullable=False
    )
    title = Column(String, nullable=False)
    number_of_questions = Column(Integer, nullable=False)

    material = relationship("LearningMaterial")
    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan"
    )

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id"),
        nullable=False
    )

    question = Column(Text, nullable=False)

    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)

    correct_answer = Column(String, nullable=False)
    explanation = Column(Text)
    difficulty = Column(String)

    # Competency associated with this question
    competency_id = Column(
        Integer,
        ForeignKey("competencies.id"),
        nullable=True
    )

    quiz = relationship(
        "Quiz",
        back_populates="questions"
    )

    competency = relationship("Competency")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)

    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id"),
        nullable=False
    )

    employee_id = Column(
        Integer,
        ForeignKey("employees.id"),
        nullable=False
    )

    score = Column(Float, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)

    quiz = relationship("Quiz")
    employee = relationship("Employee")