begin;

create table if not exists public.project_reactions (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('excited','interested','test','innovative','love')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index if not exists project_reactions_project_idx on public.project_reactions(project_id, reaction);
alter table public.project_reactions enable row level security;
drop policy if exists "Anyone reads project reactions" on public.project_reactions;
create policy "Anyone reads project reactions" on public.project_reactions for select using (true);
drop policy if exists "Users add own project reactions" on public.project_reactions;
create policy "Users add own project reactions" on public.project_reactions for insert to authenticated with check (profile_id = auth.uid());
drop policy if exists "Users update own project reactions" on public.project_reactions;
create policy "Users update own project reactions" on public.project_reactions for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists "Users remove own project reactions" on public.project_reactions;
create policy "Users remove own project reactions" on public.project_reactions for delete to authenticated using (profile_id = auth.uid());
grant select on public.project_reactions to anon, authenticated;
grant insert, update, delete on public.project_reactions to authenticated;

commit;
