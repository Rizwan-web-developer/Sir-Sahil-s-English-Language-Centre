-- Phase 8 & 9 foundations

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_type text not null default 'all' check (target_type in ('all','batch')),
  batch_id uuid references public.batches(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists announcements_created_idx on public.announcements(created_at desc);
drop trigger if exists set_updated_at on public.announcements;
create trigger set_updated_at before update on public.announcements for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

create table if not exists public.profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  message text not null,
  status text not null default 'pending' check (status in ('pending','reviewed','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists set_updated_at on public.profile_change_requests;
create trigger set_updated_at before update on public.profile_change_requests for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.profile_change_requests enable row level security;

drop policy if exists announcements_staff_all on public.announcements;
create policy announcements_staff_all on public.announcements for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists announcements_student_read on public.announcements;
create policy announcements_student_read on public.announcements for select to authenticated
  using (
    public.current_user_role() = 'student' and (
      target_type = 'all' or exists (
        select 1 from public.batch_students bs
        where bs.batch_id = announcements.batch_id and bs.active = true and bs.student_id = public.current_student_id()
      )
    )
  );

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profile_change_requests_staff on public.profile_change_requests;
create policy profile_change_requests_staff on public.profile_change_requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists profile_change_requests_student on public.profile_change_requests;
create policy profile_change_requests_student on public.profile_change_requests for all to authenticated
  using (student_id = public.current_student_id()) with check (student_id = public.current_student_id());

insert into public.settings(key, value, description) values
  ('payment_jazzcash', '""', 'JazzCash account details'),
  ('payment_easypaisa', '""', 'Easypaisa account details'),
  ('payment_bank', '""', 'Bank transfer details'),
  ('monthly_income_target', '0', 'Monthly income target for owner dashboard')
on conflict (key) do nothing;
