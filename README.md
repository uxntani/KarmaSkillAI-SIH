# KarmaSkill AI

KarmaSkill AI is a prototype competency-gap and personalized-learning platform.
The backend stores employees, roles, competencies, assessments, learning
materials, courses, and quizzes. It calculates the difference between an
employee's current competency level and the level required by their role, then
uses that difference to recommend learning resources.

The application has two parts:

- `backend/`: a FastAPI REST API backed by SQLite and SQLAlchemy.
- `frontend/`: a static browser UI that calls the API at
  `http://localhost:8000`.

There is currently no authentication or authorization. The frontend's
employee/admin switch is a prototype account switch, not a security boundary.

## Table of contents

1. [What the system does](#what-the-system-does)
2. [Repository structure](#repository-structure)
3. [Backend architecture](#backend-architecture)
4. [Data model](#data-model)
5. [Application startup and database lifecycle](#application-startup-and-database-lifecycle)
6. [API conventions](#api-conventions)
7. [Complete API reference](#complete-api-reference)
8. [Core business logic](#core-business-logic)
9. [PDF and Gemini AI pipeline](#pdf-and-gemini-ai-pipeline)
10. [Frontend-to-backend data flow](#frontend-to-backend-data-flow)
11. [Setup and running](#setup-and-running)
12. [Seed data](#seed-data)
13. [Testing and troubleshooting](#testing-and-troubleshooting)
14. [Current limitations and production considerations](#current-limitations-and-production-considerations)

## What the system does

The intended learning loop is:

1. Define roles and the competency levels those roles require.
2. Create an employee with one of those roles.
3. Automatically attach the role's required competencies to the employee.
4. Record assessment or quiz results.
5. Recalculate the employee's current competency levels from recent assessment
   history.
6. Calculate competency gaps and classify their severity.
7. Recommend seeded courses and AI-analyzed learning materials that cover the
   largest gaps.
8. Optionally upload a PDF, extract its text, ask Gemini to identify
   competencies and generate multiple-choice questions, and save the resulting
   material and quiz.

Levels and gaps are percentage-point values on a 0-100 scale. For example, a
current level of `48` and a required level of `80` produces a gap of `32`.

## Repository structure

```text
karma-skill/
├── backend/
│   ├── main.py                    # FastAPI application and router registration
│   ├── database.py                # SQLite engine, sessions, DB dependency
│   ├── models.py                  # SQLAlchemy tables and relationships
│   ├── schemas.py                 # Pydantic request/response models
│   ├── seed.py                    # Resets and populates demo data
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Gemini configuration template
│   ├── karmaskill.db              # Local SQLite database (created/used at runtime)
│   ├── routers/
│   │   ├── employees.py
│   │   ├── competencies.py
│   │   ├── assessments.py
│   │   ├── roles.py
│   │   ├── recommendations.py
│   │   ├── materials.py
│   │   └── quizzes.py
│   ├── services/
│   │   ├── assessment_engine.py   # Weighted competency recalculation
│   │   ├── competency_engine.py   # Gap amount and status
│   │   ├── recommendation_engine.py
│   │   ├── role_engine.py          # Role-to-competency assignment
│   │   ├── material_engine.py      # Gemini competency extraction
│   │   ├── mcq_engine.py           # Gemini quiz generation
│   │   └── gemini_service.py       # Gemini client wrapper
│   ├── test_competency.py          # Manual competency/Gemini script
│   ├── test_mcq.py                 # Manual MCQ/Gemini script
│   └── test_gemini.py              # Manual Gemini connectivity script
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js                 # Fetch wrapper and endpoint methods
        ├── app.js                 # Page/application orchestration
        ├── dashboard.js           # Dashboard rendering
        └── state.js               # Demo account and cached UI state
```

## Backend architecture

### `main.py`: application composition

`main.py` creates the FastAPI application, creates any missing SQLAlchemy
tables, enables CORS for the local frontend origins, and includes all routers.
It also exposes:

- `GET /`: basic project/status information.
- `GET /health`: a lightweight health response.

The routers contain HTTP concerns: validation, database lookup, status codes,
and response shaping. The service modules contain reusable business rules so
the same calculations can be used from more than one route.

### `database.py`: persistence boundary

The database URL is currently hard-coded as:

```text
sqlite:///./karmaskill.db
```

Because it is a relative path, the database file is resolved relative to the
process working directory. The `get_db()` generator opens a SQLAlchemy session
for a request and closes it in `finally`. Routes receive that session through
FastAPI dependency injection.

### `schemas.py`: API validation

The Pydantic schemas define:

- `EmployeeCreate`: name, email, department, role, and optional experience.
- `EmployeeResponse`: the public employee representation.
- `CompetencyResponse` and `EmployeeCompetencyResponse`.
- `AssessmentCreate` and `AssessmentResponse`.
- `QuizAnswer` and `QuizAttemptCreate`.

FastAPI validates JSON bodies before route logic runs. Email addresses are
validated by `EmailStr`.

## Data model

The SQLAlchemy models in `backend/models.py` form a normalized relational
model:

| Table/model | Purpose |
|---|---|
| `employees` / `Employee` | Employee identity, department, role, and experience. |
| `competencies` / `Competency` | Canonical competency catalog. |
| `employee_competencies` / `EmployeeCompetency` | Employee's current level and role-required level for each competency. |
| `assessments` / `Assessment` | Historical score, question count, and percentage for an employee/competency. |
| `roles` / `Role` | Job-role catalog. |
| `role_competencies` / `RoleCompetency` | Competencies and required levels for each role. |
| `courses` / `Course` | Seeded learning courses. |
| `course_competencies` / `CourseCompetency` | Course coverage percentage for a competency. |
| `learning_materials` / `LearningMaterial` | Saved PDF metadata and extracted text. |
| `material_competencies` / `MaterialCompetency` | AI-detected material relevance to a competency. |
| `quizzes` / `Quiz` | Saved quiz metadata associated with a learning material. |
| `quiz_questions` / `QuizQuestion` | Question text, four options, correct answer, explanation, difficulty, and optional competency. |
| `quiz_attempts` / `QuizAttempt` | Employee quiz score history. |

Foreign keys connect employees to assessments and competencies, roles to role
requirements, courses/materials to competency mappings, and quizzes to their
questions and source materials.

## Application startup and database lifecycle

On import/startup, `Base.metadata.create_all(bind=engine)` creates tables that
do not already exist. It does not run migrations and does not remove or alter
existing columns.

The normal lifecycle is:

1. Start the API from `backend/`.
2. SQLAlchemy opens `karmaskill.db`.
3. FastAPI creates missing tables.
4. Optional `seed.py` resets and inserts the demo catalog.
5. Each request obtains and then closes a database session.

## API conventions

- Base URL during local development: `http://localhost:8000`.
- JSON routes use `Content-Type: application/json`.
- File routes use `multipart/form-data` with a `file` field.
- Query parameters are used for `number_of_questions`.
- Errors are returned as FastAPI JSON such as:

  ```json
  { "detail": "Employee not found" }
  ```

- Most missing resources return `404`.
- Invalid input generally returns `400`.
- AI failures are converted by the material routes to `500` responses.
- Interactive OpenAPI documentation is available at `/docs`; the generated
  schema is available at `/openapi.json`.

## Complete API reference

### System

#### `GET /`

Returns:

```json
{
  "project": "KarmaSkill AI",
  "message": "Competency Gap Engine API",
  "status": "running"
}
```

#### `GET /health`

Returns `{ "status": "healthy" }`. This checks that the application process is
serving requests; it does not perform a database or Gemini connectivity test.

### Employees

#### `POST /employees/`

Creates an employee from:

```json
{
  "name": "Asha Rao",
  "email": "asha@example.gov.in",
  "department": "Statistics Department",
  "role": "Statistical Officer",
  "experience": 3
}
```

The email must be unique. After the employee is committed, the role engine
looks up the exact role name and creates one `EmployeeCompetency` row for every
role requirement, initially with `current_level = 0`. If the role does not
exist, the employee is deleted and the request returns `400`.

Returns the created employee (`201` is not explicitly set; the current route
uses FastAPI's default success status).

#### `GET /employees/`

Fetches every employee as a list. It returns identity/profile fields but not
the employee's competency rows.

#### `GET /employees/{employee_id}`

Fetches one employee by numeric ID. Returns `404` if it does not exist.

#### `GET /employees/{employee_id}/gap-analysis`

Fetches the employee's role, current competency rows, and calculated gaps.
Each competency is returned with:

```json
{
  "competency": "Statistical Reasoning",
  "current_level": 48,
  "required_level": 80,
  "gap": 32,
  "status": "Critical"
}
```

The list is sorted from largest gap to smallest. A negative gap is clamped to
zero, so exceeding a requirement is reported as `Competent`.

### Competencies

#### `GET /competencies/`

Fetches the canonical competency catalog, including ID, name, description, and
category.

#### `GET /competencies/employee/{employee_id}`

Fetches the employee's competency assignments. Each item contains the nested
competency and its `current_level` and `required_level`. The route returns
`404` when no rows exist. It does not independently verify that the employee
exists.

### Roles

#### `GET /roles/`

Fetches every role and expands each role's `RoleCompetency` rows into:

```json
{
  "id": 1,
  "name": "Statistical Officer",
  "description": "Government officer responsible for statistical analysis, reporting and interpretation.",
  "required_competencies": [
    {
      "competency": "Data Analysis",
      "required_level": 85
    }
  ]
}
```

This is the source the frontend can use to display role expectations.

### Assessments

#### `POST /assessments/`

Accepts:

```json
{
  "employee_id": 1,
  "competency_id": 2,
  "score": 7,
  "total_questions": 10
}
```

The route verifies the employee and competency, requires a positive question
count, and requires `0 <= score <= total_questions`. It calculates and stores
`percentage = score / total_questions * 100`, rounded to two decimal places.
After saving the assessment, it recalculates the employee's current level for
that competency.

#### `GET /assessments/employee/{employee_id}`

Verifies the employee exists and returns all historical assessments for that
employee. The result contains assessment IDs, employee/competency IDs, score,
question count, and percentage.

### Recommendations

#### `GET /recommendations/employee/{employee_id}`

Verifies the employee and returns:

```json
{
  "employee_id": 1,
  "employee_name": "Rahul Sharma",
  "role": "Statistical Officer",
  "recommendations": []
}
```

Recommendations include seeded courses and saved AI-analyzed materials. Only
competencies with a positive gap are considered. Each recommendation contains
its resource ID/title, the matched competency, current/required levels, gap,
coverage or relevance, priority score, priority label, and a human-readable
reason.

### Learning materials and PDF processing

All material routes require a PDF filename ending in `.pdf`. They extract
text with `pypdf.PdfReader`; scanned/image-only PDFs may produce no text and
are rejected.

#### `POST /materials/upload`

Multipart field: `file`.

Extracts and returns the filename, page count, character count, and raw
extracted text. It does not call Gemini and does not save anything.

#### `POST /materials/generate-quiz?number_of_questions=5`

Multipart field: `file`. The question count must be between 1 and 20.
Extracts the PDF text and asks Gemini to create MCQs. Returns the file
metadata and generated questions, but does not save a material, quiz, or
questions.

#### `POST /materials/analyze`

Multipart field: `file`; optional `number_of_questions` query parameter.
Extracts the PDF, then makes two Gemini requests:

1. Identify relevant competencies from the fixed five-item catalog and assign
   relevance scores from 0-100. Scores below 30 should be omitted by the AI
   prompt.
2. Generate the requested number of MCQs from only the extracted material.

Returns file metadata, AI competency results, and generated questions. It does
not save anything.

#### `POST /materials/analyze-and-save?number_of_questions=5`

Multipart field: `file`. This is the persistence workflow:

1. Validate extension and question count.
2. Extract PDF text.
3. Ask Gemini for competencies and MCQs.
4. Save a `LearningMaterial` containing filename, title, extracted text, and
   page count.
5. Save recognized competency mappings in `MaterialCompetency`. Unknown AI
   competency names are ignored.
6. Select the highest-relevance recognized competency as the primary
   competency.
7. Save a `Quiz` and one `QuizQuestion` row per generated question.
8. Attach the primary competency ID to each saved question when available.
9. Return the material, detected competencies, primary competency, and quiz.

The current implementation commits several stages separately. If a later
database operation fails, earlier records may remain; production code should
use a transaction around the complete save workflow.

### Quizzes

#### `GET /quizzes/{quiz_id}`

Fetches a saved quiz and its questions. The response deliberately returns the
question text, options, and difficulty but not `correct_answer` or
`explanation`, so it is safe for an employee-facing quiz screen.

#### `POST /quizzes/{quiz_id}/attempt`

Accepts:

```json
{
  "employee_id": 1,
  "answers": [
    { "question_id": 10, "answer": "A" },
    { "question_id": 11, "answer": "C" }
  ]
}
```

The route:

1. Verifies the quiz and employee.
2. Loads all questions belonging to the quiz.
3. Normalizes submitted answers to uppercase.
4. Scores every stored question. Missing answers are incorrect.
5. Saves a `QuizAttempt`.
6. Finds the first non-null competency attached to a quiz question.
7. If one exists, also saves an `Assessment` and updates that employee's
   competency level.
8. Returns the score, percentage, per-question correctness, and whether an
   assessment was created.

The submitted question IDs are not currently restricted to the quiz's
question set; scoring is based on the quiz's stored questions. The endpoint
also does not reject duplicate answer entries; the last value in the lookup
wins.

## Core business logic

### Gap status (`competency_engine.py`)

`calculate_gap(current_level, required_level)` computes:

```text
gap = max(required_level - current_level, 0)
```

The status thresholds are:

| Gap | Status |
|---:|---|
| `>= 30` | `Critical` |
| `>= 15` and `< 30` | `Needs Improvement` |
| `> 0` and `< 15` | `Minor Gap` |
| `0` | `Competent` |

### Role assignment (`role_engine.py`)

When an employee is created, their exact role name is matched against
`roles.name`. Every role requirement becomes an employee competency row. A
new row starts at level zero; its required level comes from the role.

### Assessment weighting (`assessment_engine.py`)

The current level is derived from at most the three most recent assessments,
ordered by descending assessment ID:

```text
most recent: 50%
second most recent: 30%
third most recent: 20%
```

The weighted average is normalized by the weights actually present, rounded to
two decimals, and written to `EmployeeCompetency.current_level`. If no
assessment exists, the calculated level is zero.

### Recommendation scoring (`recommendation_engine.py`)

For every positive employee gap:

- Course score: `gap * course coverage / 100`
- Material score: `gap * material relevance / 100`

Each resource keeps only its best matching competency mapping. All course and
material recommendations are then combined and sorted descending by score:

| Score | Priority |
|---:|---|
| `>= 25` | High |
| `>= 15` and `< 25` | Medium |
| `< 15` | Low |

The engine does not currently filter out completed courses or previously
attempted materials.

## PDF and Gemini AI pipeline

`services/gemini_service.py` loads `GEMINI_API_KEY` from `.env` using
`python-dotenv`, creates a Google GenAI client, and calls the
`gemini-3.6-flash` model through `client.interactions.create`.

`material_engine.py` asks Gemini to map a document to only these competencies:

1. Data Analysis
2. Statistical Reasoning
3. Data Visualization
4. Communication
5. Policy Understanding

`mcq_engine.py` asks Gemini for JSON containing exactly four options,
one correct answer, an explanation, and a difficulty for each question.
Both engines remove optional Markdown code fences and parse the response as
JSON. Invalid JSON or missing expected keys raises `ValueError`, which the
material routes expose as an AI-analysis `500`.

The document text is inserted into the prompts. Do not upload confidential or
personal data to a third-party model without an appropriate privacy review.

## Frontend-to-backend data flow

`frontend/js/api.js` is the single API wrapper. It:

- Builds URLs from `AppState.apiBaseUrl`.
- Adds JSON content headers unless the body is `FormData`.
- Parses JSON responses.
- Converts non-2xx responses into JavaScript errors using the backend's
  `detail`.
- Provides methods for employees, competencies, roles, assessments,
  recommendations, materials, quizzes, and health checks.

`frontend/js/state.js` supplies demo accounts. The employee account is
hard-coded to employee ID `1`, which is expected to be present after seeding.
The admin account has no backend identity and is only a UI mode.

Typical employee dashboard loading uses:

1. `GET /employees/{id}`
2. `GET /employees/{id}/gap-analysis`
3. `GET /recommendations/employee/{id}`
4. `GET /assessments/employee/{id}`

The dashboard calculates display-only summary values such as average current
level, average required level, number of critical gaps, and recommendation
count. The authoritative per-competency gap and status come from the backend.

## Setup and running

### Prerequisites

- Python 3.10+ (the checked-in virtual environment is Python 3.12).
- A Gemini API key for AI endpoints.
- A browser for the static frontend.

### Install the backend

From PowerShell:

```powershell
cd C:\karma-skill\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell execution policy prevents activation, run the virtual
environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### Configure Gemini

Copy `.env.example` to `.env` and replace the placeholder:

```dotenv
GEMINI_API_KEY=your_real_key
```

The Gemini service validates this setting when it is imported. The basic
application routes may therefore also fail to start if the routes import the
AI services and no key is configured.

### Seed the demo database

From `backend/`:

```powershell
.\.venv\Scripts\python.exe seed.py
```

This deletes and recreates the seeded catalog data, including the demo
employee Rahul Sharma (ID 1), competencies, courses, roles, role mappings,
and course mappings. Do not run it against a database containing data you
want to preserve.

### Start the API

From `backend/`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn main:app --reload
```

Then open:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Start the frontend

Serve the `frontend/` directory with any static HTTP server. For example,
from the repository root:

```powershell
python -m http.server 5500 --directory frontend
```

Open `http://localhost:5500`. CORS is configured in `main.py` for ports 5500
and 3000 on localhost and 127.0.0.1.

## Seed data

The seed script defines these competencies:

- Data Analysis
- Statistical Reasoning
- Data Visualization
- Communication
- Policy Understanding

It defines these roles:

- `Statistical Officer`
- `Data Analyst`

It creates three courses:

- Advanced Statistical Reasoning
- Data Visualization Fundamentals
- Advanced Data Analysis

It creates Rahul Sharma as a `Statistical Officer` with example current and
required levels. The seed script creates role requirements after clearing
some tables, but it does not clear the `roles` or `role_competencies` tables
before inserting them. Running the script repeatedly can therefore encounter
duplicate role names.

## Testing and troubleshooting

There is no automated test suite or test configuration in the repository. The
`backend/test_*.py` files are manual scripts that call Gemini and print
results; they are not pytest tests and require a valid `GEMINI_API_KEY`.

Useful checks:

```powershell
cd C:\karma-skill\backend
.\.venv\Scripts\python.exe -c "import main; print(main.app.title)"
Invoke-WebRequest http://localhost:8000/health
Invoke-WebRequest http://localhost:8000/openapi.json
```

Common issues:

- **`GEMINI_API_KEY is not set`**: create `backend/.env` from
  `backend/.env.example`.
- **CORS errors**: serve the frontend from an allowed origin, such as
  `http://localhost:5500`, and make sure the API is on port 8000.
- **Employee 1 not found**: run the seed script, or update the frontend demo
  account to an existing employee ID.
- **PDF has no text**: provide a text-based PDF or add OCR before
  `pypdf` extraction.
- **`Role '...' not found`**: use an exact role name returned by `GET /roles/`.
- **AI JSON errors**: inspect the Gemini response/model availability and the
  input material; the engines require the requested JSON shape.

## Current limitations and production considerations

This repository is a prototype. Before production use, consider:

- Add authentication, authorization, tenant isolation, and role-based access
  control. Current endpoints allow callers to read and submit data for any
  numeric employee ID.
- Move the database URL and CORS origins to configuration.
- Use migrations (for example Alembic) instead of `create_all`.
- Add database constraints and indexes for frequently queried foreign-key
  pairs.
- Wrap material persistence in one transaction and handle malformed AI
  records with explicit validation.
- Validate upload size, MIME type, PDF parsing failures, and prompt length.
- Avoid logging or sending sensitive document contents to external AI services.
- Do not return raw extracted document text from an endpoint unless that is
  intentional.
- Add pagination to employee, assessment, and catalog endpoints.
- Add automated unit/API tests and a CI check.
- Prevent duplicate quiz answers and validate that every submitted question
  belongs to the requested quiz.
- Add explicit response models for untyped route responses.
- Replace the prototype demo accounts with a real identity provider.
- Store uploaded files or document references using a controlled storage
  service rather than retaining all extracted text without lifecycle policy.
