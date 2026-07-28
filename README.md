# LMS Exam Portal — MERN

A production-oriented LMS and online examination portal with separate Student, Teacher and Super Admin experiences.

## Features

- Student login, exam dashboard, timed exam player, server-controlled timer and reconnect support
- Autosave answers, mark for review, idempotent final submission and automatic scoring
- Teacher exam builder, question management, publish/start/end controls and live candidate monitoring
- Super Admin user management and platform overview
- Student result history and downloadable PDF result sheets
- MongoDB indexes and stateless APIs designed for horizontal scaling
- Responsive premium UI with dark/light mode

## Quick start

```bash
cp .env.example server/.env
docker compose up -d
npm install
npm run seed
npm run dev
```

Open `http://localhost:5173`.

### Demo accounts

- Super Admin: `admin@lms.dev` / `Admin@123`
- Teacher: `teacher@lms.dev` / `Teacher@123`
- Student: `student@lms.dev` / `Student@123`

## Concurrent exam architecture

The answer API performs indexed upserts and the submit endpoint is idempotent. Run several stateless Node.js instances behind a load balancer, use MongoDB Atlas with an appropriate cluster tier, and serve the React build through a CDN. PDF generation is kept outside the submission request—the PDF is generated only when requested.

Before production, use k6 or Artillery to validate the actual infrastructure with 1,000 virtual candidates.

## Expiry worker

Run the automatic server-side submission worker in a separate process:

```bash
npm run worker:expiry -w server
```

## 1,000-candidate load test

Create 1,000 load-test students, install k6, and run:

```bash
LOAD_TEST_BATCH=CSE-2026-A npm run seed:load -w server
BASE_URL=http://localhost:5000/api EXAM_ID=<exam-id> k6 run load-tests/exam-flow.k6.js
```

Use a staging database and infrastructure that matches production. Never run the 1,000-user test against the local development server.
