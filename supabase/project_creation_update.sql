-- Run this once in Supabase SQL Editor for Iconic Nexus project creation.

alter table public.project_images enable row level security;

 drop policy if exists "Owners create project images" on public.project_images;
create policy "Owners create project images"
on public.project_images for insert
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

 drop policy if exists "Owners update project images" on public.project_images;
create policy "Owners update project images"
on public.project_images for update
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);

 drop policy if exists "Owners delete project images" on public.project_images;
create policy "Owners delete project images"
on public.project_images for delete
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = auth.uid()
  )
);
