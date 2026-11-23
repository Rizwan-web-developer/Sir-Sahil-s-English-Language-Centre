-- =============================================================================
-- 013 - Numeric student IDs + management branding uploads
--
-- Every student gets a short numeric ID (3306, 3307, ...) that is printed on
-- the ID card as a QR code and used for manual / scanner attendance.
-- =============================================================================

create sequence if not exists public.student_number_seq as bigint
  start with 3306
  increment by 1;

alter table public.students
  add column if not exists student_number bigint;

-- Backfill existing students in admission order, starting from 3306.
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.students
  where student_number is null
)
update public.students s
set student_number = 3305 + ordered.rn
from ordered
where s.id = ordered.id;

-- Continue the sequence after the highest number already used.
select setval(
  'public.student_number_seq',
  greatest(
    3306,
    coalesce((select max(student_number) from public.students), 3305) + 1
  ),
  false
);

alter table public.students
  alter column student_number set default nextval('public.student_number_seq');
alter table public.students
  alter column student_number set not null;

create unique index if not exists students_student_number_key
  on public.students (student_number);

grant usage, select on sequence public.student_number_seq to authenticated;

-- -----------------------------------------------------------------------------
-- Branding: management (reception) may upload logos into the public avatars
-- bucket under branding/. Previously only the owner could write there.
-- -----------------------------------------------------------------------------
drop policy if exists selc_storage_avatars_staff_branding on storage.objects;
create policy selc_storage_avatars_staff_branding on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and public.is_staff())
  with check (bucket_id = 'avatars' and public.is_staff());
