-- =============================================================================
-- 006 — Seed/helpers (optional but safe)
-- Provides a service-role-only helper to keep the student code sequence in sync
-- after explicit-code seed inserts.
-- =============================================================================

create or replace function public.seed_set_student_code_seq(p_value bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow service_role (no end-user JWT) or postgres.
  if auth.uid() is not null then
    raise exception 'seed_set_student_code_seq is restricted to service role';
  end if;
  perform setval('public.student_code_seq', greatest(p_value, 1), true);
end;
$$;

revoke all on function public.seed_set_student_code_seq(bigint) from public;
grant execute on function public.seed_set_student_code_seq(bigint) to service_role;
