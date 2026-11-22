-- =============================================================================
-- 001 — Extensions and enum types
-- Sir Sahil's English Language Centre — management platform
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Enums are created defensively so the migration can be re-run on a fresh
-- database as well as on a database where an earlier version already exists.
do $$ begin
  create type public.user_role as enum ('owner', 'reception', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.student_status as enum ('active', 'frozen', 'left', 'completed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.class_type as enum ('weekday', 'weekend');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.batch_status as enum ('active', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_type as enum ('conversation', 'grammar');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present', 'absent', 'late', 'leave');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marked_via as enum ('scanner', 'manual_code', 'search', 'camera', 'manual_edit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fee_status as enum ('pending', 'partial', 'paid', 'waived', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bank_transfer', 'jazzcash', 'easypaisa', 'card', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.submission_status as enum ('pending', 'submitted', 'reviewed', 'needs_rework');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.certificate_status as enum ('pending', 'approved', 'issued');
exception when duplicate_object then null; end $$;
