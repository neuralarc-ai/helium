# RUN.md

## Helium AI: Local Development & Run Guide

This guide provides step-by-step instructions to set up and run the Helium AI project locally, including environment configuration, Docker setup, and local development commands for both frontend and backend.

---

## 1. Clone the Repository

```bash
git clone https://github.com/neuralarc-ai/helium
cd helium
```

---

## 2. Environment Variables

### Backend
- Create a `.env` file in the `backend/` directory.
- Populate it with the required environment variables

### Frontend
- Create a `.env.local` file in the `frontend/` directory.
- Populate it with the required environment variables

---

## 3. Run with Docker Compose (Recommended for First-Time Setup)

From the project root:

```bash
docker compose up --build
```

- This will build and start all services (frontend, backend, redis, etc.)
- Wait until all services are healthy and accessible.

#### Verify
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api/health

#### If Everything Works
Shut down Docker Compose and remove volumes (to avoid port conflicts for local dev):

```bash
docker compose down -v
```

---

## 4. Run Locally (Recommended for Development)

### Prerequisites
- Node.js 18+
- Python 3.11+
- Redis & RabbitMQ (can be run via Docker or locally)

### 4.1. Frontend

```bash
cd frontend
npm install
npm run dev
```
- App will be available at http://localhost:3000

### 4.2. Backend

#### a. Create and Activate Virtual Environment

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

#### b. Run FastAPI Server

```bash
uv run api.py
```
- API will be available at http://localhost:8000

#### c. Run Dramatiq Worker (in a new terminal, with venv activated)

```bash
cd backend
source .venv/bin/activate
uv run dramatiq --processes 4 --threads 4 run_agent_background
```

---

## 5. Start Redis

You can run these services either via Docker Compose or locally:

### Option 1: Docker Compose

```bash
docker compose up redis
```

### Option 2: Homebrew (macOS)

```bash
brew services start redis
```

---

## 6. Additional Notes
- Ensure all environment variables are set correctly for both frontend and backend.
- For database migrations, see `backend/supabase/migrations/` and use the provided scripts.
- For troubleshooting, check logs in each service's terminal.

---

## 7. Useful URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Redis: localhost:6379
