# Sir Sahil's English Language Centre

Phase 1 foundation for the SELC management platform: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, and Supabase (Auth + Postgres + RLS).

## What's in this phase

- **Project structure**: `app/(auth)`, `app/admin`, `app/owner`, `app/portal`, shared components, Supabase migrations, typed domain models, validation and data helpers.
- **Database schema**: profiles, students, batches, batch schedule/students, fee records/payments, attendance, curriculum (levels/modules/topics/assignments), batch progress, submissions, rankings, certificates, audit logs, settings.
- **Integrity & automation**: `SELC-0001` student-code sequence, `updated_at` triggers, curriculum session-type sync, attendance enrollment guard, batch progress validation, soft-delete guard for students, audit log triggers.
- **Auth & access**: staff email login, student code/phone login mapped to `<code>@selc.local`, role-based redirect, route protection in `proxy.ts` + server layouts, RLS policies for owner/reception/student.
- **UI shell**: deep blue + gold theme, light/dark mode, admin/owner sidebar layout, mobile-first student portal bottom nav, placeholder dashboards and phase pages.
- **Seed data**: owner, reception, 10 demo students, 3 weekday batches with opposite session orders, 4 levels × 2 session types × 2 modules × 5 topics with assignments.

## Tech stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4 + shadcn/ui (base-nova) + lucide-react
- Supabase PostgreSQL, Auth, RLS
- react-hook-form + zod
- TanStack Table, Recharts, JsBarcode, html5-qrcode, @react-pdf/renderer (installed for upcoming phases)

## Prerequisites

- Node.js 20+
- npm
- A Supabase project (free tier is enough for development)

## 1) Install dependencies

```bash
npm install
```

> On Windows PowerShell, if script execution blocks `npm`, run commands as `cmd /c "npm install"`.

## 2) Configure environment variables

Copy the example file and fill in your Supabase values:

```bash
copy .env.example .env.local
```

Required values from Supabase **Project Settings > API**:

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **Server-only**, never expose to browser |
| `NEXT_PUBLIC_APP_URL` | your local/app URL | `http://localhost:3000` for dev |
| `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS` | optional | `true` shows demo logins on login page |

## 3) Run database migrations

In the Supabase SQL Editor, run the migration files in order:

1. `supabase/migrations/001_enums.sql`
2. `supabase/migrations/002_tables.sql`
3. `supabase/migrations/003_functions.sql`
4. `supabase/migrations/004_rls.sql`
5. `supabase/migrations/005_storage.sql`
6. `supabase/migrations/006_seed_helpers.sql`

You can paste each file into the SQL Editor and run it, or use the Supabase CLI if you prefer:

```bash
supabase db push
```

> If you use `db push`, make sure your local Supabase CLI is linked to the correct project.

## 4) Seed demo data

After migrations are applied and `.env.local` has the service role key:

```bash
npm run seed
```

To wipe demo-seeded rows/users and reseed:

```bash
npm run seed:reset
```

### Demo credentials

| Role | Login | Password |
|---|---|---|
| Owner | `sir.sahil@selc.pk` | `Owner@12345` |
| Reception | `reception@selc.pk` | `Reception@12345` |
| Student | `SELC-0001` to `SELC-0010` (or the student's phone) | `Student@12345` |

Students can sign in with their **student code** or **phone number**; the app resolves it to the internal Supabase Auth email (`selc-0001@selc.local`).

## 5) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint
npm run typecheck   # TypeScript (no emit)
npm run seed        # Upsert demo seed data
npm run seed:reset  # Reset demo seed data, then seed
```

## Project structure

```text
app/
  (auth)/login/          # Staff + student login
  admin/                 # Owner + reception shared workspace
  owner/                 # Owner-only teaching panel
  portal/                # Student mobile-first portal
components/
  account/               # Account/password UI
  brand/                 # Logo
  layout/                # Shells, nav, theme, user menu
  portal/                # Portal-only client components
  shared/                # PageHeader, EmptyState, placeholders, badges
  ui/                    # shadcn/ui components
lib/
  auth/                  # Session resolution, server actions
  data/                  # Server-side dashboard/portal queries
  supabase/              # Browser/server/admin clients
  validation/            # Zod schemas
scripts/
  seed.ts                # Demo seed script (service role)
supabase/
  migrations/            # SQL migrations, run in order
types/
  domain.ts              # Hand-written schema-aligned types
```

## Role access model

| Area / data | Owner | Reception | Student |
|---|---:|---:|---:|
| `/admin` workspace | Yes | Yes | No |
| `/owner` teaching panel | Yes | No | No |
| `/portal` | No | No | Yes (own data) |
| Students, batches, fees, attendance | Yes | Yes | Own read where applicable |
| Curriculum progress, submissions marks, rankings, certificates | Yes | **No** | Own read/submission insert where applicable |

Access is enforced in three places:

1. **`proxy.ts`** — redirects unauthenticated/unauthorised route access.
2. **Server layouts/pages** — `requireRole` / `requireOwner` / `requireStudent`.
3. **Supabase RLS** — final authority in the database.

## Manual test checklist (Phase 1)

1. **Migrations**: run 001–006 in SQL Editor without errors.
2. **Seed**: `npm run seed` creates staff, students, batches, schedules, curriculum and settings.
3. **Owner login**: `sir.sahil@selc.pk` lands on `/owner` and can open `/admin`.
4. **Reception login**: `reception@selc.pk` lands on `/admin`; opening `/owner` redirects to `/admin`.
5. **Student login**: `SELC-0001` + `Student@12345` lands on `/portal`; `/admin` and `/owner` redirect to `/portal`.
6. **Logout**: sign-out returns to `/login`.
7. **Change password**: account page updates password; old password no longer works.
8. **RLS sanity** (Supabase SQL editor as authenticated user): reception cannot select `batch_progress`, `submissions`, `rankings`, or `certificates`; student can only select own rows.
9. **Build quality**: `npm run lint`, `npm run typecheck`, `npm run build` all pass.

## Implementation status

- **Phase 1-3**: foundation/auth, students/batches, fees/recovery core flows.
- **Phase 4-5**: barcode ID cards + attendance scan/kiosk foundations, curriculum builder + owner teaching panel foundations.
- **Phase 6-7**: assignment review queue + R2 presign/upload foundations, ranking/certificate schema + owner certificate manager + public verification page.
- **Phase 8 (foundation/in-progress)**: portal announcements, digital ID card, attendance session split, assignment upload flow, fees how-to-pay, profile change request, forced password change, PWA manifest + basic service worker.
- **Phase 9 (foundation/in-progress)**: reports dashboard with CSV export, audit log viewer, settings form, notification provider/template stubs, security headers, basic unit tests.

## Deployment (Vercel + Supabase + Cloudflare R2)

1. **Supabase**: create project, run migrations in order (`supabase/migrations/001...009`), set Auth URL config, create owner/reception users, run seed if needed.
2. **Environment variables**: set all `.env.example` values in Vercel. Never expose `SUPABASE_SERVICE_ROLE_KEY`.
3. **Cloudflare R2**: create bucket, create S3 API token, set `R2_*` env vars. Configure CORS to allow your Vercel domain with `PUT,GET,HEAD` and required headers for presigned uploads.
4. **Vercel**: import repo, build command `npm run build`, output default Next.js. Set `NEXT_PUBLIC_APP_URL` to production URL.
5. **Cron/jobs**: use Vercel Cron or Supabase scheduled job for monthly due generation/reminders (wire to fee generation/notification provider when automation is enabled).
6. **Backups**: enable Supabase PITR/backups; periodically export CSVs from Reports/Settings.

## Go-live checklist

- [ ] Create production owner and reception accounts; disable demo credentials.
- [ ] Verify `.env` secrets, R2 CORS, and Supabase Auth redirect URLs.
- [ ] Enter institute settings, payment details, logo/signature, thresholds.
- [ ] Import/create batches and active students; print ID cards.
- [ ] Run fee generation for current month and verify receipt printing.
- [ ] Test role access: owner, reception, student; confirm reception cannot access owner-only teaching/certificates/rankings/submission marks.
- [ ] Train reception on scan attendance, fee collection, and student search fallback.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.

## Environment & security

- Never commit `.env.local` or service role keys.
- Students are soft-deleted (`is_archived`) by design; hard deletes are blocked by a DB trigger.
- Audit triggers record important mutations in `audit_logs`.
- R2/Supabase storage objects should be private; serve via signed URLs only.
- Add rate limiting/WAF at edge/platform for login and scan endpoints before public go-live.
