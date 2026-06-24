# Resume Builder

Standalone app for uploading a PDF resume, tailoring it to a job description with AI, and exporting a one-page A4 PDF.

Separated from the portfolio site — deploy independently (e.g. Vercel project `resume-builder` on port 3001 locally).

## Setup

```bash
cd resume-builder
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY, GROQ_API_KEY, and/or OPENROUTER_API_KEY
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## API routes

| Route | Purpose |
|-------|---------|
| `POST /api/parse` | PDF → structured resume |
| `POST /api/generate` | JD tailoring |
| `POST /api/chat` | Instruction + style edits |
| `POST /api/fetch-jd` | Extract job description from URL |
| `GET /api/status` | AI provider readiness |
