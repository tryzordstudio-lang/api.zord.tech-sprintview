# SprintView Backend

SprintView is an AI-powered sprint intelligence backend built as a modular Express monolith. The codebase includes:

- JWT authentication with refresh token rotation
- Multi-tenant workspace isolation
- Jira OAuth 2.0 integration scaffolding
- Sprint import, metrics, AI summaries, and insights
- Public stakeholder reports and PDF generation
- Queue abstraction with BullMQ or inline fallback
- MongoDB persistence and Redis-backed async processing hooks

## Run

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Start MongoDB and optionally Redis
4. Run `npm run dev`
5. Seed the demo workspace with `npm run seed:demo`

## Frontend

An enterprise UI scaffold now lives in `frontend/`.

1. `cd frontend`
2. `cp .env.example .env`
3. `npm install`
4. `npm run dev`

The frontend is a dedicated Next.js app with:

- enterprise dashboard shell
- dashboard, sprints, reports, insights, analytics, integrations, and settings screens
- a presentation-grade public report route at `/report/[token]`
- reusable design-system components connected to the backend API

## Demo Account

Run `npm run seed:demo` to create an idempotent demo workspace with sample projects, sprints, stories, insights, and reports.

- Email: `demo@sprintview.local`
- Password: `Demo@12345`

Suggested usage flow:

1. Start the backend from the repo root with `npm run dev`
2. Start the frontend from `frontend/` with `npm run dev`
3. Open `http://localhost:3000/signin`
4. Sign in with the demo credentials above
5. Review the seeded dashboard, open `Sprints`, inspect `Insights`, and use `Reports` for the published and draft examples

## Main API Prefix

`/api/v1`

## Key Routes

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/jira/connect`
- `GET /api/v1/jira/callback`
- `GET /api/v1/jira/boards`
- `GET /api/v1/jira/sprints`
- `POST /api/v1/jira/import`
- `POST /api/v1/sprints/import`
- `GET /api/v1/sprints/:id`
- `DELETE /api/v1/sprints/:id/delete`
- `POST /api/v1/sprints/:id/retry-ai`
- `GET /api/v1/report/:token`
- `GET /api/v1/report/:id/pdf`

## External Integrations

- Jira OAuth requires Atlassian app credentials
- Gemini AI is optional; the app falls back to deterministic heuristics if `GEMINI_API_KEY` is not set
- Generated PDFs are stored locally in `generated/` and served from `/generated/...`
- BullMQ uses Redis when `REDIS_URL` is present, otherwise background jobs run inline
