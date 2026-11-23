-- Allow management (reception) to manage institute settings and add management branding keys.

drop policy if exists settings_management_write on public.settings;
create policy settings_management_write on public.settings
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

insert into public.settings(key, value, description)
values
  ('management_name', '"Management"', 'Management panel display name'),
  ('management_logo_url', '""', 'Management panel logo URL'),
  ('institute_start_id', '3306', 'Starting numeric ID for new students')
on conflict (key) do nothing;
