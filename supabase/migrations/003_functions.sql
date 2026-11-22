-- =============================================================================
-- 003 — Functions, triggers and integrity rules
-- =============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'students', 'batches', 'batch_schedule', 'batch_students',
    'fee_records', 'payments', 'attendance', 'levels', 'modules', 'topics',
    'topic_assignments', 'batch_progress', 'submissions', 'rankings',
    'certificates', 'settings'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role helpers — SECURITY DEFINER so they can be used inside RLS policies
-- without recursively triggering RLS on profiles / students.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, auth
as $$
  select role from public.profiles
  where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_role() = 'owner', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(public.current_user_role() in ('owner', 'reception'), false);
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select s.id
  from public.students s
  where s.profile_id = auth.uid() and s.is_archived = false
  order by s.created_at
  limit 1;
$$;

create or replace function public.is_enrolled_in_batch(p_batch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.batch_students bs
    join public.students s on s.id = bs.student_id
    where bs.batch_id = p_batch_id
      and bs.active = true
      and s.profile_id = auth.uid()
      and s.is_archived = false
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile bootstrap when an auth user is created.
-- Role is read from raw_app_meta_data (writable only by the service role), so
-- a public sign-up cannot claim the owner role through user metadata.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := case
    when new.raw_app_meta_data ->> 'role' in ('owner', 'reception', 'student')
      then (new.raw_app_meta_data ->> 'role')::public.user_role
    else 'student'::public.user_role
  end;

  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    v_role,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard rails on profiles: only the owner (or a service-role/server job) may
-- change a role or reactivate/deactivate an account.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor public.user_role := public.current_user_role();
  v_is_privileged boolean :=
    auth.uid() is null
    or coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or v_actor = 'owner';
begin
  if new.role <> old.role and not v_is_privileged then
    raise exception 'Only the owner can change a user role';
  end if;

  if new.is_active <> old.is_active and not v_is_privileged then
    raise exception 'Only the owner can activate or deactivate an account';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------------
-- Students are soft-deleted. Hard deletes are refused for application users.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_student_delete()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is not null
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Students cannot be deleted. Archive the record instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_student_delete on public.students;
create trigger prevent_student_delete
  before delete on public.students
  for each row execute function public.prevent_student_delete();

-- ---------------------------------------------------------------------------
-- Curriculum consistency: child rows always inherit session_type.
-- ---------------------------------------------------------------------------
create or replace function public.sync_curriculum_session_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.session_type;
begin
  if tg_table_name = 'modules' then
    select session_type into v_type from public.levels where id = new.level_id;
  elsif tg_table_name = 'topics' then
    select session_type into v_type from public.modules where id = new.module_id;
  elsif tg_table_name = 'topic_assignments' then
    select session_type into v_type from public.topics where id = new.topic_id;
  end if;

  if v_type is null then
    raise exception 'Parent curriculum record does not exist';
  end if;

  new.session_type := v_type;
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array['modules', 'topics', 'topic_assignments'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists sync_session_type on public.%I', t);
    execute format(
      'create trigger sync_session_type before insert or update on public.%I
       for each row execute function public.sync_curriculum_session_type()', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Progress must belong to the same session tree as the topic.
-- ---------------------------------------------------------------------------
create or replace function public.validate_batch_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.session_type;
begin
  select session_type into v_type from public.topics where id = new.topic_id;

  if v_type is null then
    raise exception 'Topic does not exist';
  end if;

  if v_type <> new.session_type then
    raise exception 'Session type (%) does not match the topic curriculum (%)',
      new.session_type, v_type;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_batch_progress on public.batch_progress;
create trigger validate_batch_progress
  before insert or update on public.batch_progress
  for each row execute function public.validate_batch_progress();

-- ---------------------------------------------------------------------------
-- Attendance is only accepted for students enrolled in the batch on that date.
-- ---------------------------------------------------------------------------
create or replace function public.validate_attendance_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.batch_students bs
    where bs.batch_id = new.batch_id
      and bs.student_id = new.student_id
      and bs.joined_on <= new.date
      and (bs.left_on is null or bs.left_on >= new.date)
  ) then
    raise exception 'Student is not enrolled in this batch on %', new.date;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_attendance_enrollment on public.attendance;
create trigger validate_attendance_enrollment
  before insert or update of student_id, batch_id, date on public.attendance
  for each row execute function public.validate_attendance_enrollment();

-- ---------------------------------------------------------------------------
-- Audit trail for important mutations. Runs as definer so the write is never
-- blocked by RLS; audit_logs itself is readable by the owner only.
-- ---------------------------------------------------------------------------
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_entity_id text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    v_old := to_jsonb(old);
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    v_new := to_jsonb(new);
  end if;

  v_entity_id := coalesce(
    v_new ->> 'id',
    v_old ->> 'id',
    v_new ->> 'key',
    v_old ->> 'key'
  );

  insert into public.audit_logs (user_id, action, entity, entity_id, old_data, new_data)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id, v_old, v_new);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'students', 'fee_records', 'payments', 'attendance',
    'batch_progress', 'submissions', 'rankings', 'certificates',
    'batch_students', 'batches', 'batch_schedule', 'settings'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists audit_row on public.%I', t);
    execute format(
      'create trigger audit_row after insert or update or delete on public.%I
       for each row execute function public.audit_row()', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Student login resolution: student code or phone -> generated auth email.
--
-- Exposed to the anon role so the login form can map an identifier before
-- calling signInWithPassword. The function only returns an email for active
-- student accounts; the password check still happens in Supabase Auth.
-- ---------------------------------------------------------------------------
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
