begin;
create table if not exists public.site_reviews (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  topic text not null check (topic in ('overall','design','testing','community','payments','other')),
  review text not null check (char_length(review) between 10 and 1200),
  public_consent boolean not null default false,
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.site_reviews enable row level security;
drop policy if exists "Users read own or approved reviews" on public.site_reviews;
create policy "Users read own or approved reviews" on public.site_reviews for select using (profile_id=auth.uid() or (moderation_status='approved' and public_consent=true));
drop policy if exists "Users create own review" on public.site_reviews;
create policy "Users create own review" on public.site_reviews for insert to authenticated with check (profile_id=auth.uid() and moderation_status='pending');
drop policy if exists "Users update own review" on public.site_reviews;
create policy "Users update own review" on public.site_reviews for update to authenticated using (profile_id=auth.uid()) with check (profile_id=auth.uid() and moderation_status='pending');
grant select on public.site_reviews to anon,authenticated;
grant insert,update on public.site_reviews to authenticated;
commit;
