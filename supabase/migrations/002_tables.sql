-- =============================================================================
-- 002 — Core schema
-- Every table carries created_at / updated_at. Money is stored as numeric(12,2)
-- in PKR. Timestamps are timestamptz and shown in Asia/Karachi by the app.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'student',
  phone       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile for every auth user. Role is the single source of truth for access control.';

-- ---------------------------------------------------------------------------
-- Student code generator (SELC-0001, SELC-0002, ...)
-- ---------------------------------------------------------------------------
create sequence if not exists public.student_code_seq start with 1 increment by 1;

create or replace function public.next_student_code()
returns text
language sql
security definer
set search_path = public
as $$
  select 'SELC-' || lpad(nextval('public.student_code_seq')::text, 4, '0');
$$;

grant usage, select on sequence public.student_code_seq to authenticated;

-- ---------------------------------------------------------------------------
-- Students (soft delete only — enforced by a trigger in 003)
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id               uuid primary key default gen_random_uuid(),
  student_code     text not null unique default public.next_student_code(),
  profile_id       uuid unique references public.profiles (id) on delete set null,
  full_name        text not null,
  father_name      text,
  phone            text not null,
  parent_phone     text,
  whatsapp         text,
  cnic_or_bform    text,
  address          text,
  photo_url        text,
  date_of_birth    date,
  admission_date   date not null default current_date,
  status           public.student_status not null default 'active',
  monthly_fee      numeric(12, 2) not null default 0 check (monthly_fee >= 0),
  discount         numeric(12, 2) not null default 0 check (discount >= 0),
  notes            text,
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint students_code_format check (student_code ~ '^SELC-[0-9]{4,}$'),
  constraint students_discount_lte_fee check (discount <= monthly_fee)
);

create index if not exists students_status_idx on public.students (status) where is_archived = false;
create index if not exists students_phone_idx on public.students (phone);
create index if not exists students_profile_idx on public.students (profile_id);
create index if not exists students_name_trgm_idx on public.students using gin (full_name gin_trgm_ops);
create index if not exists students_archived_idx on public.students (is_archived);

-- ---------------------------------------------------------------------------
-- Batches & timetable
-- ---------------------------------------------------------------------------
create table if not exists public.batches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  class_type  public.class_type not null default 'weekday',
  start_time  time not null,
  capacity    integer not null default 20 check (capacity > 0),
  start_date  date not null default current_date,
  status      public.batch_status not null default 'active',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint batches_name_unique unique (name)
);

create index if not exists batches_status_idx on public.batches (status);

create table if not exists public.batch_schedule (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.batches (id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 1 and 7), -- ISO: 1 = Monday
  session_type  public.session_type not null,
  start_time    time not null,
  end_time      time not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint batch_schedule_time_valid check (start_time < end_time),
  constraint batch_schedule_unique unique (batch_id, day_of_week, session_type)
);

create index if not exists batch_schedule_batch_idx on public.batch_schedule (batch_id);
create index if not exists batch_schedule_day_idx on public.batch_schedule (day_of_week, start_time);

create table if not exists public.batch_students (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  joined_on   date not null default current_date,
  left_on     date,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint batch_students_unique unique (batch_id, student_id),
  constraint batch_students_dates_valid check (left_on is null or left_on >= joined_on)
);

create index if not exists batch_students_student_idx on public.batch_students (student_id) where active = true;
create index if not exists batch_students_batch_idx on public.batch_students (batch_id) where active = true;

-- ---------------------------------------------------------------------------
-- Fees (Phase 3 builds the UI; base tables exist from Phase 1)
-- ---------------------------------------------------------------------------
create table if not exists public.fee_records (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students (id) on delete cascade,
  batch_id       uuid references public.batches (id) on delete set null,
  period_month   date not null,
  amount_due     numeric(12, 2) not null check (amount_due >= 0),
  discount       numeric(12, 2) not null default 0 check (discount >= 0),
  amount_paid    numeric(12, 2) not null default 0 check (amount_paid >= 0),
  due_date       date not null,
  status         public.fee_status not null default 'pending',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint fee_records_month_first_day check (extract(day from period_month) = 1),
  constraint fee_records_unique unique (student_id, period_month)
);

create index if not exists fee_records_student_idx on public.fee_records (student_id);
create index if not exists fee_records_status_idx on public.fee_records (status, due_date);
create index if not exists fee_records_period_idx on public.fee_records (period_month);

create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  fee_record_id    uuid references public.fee_records (id) on delete set null,
  student_id       uuid not null references public.students (id) on delete cascade,
  amount           numeric(12, 2) not null check (amount > 0),
  method           public.payment_method not null default 'cash',
  paid_on          date not null default current_date,
  receipt_no       text unique,
  received_by      uuid references public.profiles (id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists payments_fee_idx on public.payments (fee_record_id);
create index if not exists payments_paid_on_idx on public.payments (paid_on);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students (id) on delete cascade,
  batch_id      uuid not null references public.batches (id) on delete cascade,
  session_type  public.session_type not null,
  date          date not null default current_date,
  status        public.attendance_status not null default 'present',
  marked_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  marked_via    public.marked_via not null default 'manual_code',
  marked_at     timestamptz not null default now(),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint attendance_unique unique (student_id, batch_id, session_type, date)
);

create index if not exists attendance_batch_date_idx on public.attendance (batch_id, date);
create index if not exists attendance_student_date_idx on public.attendance (student_id, date desc);
create index if not exists attendance_date_idx on public.attendance (date);

-- ---------------------------------------------------------------------------
-- Curriculum: Level > Module > Topic > Assignment
-- Conversation and Grammar have independent trees. session_type is stored on
-- every table (denormalised for fast filtering) and kept consistent by a
-- trigger in 003.
-- ---------------------------------------------------------------------------
create table if not exists public.levels (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  session_type  public.session_type not null,
  sort_order    integer not null default 1,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint levels_unique unique (name, session_type)
);

create index if not exists levels_session_idx on public.levels (session_type, sort_order);

create table if not exists public.modules (
  id            uuid primary key default gen_random_uuid(),
  level_id      uuid not null references public.levels (id) on delete cascade,
  name          text not null,
  session_type  public.session_type not null,
  description   text,
  sort_order    integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists modules_level_idx on public.modules (level_id, sort_order);

create table if not exists public.topics (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.modules (id) on delete cascade,
  name          text not null,
  session_type  public.session_type not null,
  description   text,
  sort_order    integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists topics_module_idx on public.topics (module_id, sort_order);

create table if not exists public.topic_assignments (
  id            uuid primary key default gen_random_uuid(),
  topic_id      uuid not null references public.topics (id) on delete cascade,
  title         text not null,
  instructions  text,
  session_type  public.session_type not null,
  sort_order    integer not null default 1,
  due_offset_days integer not null default 2 check (due_offset_days >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists topic_assignments_topic_idx on public.topic_assignments (topic_id, sort_order);

-- Per-batch, per-session curriculum progress.
create table if not exists public.batch_progress (
  id            uuid primary key default gen_random_uuid(),
  batch_id      uuid not null references public.batches (id) on delete cascade,
  session_type  public.session_type not null,
  topic_id      uuid not null references public.topics (id) on delete cascade,
  completed_on  date not null default current_date,
  completed_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint batch_progress_unique unique (batch_id, topic_id)
);

create index if not exists batch_progress_batch_idx on public.batch_progress (batch_id, session_type, completed_on desc);

-- ---------------------------------------------------------------------------
-- Assignments, rankings, certificates
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students (id) on delete cascade,
  assignment_id  uuid not null references public.topic_assignments (id) on delete cascade,
  video_url      text,
  video_key      text, -- Cloudflare R2 object key (videos are never stored in Postgres)
  status         public.submission_status not null default 'submitted',
  marks          numeric(5, 2) check (marks between 0 and 100),
  feedback       text,
  submitted_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint submissions_unique unique (student_id, assignment_id)
);

create index if not exists submissions_student_idx on public.submissions (student_id);
create index if not exists submissions_status_idx on public.submissions (status);

create table if not exists public.rankings (
  id          uuid primary key default gen_random_uuid(),
  batch_id    uuid not null references public.batches (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  level_id    uuid not null references public.levels (id) on delete cascade,
  rank        integer not null check (rank > 0),
  score       numeric(6, 2),
  given_by    uuid references public.profiles (id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint rankings_unique unique (batch_id, student_id, level_id)
);

create index if not exists rankings_batch_level_idx on public.rankings (batch_id, level_id, rank);

create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  certificate_no     text not null unique,
  student_id         uuid not null references public.students (id) on delete cascade,
  level_id           uuid not null references public.levels (id) on delete restrict,
  issued_on          date,
  approved_by        uuid references public.profiles (id) on delete set null,
  status             public.certificate_status not null default 'pending',
  verification_token uuid not null unique default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists certificates_student_idx on public.certificates (student_id);
create index if not exists certificates_status_idx on public.certificates (status);

-- ---------------------------------------------------------------------------
-- Audit log & settings
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity      text not null,
  entity_id   text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, entity_id);
create index if not exists audit_logs_user_idx on public.audit_logs (user_id);

create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
