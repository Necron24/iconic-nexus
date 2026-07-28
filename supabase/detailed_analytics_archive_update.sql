-- Detailed creator analytics plus safe archive and deletion controls.
-- Run after creator_analytics_update.sql.

begin;

-- Reversible archive state. Public visibility is restored to its previous value.
alter table public.projects
  add column if not exists archived_at timestamptz,
  add column if not exists archive_was_published boolean;
alter table public.project_updates
  add column if not exists archived_at timestamptz,
  add column if not exists archive_was_published boolean;
alter table public.testing_campaigns
  add column if not exists archived_at timestamptz,
  add column if not exists archive_was_private boolean,
  add column if not exists archive_access_code text;

create index if not exists projects_owner_archive_idx
  on public.projects(owner_id, archived_at, created_at desc);
create index if not exists project_updates_project_archive_idx
  on public.project_updates(project_id, archived_at, created_at desc);
create index if not exists testing_campaigns_project_archive_idx
  on public.testing_campaigns(project_id, archived_at, created_at desc);

create or replace function public.set_owned_content_archived(
  p_content_type text,
  p_content_id uuid,
  p_archive boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;
  if p_content_type not in ('project','devlog','campaign') then raise exception 'Invalid content type.'; end if;

  if p_content_type = 'project' then
    if p_archive then
      update public.projects
      set archive_was_published = case when archived_at is null then is_published else archive_was_published end,
          archived_at = coalesce(archived_at, now()),
          is_published = false,
          updated_at = now()
      where id = p_content_id and owner_id = v_user_id;
    else
      update public.projects
      set is_published = coalesce(archive_was_published, false),
          archived_at = null,
          archive_was_published = null,
          updated_at = now()
      where id = p_content_id and owner_id = v_user_id;
    end if;
  elsif p_content_type = 'devlog' then
    if p_archive then
      update public.project_updates u
      set archive_was_published = case when u.archived_at is null then u.is_published else u.archive_was_published end,
          archived_at = coalesce(u.archived_at, now()),
          is_published = false,
          updated_at = now()
      from public.projects p
      where u.id = p_content_id and p.id = u.project_id and p.owner_id = v_user_id;
    else
      update public.project_updates u
      set is_published = coalesce(u.archive_was_published, false),
          archived_at = null,
          archive_was_published = null,
          updated_at = now()
      from public.projects p
      where u.id = p_content_id and p.id = u.project_id and p.owner_id = v_user_id;
    end if;
  else
    if p_archive then
      update public.testing_campaigns c
      set archive_was_private = case when c.archived_at is null then c.is_private else c.archive_was_private end,
          archive_access_code = case when c.archived_at is null then c.access_code else c.archive_access_code end,
          archived_at = coalesce(c.archived_at, now()),
          is_private = true,
          access_code = null
      from public.projects p
      where c.id = p_content_id and p.id = c.project_id and p.owner_id = v_user_id;
    else
      update public.testing_campaigns c
      set is_private = coalesce(c.archive_was_private, false),
          access_code = case when coalesce(c.archive_was_private,false) then c.archive_access_code else null end,
          archived_at = null,
          archive_was_private = null,
          archive_access_code = null
      from public.projects p
      where c.id = p_content_id and p.id = c.project_id and p.owner_id = v_user_id;
    end if;
  end if;

  if not found then raise exception 'Content not found or access denied.'; end if;
  return true;
end;
$$;

create or replace function public.delete_owned_content(
  p_content_type text,
  p_content_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_project_id uuid;
begin
  if v_user_id is null then raise exception 'Please log in.'; end if;
  if p_content_type not in ('project','devlog','campaign') then raise exception 'Invalid content type.'; end if;

  if p_content_type = 'project' then
    select id into v_project_id from public.projects where id = p_content_id and owner_id = v_user_id;
    if v_project_id is null then raise exception 'Project not found or access denied.'; end if;
    if exists (
      select 1 from public.testing_campaigns c
      left join public.campaign_members m on m.campaign_id = c.id
      where c.project_id = v_project_id
        and (m.id is not null or coalesce(c.reserved_credits,0) > 0 or coalesce(c.spent_credits,0) > 0)
    ) then
      raise exception 'This project has tester or credit history and cannot be permanently deleted. Archive it instead.';
    end if;
    delete from public.projects where id = v_project_id and owner_id = v_user_id;
  elsif p_content_type = 'campaign' then
    select c.project_id into v_project_id
    from public.testing_campaigns c
    join public.projects p on p.id = c.project_id
    where c.id = p_content_id and p.owner_id = v_user_id;
    if v_project_id is null then raise exception 'Campaign not found or access denied.'; end if;
    if exists (select 1 from public.campaign_members where campaign_id = p_content_id)
      or exists (
        select 1 from public.testing_campaigns
        where id = p_content_id and (coalesce(reserved_credits,0) > 0 or coalesce(spent_credits,0) > 0)
      ) then
      raise exception 'This campaign has tester or credit history and cannot be permanently deleted. Archive it instead.';
    end if;
    delete from public.testing_campaigns where id = p_content_id and project_id = v_project_id;
  else
    delete from public.project_updates u
    using public.projects p
    where u.id = p_content_id and p.id = u.project_id and p.owner_id = v_user_id;
    if not found then raise exception 'Devlog not found or access denied.'; end if;
  end if;

  return true;
end;
$$;

revoke all on function public.set_owned_content_archived(text,uuid,boolean) from public;
revoke all on function public.delete_owned_content(text,uuid) from public;
grant execute on function public.set_owned_content_archived(text,uuid,boolean) to authenticated;
grant execute on function public.delete_owned_content(text,uuid) to authenticated;

-- Profile pages are now first-class analytics targets.
alter table public.analytics_events alter column project_id drop not null;
alter table public.analytics_events drop constraint if exists analytics_events_target_type_check;
alter table public.analytics_events
  add constraint analytics_events_target_type_check
  check (target_type in ('project','devlog','campaign','profile'));

create or replace function public.track_analytics_event(
  p_event_type text,
  p_target_type text,
  p_target_id uuid,
  p_visitor_hash text default null,
  p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_owner_id uuid;
  v_profile_id uuid := auth.uid();
  v_hash text := lower(nullif(trim(coalesce(p_visitor_hash,'')),''));
  v_source text := left(nullif(trim(coalesce(p_source,'')),''),80);
begin
  if p_event_type not in ('impression','view','link_click','share','save','follow','reaction','comment','campaign_join') then
    raise exception 'Invalid analytics event.';
  end if;
  if p_target_type not in ('project','devlog','campaign','profile') then
    raise exception 'Invalid analytics target.';
  end if;

  if p_target_type = 'project' then
    select p.id,p.owner_id into v_project_id,v_owner_id
    from public.projects p
    where p.id=p_target_id and p.is_published=true and p.moderation_status='visible' and p.archived_at is null;
  elsif p_target_type = 'devlog' then
    select p.id,p.owner_id into v_project_id,v_owner_id
    from public.project_updates u join public.projects p on p.id=u.project_id
    where u.id=p_target_id and u.is_published=true and u.archived_at is null
      and p.is_published=true and p.moderation_status='visible' and p.archived_at is null;
  elsif p_target_type = 'campaign' then
    select p.id,p.owner_id into v_project_id,v_owner_id
    from public.testing_campaigns c join public.projects p on p.id=c.project_id
    where c.id=p_target_id and c.is_private=false and c.archived_at is null
      and p.is_published=true and p.moderation_status='visible' and p.archived_at is null;
  else
    select pr.id into v_owner_id
    from public.profiles pr
    where pr.id=p_target_id and coalesce(pr.account_status,'active')='active';
  end if;

  if v_owner_id is null then return false; end if;
  if v_profile_id is not null and v_profile_id=v_owner_id then return false; end if;
  if v_profile_id is null and (v_hash is null or v_hash !~ '^[0-9a-f]{64}$') then return false; end if;

  insert into public.analytics_events(event_type,target_type,target_id,project_id,profile_id,visitor_hash,source)
  values (
    p_event_type,p_target_type,p_target_id,v_project_id,v_profile_id,
    case when v_profile_id is null then v_hash else null end,v_source
  )
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.track_analytics_event(text,text,uuid,text,text) from public;
grant execute on function public.track_analytics_event(text,text,uuid,text,text) to anon, authenticated;

create or replace function public.get_creator_content_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
viewer_plan as (
  select coalesce((
    select ps.plan_code from public.profile_subscriptions ps
    where ps.profile_id=auth.uid() and ps.status='active'
      and (ps.current_period_end is null or ps.current_period_end>now())
    limit 1
  ),'free') plan_code
),
settings as (
  select greatest(1,least(coalesce(p_days,30),
    case when plan_code='studio' then 365 when plan_code='pro' then 90 else 30 end
  ))::integer days,auth.uid() owner_id from viewer_plan
),
owned_projects as (
  select p.id,p.slug,p.name,p.icon_url,p.archived_at
  from public.projects p,settings s where p.owner_id=s.owner_id
),
events as (
  select e.* from public.analytics_events e,settings s
  where e.event_day >= current_date-(s.days-1)
    and (e.project_id in (select id from owned_projects)
      or (e.target_type='profile' and e.target_id=s.owner_id))
),
daily as (
  select event_day,
    count(*) filter(where event_type='impression')::integer impressions,
    count(*) filter(where event_type='view')::integer views,
    count(*) filter(where event_type in ('reaction','comment','save','follow','share'))::integer engagements,
    count(*) filter(where event_type='campaign_join')::integer conversions
  from events group by event_day
),
series as (
  select d::date day,coalesce(x.impressions,0)::integer impressions,coalesce(x.views,0)::integer views,
    coalesce(x.engagements,0)::integer engagements,coalesce(x.conversions,0)::integer conversions
  from settings s cross join generate_series(current_date-(s.days-1),current_date,interval '1 day') d
  left join daily x on x.event_day=d::date
),
project_metrics as (
  select p.id,p.slug,p.name,p.icon_url,p.archived_at,
    count(e.id) filter(where e.event_type='impression')::integer impressions,
    count(e.id) filter(where e.event_type='view')::integer views,
    count(distinct coalesce('p:'||e.profile_id::text,'v:'||e.visitor_hash))::integer unique_visitors,
    count(e.id) filter(where e.event_type='link_click')::integer link_clicks,
    count(e.id) filter(where e.event_type='share')::integer shares,
    count(e.id) filter(where e.event_type in ('save','follow','reaction','comment'))::integer engagements,
    (select count(*)::integer from events ce where ce.project_id=p.id and ce.event_type='campaign_join') conversions
  from owned_projects p
  left join events e on e.target_type='project' and e.target_id=p.id
  group by p.id,p.slug,p.name,p.icon_url,p.archived_at
),
devlog_metrics as (
  select u.id,u.title,u.update_type,u.published_at,u.archived_at,p.id project_id,p.name project_name,
    count(e.id) filter(where e.event_type='impression')::integer impressions,
    count(e.id) filter(where e.event_type='view')::integer views,
    count(distinct coalesce('p:'||e.profile_id::text,'v:'||e.visitor_hash))::integer unique_visitors,
    count(e.id) filter(where e.event_type='link_click')::integer link_clicks,
    count(e.id) filter(where e.event_type='share')::integer shares,
    count(e.id) filter(where e.event_type in ('reaction','comment','save'))::integer engagements
  from public.project_updates u join owned_projects p on p.id=u.project_id
  left join events e on e.target_type='devlog' and e.target_id=u.id
  group by u.id,u.title,u.update_type,u.published_at,u.archived_at,p.id,p.name
),
campaign_metrics as (
  select c.id,c.title,c.status,c.is_private,c.created_at,c.archived_at,p.id project_id,p.name project_name,
    count(e.id) filter(where e.event_type='impression')::integer impressions,
    count(e.id) filter(where e.event_type='view')::integer views,
    count(distinct coalesce('p:'||e.profile_id::text,'v:'||e.visitor_hash))::integer unique_visitors,
    count(e.id) filter(where e.event_type='link_click')::integer link_clicks,
    count(e.id) filter(where e.event_type='share')::integer shares,
    count(e.id) filter(where e.event_type='campaign_join')::integer joins
  from public.testing_campaigns c join owned_projects p on p.id=c.project_id
  left join events e on e.target_type='campaign' and e.target_id=c.id
  group by c.id,c.title,c.status,c.is_private,c.created_at,c.archived_at,p.id,p.name
),
profile_metrics as (
  select
    count(*) filter(where event_type='impression')::integer impressions,
    count(*) filter(where event_type='view')::integer views,
    count(distinct coalesce('p:'||profile_id::text,'v:'||visitor_hash))::integer unique_visitors,
    count(*) filter(where event_type='link_click')::integer link_clicks,
    count(*) filter(where event_type='share')::integer shares
  from events where target_type='profile'
),
sources as (
  select coalesce(nullif(source,''),'direct') source,count(*)::integer events
  from events where event_type in ('view','link_click')
  group by coalesce(nullif(source,''),'direct')
)
select jsonb_build_object(
  'days',(select days from settings),
  'totals',jsonb_build_object(
    'impressions',(select count(*) from events where event_type='impression'),
    'views',(select count(*) from events where event_type='view'),
    'unique_visitors',(select count(distinct coalesce('p:'||profile_id::text,'v:'||visitor_hash)) from events),
    'link_clicks',(select count(*) from events where event_type='link_click'),
    'shares',(select count(*) from events where event_type='share'),
    'saves',(select count(*) from events where event_type='save'),
    'follows',(select count(*) from events where event_type='follow'),
    'reactions',(select count(*) from events where event_type='reaction'),
    'comments',(select count(*) from events where event_type='comment'),
    'campaign_joins',(select count(*) from events where event_type='campaign_join')
  ),
  'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.day) from series s),'[]'::jsonb),
  'projects',coalesce((select jsonb_agg(to_jsonb(p) order by p.views desc,p.impressions desc) from project_metrics p),'[]'::jsonb),
  'devlogs',coalesce((select jsonb_agg(to_jsonb(d) order by d.views desc,d.impressions desc) from devlog_metrics d),'[]'::jsonb),
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.views desc,c.impressions desc) from campaign_metrics c),'[]'::jsonb),
  'profile',coalesce((select to_jsonb(p) from profile_metrics p),'{}'::jsonb),
  'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.events desc) from (select * from sources order by events desc limit 12) s),'[]'::jsonb),
  'funnel',jsonb_build_object(
    'impressions',(select count(*) from events where event_type='impression'),
    'views',(select count(*) from events where event_type='view'),
    'link_clicks',(select count(*) from events where event_type='link_click'),
    'campaign_joins',(select count(*) from events where event_type='campaign_join')
  )
);
$$;

revoke all on function public.get_creator_content_analytics(integer) from public;
grant execute on function public.get_creator_content_analytics(integer) to authenticated;

commit;
