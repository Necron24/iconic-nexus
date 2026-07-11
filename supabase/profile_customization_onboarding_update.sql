-- Iconic Nexus profile customization, creator pages and onboarding update
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists accent_color text not null default 'lime';
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists github_url text;
alter table public.profiles add column if not exists social_url text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles drop constraint if exists profiles_accent_color_check;
alter table public.profiles add constraint profiles_accent_color_check
check (accent_color in ('lime','cyan','violet','amber','rose','blue'));

alter table public.profiles drop constraint if exists profiles_headline_length_check;
alter table public.profiles add constraint profiles_headline_length_check
check (headline is null or char_length(headline) <= 120);

-- Existing users will see the introduction once after this update.
update public.profiles set onboarding_completed = false where onboarding_completed is null;

-- Allow profile banners up to 5 MB in the existing public profile-media bucket.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('profile-media','profile-media',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
