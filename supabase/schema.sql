create extension if not exists "pgcrypto";

create type public.user_role as enum ('tester', 'developer', 'both');
create type public.project_type as enum ('app', 'game');
create type public.project_stage as enum ('prototype', 'alpha', 'beta', 'released');
create type public.campaign_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');
create type public.member_status as enum ('joined', 'in_progress', 'submitted', 'approved', 'rejected');
create type public.feedback_severity as enum ('none', 'minor', 'major', 'critical');
create type public.credit_transaction_type as enum ('welcome', 'test_reward', 'helpful_bonus', 'bug_bonus', 'campaign_cost', 'refund', 'admin_adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 30),
  display_name text,
  avatar_url text,
  bio text,
  country text,
  role public.user_role not null default 'both',
  tester_reputation numeric(3,2) not null default 0,
  credits integer not null default 50 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  type public.project_type not null,
  stage public.project_stage not null default 'prototype',
  platform text not null,
  genre text,
  short_description text not null,
  description text,
  icon_url text,
  cover_url text,
  testing_url text,
  known_issues text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.testing_campaigns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  instructions text not null,
  minimum_minutes integer not null default 10 check (minimum_minutes > 0),
  tester_goal integer not null check (tester_goal > 0),
  reward_credits integer not null check (reward_credits >= 0),
  duration_days integer not null default 14 check (duration_days > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.testing_campaigns(id) on delete cascade,
  tester_id uuid not null references public.profiles(id) on delete cascade,
  status public.member_status not null default 'joined',
  joined_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  unique(campaign_id, tester_id)
);

create table public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  campaign_member_id uuid not null references public.campaign_members(id) on delete cascade,
  minutes_tested integer not null default 0 check (minutes_tested >= 0),
  device_name text,
  os_version text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_member_id uuid unique not null references public.campaign_members(id) on delete cascade,
  installation_success boolean,
  crash_found boolean not null default false,
  severity public.feedback_severity not null default 'none',
  what_worked text not null,
  what_was_confusing text not null,
  bug_details text,
  performance_rating integer check (performance_rating between 1 and 5),
  stability_rating integer check (stability_rating between 1 and 5),
  usability_rating integer check (usability_rating between 1 and 5),
  overall_rating integer check (overall_rating between 1 and 5),
  developer_helpful boolean,
  created_at timestamptz not null default now()
);

create table public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_report_id uuid not null references public.feedback_reports(id) on delete cascade,
  file_url text not null,
  file_type text,
  created_at timestamptz not null default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  transaction_type public.credit_transaction_type not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 2000),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, country, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'country',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'both'::public.user_role)
  );

  insert into public.credit_transactions (profile_id, amount, transaction_type, note)
  values (new.id, 50, 'welcome', 'Welcome credits');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.testing_campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.test_sessions enable row level security;
alter table public.feedback_reports enable row level security;
alter table public.feedback_attachments enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

create policy "Profiles are viewable by everyone"
on public.profiles for select using (true);

create policy "Users update own profile"
on public.profiles for update using (auth.uid() = id);

create policy "Published projects are public"
on public.projects for select using (is_published = true or auth.uid() = owner_id);

create policy "Owners create projects"
on public.projects for insert with check (auth.uid() = owner_id);

create policy "Owners update projects"
on public.projects for update using (auth.uid() = owner_id);

create policy "Owners delete projects"
on public.projects for delete using (auth.uid() = owner_id);

create policy "Project images public"
on public.project_images for select using (true);

create policy "Campaigns public when project is visible"
on public.testing_campaigns for select using (true);

create policy "Authenticated users can join campaigns"
on public.campaign_members for insert
with check (auth.uid() = tester_id);

create policy "Members view own campaign memberships"
on public.campaign_members for select
using (
  auth.uid() = tester_id or
  exists (
    select 1
    from public.testing_campaigns c
    join public.projects p on p.id = c.project_id
    where c.id = campaign_id and p.owner_id = auth.uid()
  )
);

create policy "Users view own credit transactions"
on public.credit_transactions for select
using (auth.uid() = profile_id);

create policy "Comments are public"
on public.comments for select using (true);

create policy "Authenticated users create comments"
on public.comments for insert
with check (auth.uid() = author_id);

create policy "Users create reports"
on public.reports for insert
with check (auth.uid() = reporter_id);
