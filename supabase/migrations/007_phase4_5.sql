-- Phase 4 & 5 schema additions (idempotent)

-- Student ID card tracking
alter table public.students
  add column if not exists card_issued_at timestamptz,
  add column if not exists card_reprint_count integer not null default 0;

-- Batch current level per track (Phase 5)
alter table public.batches
  add column if not exists current_conversation_level_id uuid references public.levels(id) on delete set null,
  add column if not exists current_grammar_level_id uuid references public.levels(id) on delete set null;

-- Late join / transfer starting point override (Phase 5)
alter table public.batch_students
  add column if not exists starting_conversation_topic_id uuid references public.topics(id) on delete set null,
  add column if not exists starting_grammar_topic_id uuid references public.topics(id) on delete set null;

-- Class note on progress (Phase 5)
alter table public.batch_progress
  add column if not exists note text,
  add column if not exists skipped boolean not null default false,
  add column if not exists skip_reason text;

-- Assignment metadata (Phase 5)
alter table public.topic_assignments
  add column if not exists submission_type text not null default 'video'
    check (submission_type in ('video','text','both')),
  add column if not exists max_marks numeric(5,2) not null default 10;

-- Curriculum estimated classes (Phase 5)
alter table public.modules
  add column if not exists estimated_classes integer;
alter table public.topics
  add column if not exists estimated_classes integer;

-- Holidays (Phase 4)
create table if not exists public.institute_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists set_updated_at on public.institute_holidays;
create trigger set_updated_at before update on public.institute_holidays
  for each row execute function public.set_updated_at();

-- Student leave ranges (Phase 4)
create table if not exists public.student_leaves (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_leaves_dates check (end_date >= start_date)
);
create index if not exists student_leaves_student_idx on public.student_leaves(student_id, start_date, end_date);
drop trigger if exists set_updated_at on public.student_leaves;
create trigger set_updated_at before update on public.student_leaves
  for each row execute function public.set_updated_at();

-- Attendance settings defaults
insert into public.settings(key, value, description) values
  ('attendance_grace_minutes', '10', 'Minutes after session start before marking late'),
  ('attendance_fee_blocking', 'false', 'Block attendance when fee overdue'),
  ('attendance_allow_early_scan_minutes', '30', 'Allow scanning before session start')
on conflict (key) do nothing;

-- RLS for new tables
alter table public.institute_holidays enable row level security;
alter table public.student_leaves enable row level security;

drop policy if exists holidays_staff_all on public.institute_holidays;
create policy holidays_staff_all on public.institute_holidays
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists holidays_student_read on public.institute_holidays;
create policy holidays_student_read on public.institute_holidays
  for select to authenticated
  using (public.current_user_role() = 'student');

drop policy if exists leaves_staff_all on public.student_leaves;
create policy leaves_staff_all on public.student_leaves
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists leaves_student_read_own on public.student_leaves;
create policy leaves_student_read_own on public.student_leaves
  for select to authenticated
  using (student_id = public.current_student_id());
