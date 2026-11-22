<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sir Sahil's English Language Centre — Master Concept (source of truth)

> This file is the product brief for the whole build. Every later prompt must follow it.
> Do not build ahead of the prompt you were given.

## About the institute

- Sir Sahil teaches English. Students attend Monday–Friday classes; separate Weekend batches exist for students who can only attend on weekends.
- Classes run from 2:00 PM until 10:00 PM. Batches start at 2 PM, 3 PM, 4 PM, 5 PM and so on; each batch is 2 hours long.
- Every batch has two 1-hour sessions per class day: one **Conversation** and one **Grammar** session. The order differs per batch (e.g. the 2 PM batch runs Conversation 2–3 PM then Grammar 3–4 PM, while the 3 PM batch runs Grammar 3–4 PM then Conversation 4–5 PM). The timetable is therefore configured per batch, and attendance and course progress are tracked per session type.
- Currency: **PKR**. Timezone: **Asia/Karachi**. Week starts **Monday**.

## Goal

One system for admissions, batches and timetable, fee collection and recovery, barcode attendance, curriculum and topic-by-topic progress, video assignments, ranking, certificates and a student portal.

## Roles (no teacher panel for staff)

1. **Owner (Sir Sahil)** — full access. Exclusive access to the **Teaching Panel**. Can see everything reception can.
2. **Reception (staff)** — students, batches, fees, attendance, reports. **Hard-blocked** (UI + database/API) from course progress, assignment marks, rankings and certificates.
3. **Student** — Student Portal, own data only.

## Teaching Panel (Owner only)

- Select Batch → Session type (Conversation/Grammar) → Level → Module → Topic → **Mark Completed**.
- On the next visit the screen shows **"Last completed: Topic X (date)"** and **"Today's topic: Topic Y"** (next in order).
- Each topic owns related assignments.
- Owner reviews submitted video assignments, awards marks/feedback and ranks students. Only the owner can award or change marks/ranks.
- Owner approves certificates when a student finishes a level.

## Curriculum

Level (Beginner, Pre-Intermediate, Intermediate, Advanced) → Modules → Topics → Assignments.
Conversation and Grammar each have their own curriculum tree; every batch keeps separate progress for each session type.

## Barcode attendance

- Every student gets a unique code `SELC-0001` (auto-increment) and an ID card with a Code 128 barcode.
- Attendance is marked at reception by USB barcode scanner. Fallbacks: type the code, search by name/phone, or scan with phone/laptop camera.
- Attendance is per batch, per session, per date.

## Student Portal

Attendance calendar, course progress per level, assignments with video submission, marks/feedback/rank, fee status and receipts, timetable, certificates.

## Tech stack (exact)

- Next.js (App Router, latest) + TypeScript, Tailwind CSS, shadcn/ui, lucide-react
- Supabase: PostgreSQL, Auth, Row Level Security
- Cloudflare R2 (S3-compatible) for video/file storage via presigned URLs — never store videos in the database
- react-hook-form + zod, TanStack Table, Recharts
- JsBarcode for barcode rendering, html5-qrcode / @zxing/browser for camera scanning
- @react-pdf/renderer or pdf-lib for PDFs (receipts, ID cards, certificates)
- Deploy target: Vercel + Supabase

## Quality rules

- Mobile-first and responsive. Students mostly use phones; reception uses a desktop.
- Clean, professional, modern UI. Primary colour deep blue, accent gold. Light and dark mode.
- UI text in English now, but every string must be structured for future Urdu support (i18n-ready).
- Every list has search, filters and pagination. Every destructive action asks for confirmation. Students are **soft-deleted** (`is_archived`), never hard-deleted.
- Audit log for important actions (fee payments, edits, deletions, attendance edits, rank/marks changes).
- Validate everything on the server. Enforce permissions with RLS **and** server-side checks.
- Secrets in environment variables; keep `.env.example` up to date.
- Clean, commented, modular code with reusable components. README with setup steps.
- After each prompt the app must build with no TypeScript or lint errors; summarise what was done and how to test it.

## Build prompts

1. Foundation, database and auth
2. Students & batches
3. Fees
4. Barcode & attendance
5. Curriculum & Teaching Panel
6. Assignments & ranking
7. Certificates
8. Student portal
9. Reports, notifications & polish

## Implementation conventions in this repository

- Next.js 16: middleware is `proxy.ts`; route `params`/`searchParams` are Promises; Supabase session refresh happens in `proxy.ts`.
- Route groups: `app/(auth)/login`, `app/admin/*` (owner + reception), `app/owner/*` (owner only), `app/portal/*` (student only).
- Auth is resolved through `lib/auth/session.ts` (`requireRole`, `getCurrentProfile`); RLS is the final authority.
- Supabase clients: `lib/supabase/server.ts` (RLS, request-scoped), `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts` (service role, server-only scripts).
- Database migrations live in `supabase/migrations` and are numbered. All tables carry `created_at` / `updated_at` and an audit trail where required.
- Domain types live in `types/domain.ts`; validation schemas in `lib/validation/*`.
- UI copy is looked up through `lib/i18n.ts` so Urdu can be added later without touching components.
- Students log in with student code or phone + password; internally Supabase Auth uses `<code>@selc.local`.
