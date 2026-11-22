-- =============================================================================
-- 005 — Storage buckets
-- Files (photos, videos, certificate PDFs) live in Supabase Storage in Phase 1
-- and move to Cloudflare R2 (presigned URLs) in later phases. Videos are never
-- stored in Postgres — only object keys are.
--
-- Convention: object keys start with the student id, e.g.
--   assignment-videos/<student_id>/<assignment_id>.mp4
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-photos', 'student-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('assignment-videos', 'assignment-videos', false, 209715200, array['video/mp4', 'video/webm', 'video/quicktime']),
  ('certificates', 'certificates', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Owner has full control over every bucket.
drop policy if exists selc_storage_owner_all on storage.objects;
create policy selc_storage_owner_all on storage.objects
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Staff may manage student photos (admissions).
drop policy if exists selc_storage_staff_photos on storage.objects;
create policy selc_storage_staff_photos on storage.objects
  for all to authenticated
  using (bucket_id = 'student-photos' and public.is_staff())
  with check (bucket_id = 'student-photos' and public.is_staff());

-- Students work inside their own folder only.
drop policy if exists selc_storage_student_read on storage.objects;
create policy selc_storage_student_read on storage.objects
  for select to authenticated
  using (
    bucket_id in ('assignment-videos', 'certificates')
    and (storage.foldername(name))[1] = public.current_student_id()::text
  );

drop policy if exists selc_storage_student_upload on storage.objects;
create policy selc_storage_student_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'assignment-videos'
    and (storage.foldername(name))[1] = public.current_student_id()::text
  );

drop policy if exists selc_storage_student_update on storage.objects;
create policy selc_storage_student_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'assignment-videos'
    and (storage.foldername(name))[1] = public.current_student_id()::text
  )
  with check (
    bucket_id = 'assignment-videos'
    and (storage.foldername(name))[1] = public.current_student_id()::text
  );
