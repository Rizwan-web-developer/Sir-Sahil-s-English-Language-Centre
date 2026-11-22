-- =============================================================================
-- 004 — Row Level Security
--
-- Access model
--   owner     : full access everywhere
--   reception : students, batches, fees, attendance, settings (read)
--               NO course progress, marks, rankings, certificates
--   student   : read own rows; insert/update own submission while unreviewed
--
-- Every policy is permissive and additive; write policies never exist for
-- students on staff-owned tables.
-- =============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'students', 'batches', 'batch_schedule', 'batch_students',
    'fee_records', 'payments', 'attendance', 'levels', 'modules', 'topics',
    'topic_assignments', 'batch_progress', 'submissions', 'rankings',
    'certificates', 'audit_logs', 'settings'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Baseline table privileges. RLS is the authority; anon gets only the login
-- helper function, no table access.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_self_or_staff on public.profiles;
create policy profiles_select_self_or_staff on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated
  using (public.is_staff() or profile_id = (select auth.uid()));

drop policy if exists students_staff_insert on public.students;
create policy students_staff_insert on public.students
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- No DELETE policy: soft delete only (also blocked by trigger).

-- ---------------------------------------------------------------------------
-- batches / timetable
-- ---------------------------------------------------------------------------
drop policy if exists batches_select on public.batches;
create policy batches_select on public.batches
  for select to authenticated
  using (public.is_staff() or public.is_enrolled_in_batch(id));

drop policy if exists batches_staff_write on public.batches;
create policy batches_staff_write on public.batches
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists batch_schedule_select on public.batch_schedule;
create policy batch_schedule_select on public.batch_schedule
  for select to authenticated
  using (public.is_staff() or public.is_enrolled_in_batch(batch_id));

drop policy if exists batch_schedule_staff_write on public.batch_schedule;
create policy batch_schedule_staff_write on public.batch_schedule
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists batch_students_select on public.batch_students;
create policy batch_students_select on public.batch_students
  for select to authenticated
  using (public.is_staff() or student_id = public.current_student_id());

drop policy if exists batch_students_staff_write on public.batch_students;
create policy batch_students_staff_write on public.batch_students
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- fees
-- ---------------------------------------------------------------------------
drop policy if exists fee_records_select on public.fee_records;
create policy fee_records_select on public.fee_records
  for select to authenticated
  using (public.is_staff() or student_id = public.current_student_id());

drop policy if exists fee_records_staff_write on public.fee_records;
create policy fee_records_staff_write on public.fee_records
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (public.is_staff() or student_id = public.current_student_id());

drop policy if exists payments_staff_write on public.payments;
create policy payments_staff_write on public.payments
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  for select to authenticated
  using (public.is_staff() or student_id = public.current_student_id());

drop policy if exists attendance_staff_write on public.attendance;
create policy attendance_staff_write on public.attendance
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- curriculum content (reception deliberately has no access)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array['levels', 'modules', 'topics', 'topic_assignments'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
       using (public.is_owner() or public.current_user_role() = ''student'')',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_owner_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
       using (public.is_owner()) with check (public.is_owner())',
      t || '_owner_write', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- progress (owner + enrolled student; never reception)
-- ---------------------------------------------------------------------------
drop policy if exists batch_progress_select on public.batch_progress;
create policy batch_progress_select on public.batch_progress
  for select to authenticated
  using (public.is_owner() or public.is_enrolled_in_batch(batch_id));

drop policy if exists batch_progress_owner_write on public.batch_progress;
create policy batch_progress_owner_write on public.batch_progress
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- submissions
-- ---------------------------------------------------------------------------
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions
  for select to authenticated
  using (public.is_owner() or student_id = public.current_student_id());

drop policy if exists submissions_student_insert on public.submissions;
create policy submissions_student_insert on public.submissions
  for insert to authenticated
  with check (
    public.is_owner()
    or (
      student_id = public.current_student_id()
      and marks is null
      and status in ('submitted', 'pending')
    )
  );

drop policy if exists submissions_student_update on public.submissions;
create policy submissions_student_update on public.submissions
  for update to authenticated
  using (
    public.is_owner()
    or (student_id = public.current_student_id() and status <> 'reviewed')
  )
  with check (
    public.is_owner()
    or (
      student_id = public.current_student_id()
      and marks is null
      and status <> 'reviewed'
    )
  );

drop policy if exists submissions_owner_delete on public.submissions;
create policy submissions_owner_delete on public.submissions
  for delete to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- rankings
-- ---------------------------------------------------------------------------
drop policy if exists rankings_select on public.rankings;
create policy rankings_select on public.rankings
  for select to authenticated
  using (public.is_owner() or student_id = public.current_student_id());

drop policy if exists rankings_owner_write on public.rankings;
create policy rankings_owner_write on public.rankings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------------
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select to authenticated
  using (
    public.is_owner()
    or (
      student_id = public.current_student_id()
      and status in ('approved', 'issued')
    )
  );

drop policy if exists certificates_owner_write on public.certificates;
create policy certificates_owner_write on public.certificates
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- audit log — owner read only. Writes happen through definer triggers.
-- ---------------------------------------------------------------------------
drop policy if exists audit_logs_owner_select on public.audit_logs;
create policy audit_logs_owner_select on public.audit_logs
  for select to authenticated
  using (public.is_owner());

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
drop policy if exists settings_staff_select on public.settings;
create policy settings_staff_select on public.settings
  for select to authenticated
  using (public.is_staff());

drop policy if exists settings_owner_write on public.settings;
create policy settings_owner_write on public.settings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());
