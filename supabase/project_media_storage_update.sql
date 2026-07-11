-- Run once in the Supabase SQL Editor.
-- Creates public project image storage and the owner-only upload policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-media',
  'project-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.project_images enable row level security;

drop policy if exists "Project media is publicly viewable" on storage.objects;
create policy "Project media is publicly viewable"
on storage.objects for select
using (bucket_id = 'project-media');

drop policy if exists "Users upload project media to own folder" on storage.objects;
create policy "Users upload project media to own folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own project media" on storage.objects;
create policy "Users update own project media"
on storage.objects for update
to authenticated
using (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own project media" on storage.objects;
create policy "Users delete own project media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Project images are public" on public.project_images;
create policy "Project images are public"
on public.project_images for select
using (true);

drop policy if exists "Owners create project images" on public.project_images;
create policy "Owners create project images"
on public.project_images for insert
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Owners update project images" on public.project_images;
create policy "Owners update project images"
on public.project_images for update
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Owners delete project images" on public.project_images;
create policy "Owners delete project images"
on public.project_images for delete
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);
