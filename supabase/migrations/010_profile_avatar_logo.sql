-- Profile avatar and platform logo support

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists selc_storage_avatars_public_read on storage.objects;
create policy selc_storage_avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists selc_storage_avatars_owner_insert on storage.objects;
create policy selc_storage_avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists selc_storage_avatars_owner_update on storage.objects;
create policy selc_storage_avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text))
  with check (bucket_id = 'avatars' and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists selc_storage_avatars_owner_delete on storage.objects;
create policy selc_storage_avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (public.is_owner() or (storage.foldername(name))[1] = auth.uid()::text));
