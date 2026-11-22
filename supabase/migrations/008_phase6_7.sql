-- Phase 6 & 7 schema additions

-- Enum extensions (db-push runs this file without transaction)
ALTER TYPE public.submission_status ADD VALUE IF NOT EXISTS 'late';
ALTER TYPE public.submission_status ADD VALUE IF NOT EXISTS 'resubmit_requested';
ALTER TYPE public.certificate_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.certificate_status ADD VALUE IF NOT EXISTS 'revoked';

-- Submissions extensions
alter table public.submissions
  add column if not exists text_answer text,
  add column if not exists voice_feedback_url text,
  add column if not exists voice_feedback_key text,
  add column if not exists is_late boolean not null default false,
  add column if not exists version integer not null default 1,
  add column if not exists resubmission_requested_at timestamptz;

create table if not exists public.submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  version integer not null,
  video_url text,
  video_key text,
  text_answer text,
  submitted_at timestamptz not null default now(),
  marks numeric(5,2),
  feedback text,
  created_at timestamptz not null default now()
);
create index if not exists submission_versions_submission_idx on public.submission_versions(submission_id, version desc);

-- Rankings extensions
alter table public.rankings
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists period_label text;

-- Certificates extensions
alter table public.certificates
  add column if not exists revoked_at timestamptz,
  add column if not exists revoke_reason text,
  add column if not exists grade text,
  add column if not exists remarks text;

-- Settings defaults for Phase 6/7
insert into public.settings(key, value, description) values
  ('assignment_max_size_mb', '200', 'Max assignment video size in MB'),
  ('assignment_max_minutes', '5', 'Max assignment video length in minutes'),
  ('ranking_weight_marks', '60', 'Ranking weight: average marks'),
  ('ranking_weight_attendance', '25', 'Ranking weight: attendance'),
  ('ranking_weight_consistency', '15', 'Ranking weight: submission consistency'),
  ('ranking_show_mode', '"top3"', 'Ranking visibility: own | top3 | top10 | full'),
  ('certificate_min_attendance', '75', 'Minimum attendance for certificate eligibility'),
  ('certificate_min_marks', '50', 'Minimum average marks for certificate eligibility'),
  ('certificate_block_if_dues', 'false', 'Block certificate if dues pending'),
  ('certificate_signature_url', '""', 'Signature image URL for certificates')
on conflict (key) do nothing;

-- RLS for submission_versions
alter table public.submission_versions enable row level security;
drop policy if exists submission_versions_owner_all on public.submission_versions;
create policy submission_versions_owner_all on public.submission_versions
  for all to authenticated using (public.is_owner()) with check (public.is_owner());
drop policy if exists submission_versions_student_own on public.submission_versions;
create policy submission_versions_student_own on public.submission_versions
  for select to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.student_id = public.current_student_id()));
