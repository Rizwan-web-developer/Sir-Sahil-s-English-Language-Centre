-- =============================================================================
-- 016 - Course selection for batches, seeded levels, and curriculum access
--
-- * Batches can be linked to a course (a row in `levels`).
-- * Seed the five standard English courses.
-- * Management (reception) can maintain the curriculum tree (levels, modules,
--   topics, assignments). Course *progress*, marks and rankings stay owner-only
--   through the existing batch_progress / submissions policies.
-- =============================================================================

-- --- Batch -> course link ----------------------------------------------------
alter table public.batches
  add column if not exists course_level_id uuid references public.levels (id) on delete set null;

create index if not exists batches_course_level_idx
  on public.batches (course_level_id);

-- --- Standard courses --------------------------------------------------------
insert into public.levels (name, session_type, sort_order, description)
select v.name, 'grammar'::public.session_type, v.sort_order, v.description
from (values
  ('Beginner',         1, 'First steps: alphabet, greetings and basic sentences.'),
  ('Pre-Intermediate', 2, 'Everyday conversation with core grammar patterns.'),
  ('Intermediate',     3, 'Fluent discussion, tenses and paragraph writing.'),
  ('Advanced',         4, 'Complex structures, idioms and formal writing.'),
  ('Proficiency',      5, 'Near-native accuracy, debate and professional English.')
) as v(name, sort_order, description)
where not exists (
  select 1 from public.levels l
  where l.name = v.name and l.session_type = 'grammar'
);

-- --- Curriculum structure is maintained by both staff roles ------------------
do $$
declare
  t text;
  tables text[] := array['levels', 'modules', 'topics', 'topic_assignments'];
begin
  foreach t in array tables loop
    -- Replace the owner-only policies created in 004.
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_write', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
       using (public.is_staff() or public.current_user_role() = ''student'')',
      t || '_select', t
    );

    execute format(
      'create policy %I on public.%I for all to authenticated
       using (public.is_staff()) with check (public.is_staff())',
      t || '_staff_write', t
    );
  end loop;
end;
$$;
