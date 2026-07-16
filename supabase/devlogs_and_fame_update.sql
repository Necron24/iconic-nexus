-- Iconic Nexus devlogs, activity ranking and expanded Wall of Fame.
-- Run after discovery_and_wall_of_fame_update.sql.

begin;

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  body text not null check (char_length(trim(body)) between 10 and 10000),
  version_label text check (version_label is null or char_length(version_label) <= 40),
  update_type text not null default 'development' check (
    update_type in ('development','release','bug_fixes','testing_needed','major_update','announcement')
  ),
  image_url text,
  release_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_updates_project_created_idx
  on public.project_updates(project_id, is_published, created_at desc);
create index if not exists project_updates_author_idx
  on public.project_updates(author_id, created_at desc);

alter table public.project_updates enable row level security;

drop policy if exists "Published updates are public" on public.project_updates;
create policy "Published updates are public"
on public.project_updates for select
using (
  is_published = true
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.is_published = true
      and p.moderation_status = 'visible'
  )
  or auth.uid() = author_id
  or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin = true)
);

drop policy if exists "Owners create project updates" on public.project_updates;
create policy "Owners create project updates"
on public.project_updates for insert
with check (
  auth.uid() = author_id
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Owners update project updates" on public.project_updates;
create policy "Owners update project updates"
on public.project_updates for update
using (
  auth.uid() = author_id
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
)
with check (
  auth.uid() = author_id
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

drop policy if exists "Owners delete project updates" on public.project_updates;
create policy "Owners delete project updates"
on public.project_updates for delete
using (
  auth.uid() = author_id
  and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create or replace function public.project_update_touch_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.is_published then
    update public.projects
    set last_activity_at = now()
    where id = new.project_id;
  end if;
  return new;
end;
$$;

create or replace function public.project_update_recalculate_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set last_activity_at = coalesce(
    (select max(created_at) from public.project_updates where project_id = old.project_id and is_published = true),
    updated_at,
    created_at
  )
  where id = old.project_id;
  return old;
end;
$$;

drop trigger if exists project_updates_touch_activity on public.project_updates;
create trigger project_updates_touch_activity
before insert or update on public.project_updates
for each row execute function public.project_update_touch_activity();

drop trigger if exists project_updates_recalculate_activity on public.project_updates;
create trigger project_updates_recalculate_activity
after delete on public.project_updates
for each row execute function public.project_update_recalculate_activity();

create or replace function public.wall_of_fame_v2(p_limit integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
approved as (
  select cm.id, cm.tester_id, cm.approved_at, c.project_id, fr.overall_rating, fr.developer_helpful
  from public.campaign_members cm
  join public.testing_campaigns c on c.id = cm.campaign_id
  left join public.feedback_reports fr on fr.campaign_member_id = cm.id
  where cm.status = 'approved'
),
tester_stats as (
  select
    pr.id, pr.username, pr.display_name, pr.avatar_url, pr.tester_reputation, pr.created_at,
    count(a.id)::integer approved_tests,
    count(a.id) filter (where a.approved_at >= date_trunc('month', now()))::integer monthly_tests,
    count(a.id) filter (where a.developer_helpful = true)::integer helpful_feedback,
    round(100.0 * count(a.id) / nullif((select count(*) from public.campaign_members cm2 where cm2.tester_id = pr.id and cm2.status in ('approved','rejected')),0),1) approval_rate
  from public.profiles pr
  left join approved a on a.tester_id = pr.id
  where coalesce(pr.account_status,'active') = 'active'
  group by pr.id
),
developer_stats as (
  select
    pr.id, pr.username, pr.display_name, pr.avatar_url, pr.created_at,
    count(distinct p.id)::integer published_projects,
    count(distinct a.id)::integer approved_tests_received,
    count(distinct a.id) filter (where a.approved_at >= date_trunc('month', now()))::integer monthly_tests_received,
    round(avg(a.overall_rating),2) average_rating,
    count(distinct pu.id)::integer devlog_count
  from public.profiles pr
  join public.projects p on p.owner_id = pr.id and p.is_published = true and p.moderation_status = 'visible'
  left join approved a on a.project_id = p.id
  left join public.project_updates pu on pu.project_id = p.id and pu.is_published = true
  where coalesce(pr.account_status,'active') = 'active'
  group by pr.id
),
project_stats as (
  select
    p.id, p.slug, p.name, p.icon_url, p.platform, p.last_activity_at,
    count(distinct a.id)::integer approved_tests,
    count(distinct a.id) filter (where a.approved_at >= date_trunc('month', now()))::integer monthly_tests,
    round(avg(a.overall_rating),2) average_rating,
    count(distinct pu.id)::integer devlog_count,
    count(distinct pu.id) filter (where pu.created_at >= date_trunc('month', now()))::integer monthly_devlogs
  from public.projects p
  left join approved a on a.project_id = p.id
  left join public.project_updates pu on pu.project_id = p.id and pu.is_published = true
  where p.is_published = true and p.moderation_status = 'visible'
  group by p.id
),
community as (
  select
    ts.id, ts.username, ts.display_name, ts.avatar_url,
    ts.approved_tests, coalesce(ds.published_projects,0) published_projects,
    ts.helpful_feedback,
    (ts.approved_tests * 5 + ts.helpful_feedback * 3 + coalesce(ds.published_projects,0) * 8 + coalesce(ds.devlog_count,0) * 2)::integer community_score
  from tester_stats ts
  join developer_stats ds on ds.id = ts.id
  where ts.approved_tests >= 3 and ds.published_projects >= 1
)
select jsonb_build_object(
  'testers', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by approved_tests desc, helpful_feedback desc, tester_reputation desc) rank,
      id,username,display_name,avatar_url,tester_reputation,approved_tests,helpful_feedback,approval_rate,
      case when approved_tests >= 25 and tester_reputation >= 4 then 'Trusted Tester'
           when approved_tests >= 10 then 'Top Tester' else 'Rising Tester' end badge
    from tester_stats where approved_tests >= 3
    order by approved_tests desc, helpful_feedback desc, tester_reputation desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb),
  'developers', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by approved_tests_received desc, average_rating desc nulls last, published_projects desc) rank,
      id,username,display_name,avatar_url,published_projects,approved_tests_received,average_rating,devlog_count,
      case when approved_tests_received >= 25 and coalesce(average_rating,0) >= 4 then 'Featured Developer'
           else 'Active Developer' end badge
    from developer_stats where approved_tests_received >= 3
    order by approved_tests_received desc, average_rating desc nulls last, published_projects desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb),
  'projects', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by approved_tests desc, average_rating desc nulls last, last_activity_at desc) rank,
      id,slug,name,icon_url,platform,approved_tests,average_rating,devlog_count,
      case when approved_tests >= 20 and coalesce(average_rating,0) >= 4 then 'Hall of Fame Project'
           else 'Top Project' end badge
    from project_stats where approved_tests >= 3 and average_rating is not null
    order by approved_tests desc, average_rating desc nulls last, last_activity_at desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb),
  'monthly_projects', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by monthly_tests desc, average_rating desc nulls last, monthly_devlogs desc) rank,
      id,slug,name,icon_url,platform,monthly_tests,average_rating,monthly_devlogs,
      case when row_number() over(order by monthly_tests desc, average_rating desc nulls last, monthly_devlogs desc)=1 then 'Project of the Month' else 'Trending Project' end badge
    from project_stats where monthly_tests > 0 or monthly_devlogs > 0
    order by monthly_tests desc, average_rating desc nulls last, monthly_devlogs desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb),
  'monthly_testers', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by monthly_tests desc, helpful_feedback desc, tester_reputation desc) rank,
      id,username,display_name,avatar_url,monthly_tests,helpful_feedback,tester_reputation,
      case when row_number() over(order by monthly_tests desc, helpful_feedback desc, tester_reputation desc)=1 then 'Tester of the Month' else 'Monthly Leader' end badge
    from tester_stats where monthly_tests > 0
    order by monthly_tests desc, helpful_feedback desc, tester_reputation desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb),
  'community_champions', coalesce((select jsonb_agg(to_jsonb(x) order by x.rank) from (
    select row_number() over(order by community_score desc, approved_tests desc) rank,
      id,username,display_name,avatar_url,approved_tests,published_projects,helpful_feedback,community_score,'Community Champion'::text badge
    from community
    order by community_score desc, approved_tests desc
    limit greatest(1,least(coalesce(p_limit,10),25))
  ) x),'[]'::jsonb)
);
$$;

revoke all on function public.wall_of_fame_v2(integer) from public;
grant execute on function public.wall_of_fame_v2(integer) to anon, authenticated;

commit;
