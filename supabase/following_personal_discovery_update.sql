-- Creator follows, campaign watches, notification preferences and follow notifications.
-- Run after detailed_analytics_archive_update.sql.

begin;

create table if not exists public.creator_follows (
  creator_id uuid not null references public.profiles(id) on delete cascade,
  follower_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (creator_id, follower_id),
  check (creator_id <> follower_id)
);

create table if not exists public.campaign_watches (
  campaign_id uuid not null references public.testing_campaigns(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, profile_id)
);

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  creator_updates boolean not null default true,
  project_updates boolean not null default true,
  campaign_updates boolean not null default true,
  community_replies boolean not null default true,
  testing_updates boolean not null default true,
  credit_updates boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists follower_notification_sent_at timestamptz;
alter table public.testing_campaigns
  add column if not exists follower_notification_sent_at timestamptz;

create index if not exists creator_follows_follower_idx
  on public.creator_follows(follower_id, created_at desc);
create index if not exists campaign_watches_profile_idx
  on public.campaign_watches(profile_id, created_at desc);

alter table public.creator_follows enable row level security;
alter table public.campaign_watches enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Creator follows are public" on public.creator_follows;
create policy "Creator follows are public"
on public.creator_follows for select using (true);
drop policy if exists "Users follow creators as themselves" on public.creator_follows;
create policy "Users follow creators as themselves"
on public.creator_follows for insert to authenticated
with check (
  follower_id=auth.uid() and creator_id<>auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id=creator_id and coalesce(p.account_status,'active')='active'
  )
);
drop policy if exists "Users unfollow creators as themselves" on public.creator_follows;
create policy "Users unfollow creators as themselves"
on public.creator_follows for delete to authenticated
using (follower_id=auth.uid());

drop policy if exists "Campaign watches are visible to their users" on public.campaign_watches;
create policy "Campaign watches are visible to their users"
on public.campaign_watches for select to authenticated
using (
  profile_id=auth.uid()
  or exists (
    select 1 from public.testing_campaigns c
    join public.projects p on p.id=c.project_id
    where c.id=campaign_id and p.owner_id=auth.uid()
  )
);
drop policy if exists "Users watch campaigns as themselves" on public.campaign_watches;
create policy "Users watch campaigns as themselves"
on public.campaign_watches for insert to authenticated
with check (
  profile_id=auth.uid()
  and exists (
    select 1 from public.testing_campaigns c
    join public.projects p on p.id=c.project_id
    where c.id=campaign_id and p.owner_id<>auth.uid()
      and c.archived_at is null
  )
);
drop policy if exists "Users unwatch campaigns as themselves" on public.campaign_watches;
create policy "Users unwatch campaigns as themselves"
on public.campaign_watches for delete to authenticated
using (profile_id=auth.uid());

drop policy if exists "Users read own notification preferences" on public.notification_preferences;
create policy "Users read own notification preferences"
on public.notification_preferences for select to authenticated using (profile_id=auth.uid());
drop policy if exists "Users create own notification preferences" on public.notification_preferences;
create policy "Users create own notification preferences"
on public.notification_preferences for insert to authenticated with check (profile_id=auth.uid());
drop policy if exists "Users update own notification preferences" on public.notification_preferences;
create policy "Users update own notification preferences"
on public.notification_preferences for update to authenticated
using (profile_id=auth.uid()) with check (profile_id=auth.uid());

grant select on public.creator_follows to anon,authenticated;
grant insert,delete on public.creator_follows to authenticated;
grant select,insert,delete on public.campaign_watches to authenticated;
grant select,insert,update on public.notification_preferences to authenticated;

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
on public.notifications for delete to authenticated using (profile_id=auth.uid());
grant delete on public.notifications to authenticated;

create or replace function public.notify_creator_followers_on_project()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_creator_name text;
begin
  if not new.is_published or new.archived_at is not null
    or new.follower_notification_sent_at is not null then return new; end if;

  select coalesce(display_name,username,'A creator') into v_creator_name
  from public.profiles where id=new.owner_id;

  insert into public.notifications(profile_id,type,title,message,link_url)
  select f.follower_id,'creator_project','New project from '||coalesce(v_creator_name,'a creator you follow'),
    new.name,'/projects/'||new.slug
  from public.creator_follows f
  left join public.notification_preferences np on np.profile_id=f.follower_id
  where f.creator_id=new.owner_id and coalesce(np.creator_updates,true);

  update public.projects set follower_notification_sent_at=now()
  where id=new.id and follower_notification_sent_at is null;
  return new;
end;
$$;

drop trigger if exists notify_creator_followers_on_project_insert on public.projects;
create trigger notify_creator_followers_on_project_insert
after insert on public.projects for each row
when (new.is_published=true)
execute function public.notify_creator_followers_on_project();
drop trigger if exists notify_creator_followers_on_project_publish on public.projects;
create trigger notify_creator_followers_on_project_publish
after update of is_published on public.projects for each row
when (old.is_published is distinct from new.is_published and new.is_published=true)
execute function public.notify_creator_followers_on_project();

create or replace function public.notify_project_followers_on_devlog()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project_name text;
  v_owner_id uuid;
begin
  if not new.is_published or new.archived_at is not null
    or new.follower_notification_sent_at is not null then return new; end if;

  select name,owner_id into v_project_name,v_owner_id
  from public.projects where id=new.project_id;

  insert into public.notifications(profile_id,type,title,message,link_url)
  select recipients.profile_id,'devlog_published',
    'New update from '||coalesce(v_project_name,'a project you follow'),
    new.title,'/devlogs/'||new.id::text
  from (
    select f.profile_id
    from public.project_follows f
    left join public.notification_preferences np on np.profile_id=f.profile_id
    where f.project_id=new.project_id and coalesce(np.project_updates,true)
    union
    select cf.follower_id
    from public.creator_follows cf
    left join public.notification_preferences np on np.profile_id=cf.follower_id
    where cf.creator_id=v_owner_id and coalesce(np.creator_updates,true)
  ) recipients
  where recipients.profile_id<>new.author_id;

  update public.project_updates set follower_notification_sent_at=now()
  where id=new.id and follower_notification_sent_at is null;
  return new;
end;
$$;

create or replace function public.notify_campaign_followers(p_campaign_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_campaign public.testing_campaigns%rowtype;
  v_project_name text;
  v_owner_id uuid;
begin
  select * into v_campaign from public.testing_campaigns where id=p_campaign_id;
  if not found then return false; end if;

  select name,owner_id into v_project_name,v_owner_id
  from public.projects where id=v_campaign.project_id;
  if auth.uid() is not null and auth.uid()<>v_owner_id then return false; end if;
  if v_campaign.status<>'active' or v_campaign.is_private or v_campaign.archived_at is not null
    or v_campaign.follower_notification_sent_at is not null then return false; end if;

  insert into public.notifications(profile_id,type,title,message,link_url)
  select recipients.profile_id,'campaign_available','New testing campaign',
    v_campaign.title||' for '||coalesce(v_project_name,'a project you follow')||' is open.',
    '/campaigns/'||v_campaign.id::text
  from (
    select f.profile_id
    from public.project_follows f
    left join public.notification_preferences np on np.profile_id=f.profile_id
    where f.project_id=v_campaign.project_id and coalesce(np.campaign_updates,true)
    union
    select cf.follower_id
    from public.creator_follows cf
    left join public.notification_preferences np on np.profile_id=cf.follower_id
    where cf.creator_id=v_owner_id and coalesce(np.campaign_updates,true)
  ) recipients
  where recipients.profile_id<>v_owner_id;

  update public.testing_campaigns set follower_notification_sent_at=now()
  where id=v_campaign.id and follower_notification_sent_at is null;
  return true;
end;
$$;

revoke all on function public.notify_campaign_followers(uuid) from public;
grant execute on function public.notify_campaign_followers(uuid) to authenticated;

create or replace function public.notify_followers_on_campaign()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.notify_campaign_followers(new.id);
  return new;
end;
$$;

drop trigger if exists notify_followers_on_campaign_insert on public.testing_campaigns;
drop trigger if exists notify_followers_on_campaign_activation on public.testing_campaigns;
create trigger notify_followers_on_campaign_activation
after update of status,is_private on public.testing_campaigns for each row
when (
  new.status='active' and new.is_private=false
  and (old.status is distinct from new.status or old.is_private is distinct from new.is_private)
)
execute function public.notify_followers_on_campaign();

create or replace function public.notify_campaign_watchers()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.status is not distinct from new.status
    and old.ends_at is not distinct from new.ends_at then return new; end if;

  insert into public.notifications(profile_id,type,title,message,link_url)
  select w.profile_id,'campaign_watch','Campaign update: '||new.title,
    case
      when old.status is distinct from new.status then 'Status changed to '||replace(new.status::text,'_',' ')||'.'
      when new.ends_at is not null then 'The campaign deadline has changed.'
      else 'Campaign details changed.'
    end,
    '/campaigns/'||new.id::text
  from public.campaign_watches w
  left join public.notification_preferences np on np.profile_id=w.profile_id
  where w.campaign_id=new.id and coalesce(np.campaign_updates,true);
  return new;
end;
$$;

drop trigger if exists notify_campaign_watchers_on_change on public.testing_campaigns;
create trigger notify_campaign_watchers_on_change
after update of status,ends_at on public.testing_campaigns
for each row execute function public.notify_campaign_watchers();

create or replace function public.notify_devlog_comment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_owner uuid;
  v_project_name text;
  v_update_title text;
  v_parent_author uuid;
  v_commenter_name text;
begin
  select p.owner_id,p.name,u.title into v_owner,v_project_name,v_update_title
  from public.project_updates u join public.projects p on p.id=u.project_id
  where u.id=new.update_id;
  select coalesce(display_name,username,'Someone') into v_commenter_name
  from public.profiles where id=new.author_id;

  if v_owner is not null and v_owner<>new.author_id
    and coalesce((select community_replies from public.notification_preferences where profile_id=v_owner),true) then
    insert into public.notifications(profile_id,type,title,message,link_url)
    values (v_owner,'devlog_comment','New devlog comment',
      coalesce(v_commenter_name,'Someone')||' commented on '||v_update_title||' for '||v_project_name||'.',
      '/devlogs/'||new.update_id::text||'#comments');
  end if;

  if new.parent_id is not null then
    select author_id into v_parent_author from public.devlog_comments where id=new.parent_id;
    if v_parent_author is not null and v_parent_author<>new.author_id
      and v_parent_author is distinct from v_owner
      and coalesce((select community_replies from public.notification_preferences where profile_id=v_parent_author),true) then
      insert into public.notifications(profile_id,type,title,message,link_url)
      values (v_parent_author,'devlog_reply','New reply to your comment',
        coalesce(v_commenter_name,'Someone')||' replied to your comment on '||v_update_title||'.',
        '/devlogs/'||new.update_id::text||'#comments');
    end if;
  end if;
  return new;
end;
$$;

commit;
