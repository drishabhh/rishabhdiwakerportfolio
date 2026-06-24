<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git / deploy

When committing or pushing **code** changes (dashboard UI, API routes, components, etc.):

- **Do not commit** `data/content.local.json` — local admin saves land here in dev.
- **Do not commit** `data/content.json` unless the user explicitly asks to update production seed content.
- **Do not commit** files under `public/uploads/` (local favicon/resume test uploads).
- Production content on Vercel is stored in **Blob** (or GitHub if configured), not in the repo.

Before `git add`, run `git status` and exclude any dashboard test data files above.

## Resume builder (separate app)

The AI resume tailoring tool lives in `resume-builder/` — its own Next.js app, dependencies, and deploy. It is not part of the portfolio site routes or build.
