-- Separate Teacher panel and Admin Management panel defaults.

alter table public.profiles
  add column if not exists default_panel text not null default 'management'
  check (default_panel in ('teacher', 'management'));

comment on column public.profiles.default_panel is
  'Default staff panel after login: teacher -> /owner, management -> /admin.';

-- Known teacher account defaults to teacher panel.
update public.profiles p
set default_panel = 'teacher'
from auth.users u
where p.id = u.id and lower(u.email) = 'teacher@gmail.com';
