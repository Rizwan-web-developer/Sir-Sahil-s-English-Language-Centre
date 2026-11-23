-- =============================================================================
-- 015 - Single student ID (starts at 1) + CNIC login
-- =============================================================================

-- Renumber student_number to 1..N in creation order.
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.students
)
update public.students s
set student_number = ordered.rn
from ordered
where s.id = ordered.id;

select setval(
  'public.student_number_seq',
  greatest(1, coalesce((select max(student_number) from public.students), 0) + 1),
  false
);

-- CNIC/B-Form should be unique when provided.
create unique index if not exists students_cnic_unique_idx
  on public.students (lower(trim(cnic_or_bform)))
  where cnic_or_bform is not null and trim(cnic_or_bform) <> '';

-- Allow login by CNIC or numeric student ID (in addition to legacy code/phone).
create or replace function public.resolve_login_email(identifier text)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_raw text := trim(coalesce(identifier, ''));
  v_phone text := regexp_replace(coalesce(identifier, ''), '\D', '', 'g');
  v_email text;
begin
  if length(v_raw) < 3 then
    return null;
  end if;

  select u.email
  into v_email
  from public.students s
  join public.profiles p on p.id = s.profile_id
  join auth.users u on u.id = p.id
  where s.is_archived = false
    and p.is_active = true
    and p.role = 'student'
    and (
      upper(s.student_code) = upper(v_raw)
      or (v_raw ~ '^\d+$' and s.student_number = v_raw::bigint)
      or (s.cnic_or_bform is not null and trim(s.cnic_or_bform) <> '' and lower(trim(s.cnic_or_bform)) = lower(v_raw))
      or (
        length(v_phone) >= 10
        and (
          regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = v_phone
          or regexp_replace(coalesce(s.whatsapp, ''), '\D', '', 'g') = v_phone
        )
      )
    )
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
