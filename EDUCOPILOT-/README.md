# EduCopilot — Dual-Persona GenAI Education Platform

EduCopilot is a full-stack, dual-persona GenAI education platform serving **Students** and **Professors** through an intelligent assistant powered by an LLM + RAG pipeline over course materials, featuring strict per-user and per-role MongoDB data isolation.

---

## 🎨 Color Palette & Aesthetic

- **Primary Actions & Links:** `#2563EB` (Tailwind `blue-600`)
- **Success & Progress:** `#16A34A` (Tailwind `green-600`)
- **Warnings & Alerts:** `#EA580C` (Tailwind `orange-600`)
- **Theme:** Default Light Mode with Sun/Moon Dark Mode Toggle in the top navigation
- **Layout:** Dedicated single-purpose pages with a collapsible sidebar and clean modern SaaS dashboard cards (`rounded-xl` / `rounded-3xl`)

---

## 🔒 Strict Data Isolation Architecture

- **Per-User Scoping:** Every document in `StudyPlan`, `TestAttempt`, `Doubt`, and `Progress` includes an indexed `userId` tied strictly to the student's ID.
- **Per-Professor Scoping:** Every document in `LectureSchedule`, `Material`, and `GradedSubmission` includes an indexed `professorId`.
- **JWT Authorization Enforcement:** All backend queries filter strictly using `req.user._id` decoded from the verified JWT header — client-supplied IDs are never trusted.
- **Role Guards:** Route guards on both frontend and backend (`authMiddleware.js`) guarantee Students cannot access Professor APIs or vice-versa.
- **Cross-User Isolation Example:** Student *Hamdan* can never view or query Student *Akers*' study plans or test diagnostics.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or MongoDB Atlas connection string)

### 2. Configure Environment Variables
Inside `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/educopilot
JWT_SECRET=educopilot_super_secret_jwt_key_2026_secure
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```
*(Note: If `GROQ_API_KEY` is not provided, an intelligent contextual fallback engine activates automatically so all features remain 100% functional).*

### 3. Seed Demo Data
```bash
cd server
npm run seed
```

### 4. Run Server & Client
In Terminal 1 (Backend):
```bash
cd server
npm run dev
```

In Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧑‍💻 Demo User Accounts

| Persona | Name | Email | Password | Isolated Access |
|---|---|---|---|---|
| **Student** | Alex Rivera | `alex@student.edu` | `password123` | Alex's private plans, tests, doubts |
| **Student** | Sophia Chen | `sophia@student.edu` | `password123` | Sophia's private plans, tests, doubts |
| **Professor** | Prof. Marcus Vance | `vance@professor.edu` | `password123` | Scheduling, RAG docs, grading, materials |

---

## 🧩 Key Features

### 🎓 Student Workspace
1. **Grounded Study Plans:** Topic & syllabus reference input -> multi-day actionable roadmap with progress checklist and markdown revision notes.
2. **AI Practice Tests & Diagnostics:** Dynamic MCQ generator (Easy/Medium/Hard/Adaptive), real-time timer runner, immediate scoring, question-by-question explanations, and weak area tracking.
3. **Course Doubt Clarification Chat:** LLM + RAG chat with source citations, relevance scores, key takeaways, and suggested follow-ups.
4. **Diagnostic Test History:** Historical score progression and weak spot alerts over time.

### 🏛️ Professor Suite
1. **Course Materials & RAG Ingestion:** Upload syllabus/textbooks (PDF/Text/Markdown) -> 500-800 token chunking with overlap -> indexed into subject-scoped RAG vector chunks.
2. **Lecture Scheduling:** Topic sequence optimizer with pedagogical prerequisite mapping and calendar management.
3. **Material Preparation:** Auto-draft slide deck outlines (with speaker notes), comprehensive lecture notes, and assignment question banks.
4. **AI Assessment & Individualized Grading:** Rubric-based evaluation of student short-answer responses with score itemization and non-generic constructive feedback.
