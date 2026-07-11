-- Iconic Nexus public launch update
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists accepted_terms_at timestamptz;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-media','profile-media',true,3145728,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true,file_size_limit=3145728,allowed_mime_types=array['image/png','image/jpeg','image/webp'];

drop policy if exists "Profile media is public" on storage.objects;
create policy "Profile media is public" on storage.objects for select using (bucket_id='profile-media');
drop policy if exists "Users upload own profile media" on storage.objects;
create policy "Users upload own profile media" on storage.objects for insert to authenticated with check (bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users update own profile media" on storage.objects;
create policy "Users update own profile media" on storage.objects for update to authenticated using (bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Users delete own profile media" on storage.objects;
create policy "Users delete own profile media" on storage.objects for delete to authenticated using (bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users view own reports" on public.reports;
create policy "Users view own reports" on public.reports for select using (reporter_id=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));
drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports" on public.reports for update using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));

-- Set your own account as admin by replacing the email below and running once:
update public.profiles set is_admin=true where id=(select id from auth.users where email='mpdiablo16@gmail.com');
