# LearnSync AI — An AI-Powered Study Companion

LearnSync AI is a full-stack educational study companion engineered to help students learn from textbooks, prepare for high-stakes exams, and practice job interviews using grounded artificial intelligence.

Built with **Next.js 16**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy 2.0**, **Pydantic V2**, **PyMuPDF**, and **ChromaDB**, powered by **NVIDIA Nemotron 3.5** (`nvidia/nemotron-3.5-lightning-30b-a3b` via NVIDIA NIM), **Groq** (`llama-3.3-70b-versatile`), and **Google Gemini** (`gemini-2.0-flash`).

---

## 1. System Architecture

```
                                  +---------------------------------------+
                                  |         Next.js 16 Frontend           |
                                  |  (TypeScript, Tailwind CSS, Lucide)   |
                                  |     Web Speech API (Voice Input & TTS)|
                                  +-------------------+-------------------+
                                                      |
                                             REST API | HTTP / JSON
                                                      v
                                  +---------------------------------------+
                                  |          FastAPI Backend              |
                                  |  (Pydantic V2 & SQLAlchemy 2.0 ORM)   |
                                  +---------+-------------------+---------+
                                            |                   |
            +-------------------------------+                   +-------------------------------+
            v                                                                                   v
+-------------------------+                                                         +-------------------------+
|      Course Engine      |                                                         |      Sprint Engine      |
| - PyMuPDF Extraction    |                                                         | - PYQ Extraction        |
| - Recursive Splitting   |                                                         | - Frequency vs Conf.    |
| - Grounded 5-Q Quizzes  |                                                         | - Priority Ranks        |
| - High-Yield Cheats     |                                                         | - Day-by-Day Timeline   |
+-----------+-------------+                                                         +-----------+-------------+
            |                                                                                   |
            +-------------------------------+---------------------------------------------------+
                                            v
                                  +-------------------------+
                                  |       Mock Mentor       |
                                  | - Resume Profile Parser |
                                  | - Adaptive Qs (1 by 1)  |
                                  | - 1-5 Scoring & Feedback|
                                  | - Analytics Report Card |
                                  +------------+------------+
                                               |
                     +-------------------------+-------------------------+
                     v                                                   v
         +------------------------+                          +------------------------+
         |     AI & Embeddings    |                          |    Relational Storage  |
         | - NVIDIA Nemotron 3.5  |                          | - SQLite (Local Dev)   |
         | - Groq Llama 3.3 70B   |                          | - PostgreSQL (Prod)    |
         | - Gemini 2.0 Flash     |                          | - Cascade Orphan Rules |
         | - ChromaDB Vector Store|                          +------------------------+
         | - Offline Grounded Mode|
         +------------------------+
```

---

## 2. Core Modules

### A. Course Engine
- **PDF Textbook Ingestion**: Validates file integrity, magic bytes (`%PDF`), size limits (up to 50 MB), and extractable text readability.
- **Recursive Text Chunking**: Splits extracted pages into semantic chunks with overlap while preserving page numbers and chunk metadata.
- **Vector Storage**: Indexes dense embeddings in dedicated ChromaDB collections per document.
- **Curriculum Outlines**: Formulates progressive modules, summaries, and key topics grounded in the text.
- **Grounded 5-Question Quizzes**: Formulates authentic multiple-choice quizzes with 4 options, 1 correct answer index, explanation, and an exact `source_chunk_id` citation.
- **Instant Grading & Explanations**: Evaluates student choices instantly with verbatim textbook excerpts and percentage score.
- **High-Yield Cheat Sheets**: Synthesizes essential definitions, key formulas, and core revision points.
- **Source Reference Modal**: Enables students to click any citation to view the exact page and source passage in the textbook.

### B. Sprint Engine
- **PYQ Processing**: Ingests Previous Year Question papers and parses recurring exam questions.
- **Frequency vs. Confidence Separation**: Calculates observed frequency from question papers and independently computes cosine similarity confidence against the textbook.
- **Transparent Priority Logic**: Ranks topics using the verified formula `Priority Score = (Normalized Frequency * 0.5) + (Similarity Match * 0.5)` with detailed rationale notes.
- **Day-by-Day Calendar**: Generates a timeline from the current date until the exam date with four categorized task types:
  - *Topic Study*
  - *Revision*
  - *Practice Questions*
  - *Mock Test*
- **Progress Tracking**: Tracks task completions and dynamically updates sprint progress percentage.
- **Progress-Preserving Regeneration**: Recalibrates remaining study days when exam dates change while strictly preserving all completed tasks and history.

### C. Mock Mentor
- **Resume & Job Profile Ingestion**: Extracts candidate skills, tech stack, and experience from uploaded resume PDFs.
- **Target Role Alignment**: Accepts custom job descriptions or presets.
- **Adaptive Question Studio**: Progresses through questions one at a time, dynamically adapting difficulty (*Easy*, *Medium*, *Hard*) based on previous answers.
- **Voice & Speech Support**: Uses the browser **Web Speech API** for live voice dictation (speech-to-text) and speech synthesis (text-to-speech) with microphone pulse animations and text fallback.
- **Constructive Answer Scoring**: Evaluates answers on a 1–5 scale across technical depth, communication clarity, and answer relevance.
- **Comprehensive Final Scorecard**: Produces an executive analytics report with overall performance score (0–100%), strengths, areas for improvement, recommended follow-up study topics, and an ethical educational disclaimer.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, Lucide React, Web Speech API |
| **Backend** | Python 3.12 / 3.13, FastAPI, SQLAlchemy 2.0, Pydantic V2 |
| **Vector DB** | ChromaDB Persistent Client |
| **PDF Extraction** | PyMuPDF (`fitz`) with pure-python `pypdf` fallback |
| **AI Providers** | NVIDIA Nemotron 3.5 (`nvidia/nemotron-3.5-lightning-30b-a3b`), Groq (`llama-3.3-70b-versatile`), Google Gemini (`gemini-2.0-flash`), Deterministic Grounded Parser |
| **Database** | SQLite (development) / PostgreSQL (production) |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX TestClient |

---

## 4. Local Development Quickstart

### Prerequisites
- Node.js >= 18 (Node 24 supported)
- Python >= 3.11 (Python 3.12 / 3.13 supported)

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run FastAPI backend with Uvicorn
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be accessible at:
- **API Server:** http://127.0.0.1:8000
- **Interactive Swagger Docs:** http://127.0.0.1:8000/docs
- **Health Check:** http://127.0.0.1:8000/health

### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Next.js development server
npm run dev
```
Frontend Web Application will be live at:
- **Application URL:** http://localhost:3000

---

## 5. Automated Testing Suite

The backend contains a complete automated test suite covering all modules:

```bash
cd backend
.\venv\Scripts\python.exe -m pytest tests -v
```

### Verified Test Suite (23 Tests, 100% Passing):
- `tests/test_pdf_service.py`
  - Valid PDF metadata check
  - Invalid file extension rejection
  - Empty file detection (0-bytes)
  - Corrupt header rejection
  - PyMuPDF extraction and page count validation
  - Recursive text splitting with overlap
- `tests/test_grounding_and_quiz.py`
  - Positive source grounding verification
  - Negative hallucinated chunk rejection
  - Insufficient context error handling
  - 5-Question multiple choice generation with options and `source_chunk_id`
  - Submission evaluation and score calculation
- `tests/test_sprint_service.py`
  - PYQ topic extraction and frequency calculation
  - Separation of question frequency from cosine similarity confidence
  - Priority ranking calculation and rationale notes
  - Day-by-day schedule generation with 4 task types
  - Schedule regeneration preserving completed tasks
- `tests/test_interview_service.py`
  - Candidate resume profile extraction
  - Adaptive question generation and category rotation
  - 1–5 scoring and difficulty adaptation
  - Final analytics report generation and ethical disclaimer
- `tests/test_api_endpoints.py`
  - Health check endpoint `/health`
  - Document upload and listing
  - Course curriculum generation and module viewing
  - Grounded quiz generation and submission
  - Exam sprint creation, task status toggle, and regeneration
  - Mock interview lifecycle from start to final scorecard

---

## 6. API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and AI provider check |
| `POST` | `/api/v1/documents/upload` | Upload & chunk educational PDF textbook / PYQ |
| `GET` | `/api/v1/documents` | List uploaded documents with chunk counts |
| `GET` | `/api/v1/documents/{id}` | Get document details and individual chunks |
| `DELETE` | `/api/v1/documents/{id}` | Cascade delete document, chunks, and vector store |
| `POST` | `/api/v1/courses/generate` | Generate course outline and cheat sheet from document |
| `GET` | `/api/v1/courses` | List generated courses |
| `GET` | `/api/v1/courses/{id}` | Get course details and modules |
| `GET` | `/api/v1/courses/{id}/modules/{mid}` | Get module learning content and source chunk IDs |
| `GET` | `/api/v1/courses/{id}/cheat-sheet` | Get high-yield cheat sheet |
| `GET` | `/api/v1/courses/{id}/sources/{cid}` | Inspect grounded source page and excerpt |
| `POST` | `/api/v1/quizzes/generate/{mid}` | Generate 5 grounded multiple-choice questions |
| `GET` | `/api/v1/quizzes/{id}` | Get quiz questions for student runner |
| `POST` | `/api/v1/quizzes/{id}/submit` | Submit answers for instant grading & explanation |
| `POST` | `/api/v1/sprints` | Create exam sprint planner with PYQ topic matching |
| `GET` | `/api/v1/sprints` | List created exam sprints |
| `GET` | `/api/v1/sprints/{id}` | Get sprint timeline and ranked topics |
| `PATCH`| `/api/v1/sprints/{id}/tasks/{tid}` | Toggle task completion status |
| `POST` | `/api/v1/sprints/{id}/regenerate` | Recalibrate schedule while preserving completed tasks |
| `POST` | `/api/v1/interviews/start` | Start adaptive mock interview session |
| `GET` | `/api/v1/interviews/{id}` | Get current session progression |
| `POST` | `/api/v1/interviews/{id}/questions/{qid}/answer` | Submit voice/text answer, evaluate (1-5), adapt difficulty |
| `GET` | `/api/v1/interviews/{id}/report` | Get final analytics report card |

---

## 7. Production Deployment Guide

### Deploying Frontend to Vercel
1. Push repository to GitHub.
2. In the Vercel dashboard, click **Add New Project** and select the repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Next.js**.
5. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend (e.g., `https://learnsync-ai-backend.onrender.com/api/v1`).
6. Click **Deploy**.

### Deploying Backend to Render
1. In Render, select **New Blueprint Instance** and point to the repository.
2. Render detects `render.yaml` automatically:
   - Sets up a Python Web Service for the backend.
   - Sets up a managed PostgreSQL database.
   - Binds `DATABASE_URL` directly to PostgreSQL.
3. In the Render Dashboard environment settings for the service, add:
   - `GROQ_API_KEY`: Your Groq API Key.
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
4. Click **Apply**.

### Docker Deployment
Run the complete stack with Docker Compose:
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
