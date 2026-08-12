begin;

create table if not exists public.project_bookmarks (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index if not exists project_bookmarks_profile_idx
  on public.project_bookmarks(profile_id, created_at desc);

alter table public.project_bookmarks enable row level security;

drop policy if exists "Users read own project bookmarks" on public.project_bookmarks;
create policy "Users read own project bookmarks"
on public.project_bookmarks for select to authenticated
using (profile_id = auth.uid());

drop policy if exists "Users add own project bookmarks" on public.project_bookmarks;
create policy "Users add own project bookmarks"
on public.project_bookmarks for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_bookmarks.project_id
      and p.is_published = true
      and p.moderation_status = 'visible'
      and p.archived_at is null
  )
);

drop policy if exists "Users delete own project bookmarks" on public.project_bookmarks;
create policy "Users delete own project bookmarks"
on public.project_bookmarks for delete to authenticated
using (profile_id = auth.uid());

grant select, insert, delete on public.project_bookmarks to authenticated;

commit;
