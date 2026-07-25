-- Iconic Nexus devlog community: reactions, comments, bookmarks and project followers.
-- Run after devlog_customization_update.sql.

begin;

alter table public.project_updates
  add column if not exists follower_notification_sent_at timestamptz;

create table if not exists public.devlog_reactions (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.project_updates(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('fire','love','clap','helpful')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (update_id, profile_id)
);

create table if not exists public.devlog_comments (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.project_updates(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.devlog_comments(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devlog_comments_body_check
    check (is_deleted or char_length(trim(body)) between 2 and 2000)
);

create table if not exists public.devlog_bookmarks (
  update_id uuid not null references public.project_updates(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (update_id, profile_id)
);

create table if not exists public.project_follows (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create index if not exists devlog_reactions_update_idx
  on public.devlog_reactions(update_id, created_at desc);
create index if not exists devlog_comments_update_idx
  on public.devlog_comments(update_id, created_at);
create index if not exists devlog_comments_parent_idx
  on public.devlog_comments(parent_id, created_at)
  where parent_id is not null;
create index if not exists devlog_bookmarks_profile_idx
  on public.devlog_bookmarks(profile_id, created_at desc);
create index if not exists project_follows_profile_idx
  on public.project_follows(profile_id, created_at desc);

alter table public.devlog_reactions enable row level security;
alter table public.devlog_comments enable row level security;
alter table public.devlog_bookmarks enable row level security;
alter table public.project_follows enable row level security;

drop policy if exists "Public reads reactions on published devlogs" on public.devlog_reactions;
create policy "Public reads reactions on published devlogs"
on public.devlog_reactions for select
using (
  exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_reactions.update_id
      and u.is_published = true
      and p.is_published = true
      and p.moderation_status = 'visible'
  )
);

drop policy if exists "Users add own devlog reactions" on public.devlog_reactions;
create policy "Users add own devlog reactions"
on public.devlog_reactions for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_reactions.update_id
      and u.is_published = true
      and p.is_published = true
      and p.moderation_status = 'visible'
  )
);

drop policy if exists "Users update own devlog reactions" on public.devlog_reactions;
create policy "Users update own devlog reactions"
on public.devlog_reactions for update to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Users delete own devlog reactions" on public.devlog_reactions;
create policy "Users delete own devlog reactions"
on public.devlog_reactions for delete to authenticated
using (profile_id = auth.uid());

drop policy if exists "Public reads comments on published devlogs" on public.devlog_comments;
create policy "Public reads comments on published devlogs"
on public.devlog_comments for select
using (
  exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_comments.update_id
      and u.is_published = true
      and p.is_published = true
      and p.moderation_status = 'visible'
  )
);

drop policy if exists "Users add comments to published devlogs" on public.devlog_comments;
create policy "Users add comments to published devlogs"
on public.devlog_comments for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_comments.update_id
      and u.is_published = true
      and p.is_published = true
      and p.moderation_status = 'visible'
  )
);

drop policy if exists "Authors and project owners moderate devlog comments" on public.devlog_comments;
create policy "Authors and project owners moderate devlog comments"
on public.devlog_comments for update to authenticated
using (
  author_id = auth.uid()
  or exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_comments.update_id and p.owner_id = auth.uid()
  )
  or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin = true)
)
with check (
  author_id = auth.uid()
  or exists (
    select 1 from public.project_updates u
    join public.projects p on p.id = u.project_id
    where u.id = devlog_comments.update_id and p.owner_id = auth.uid()
  )
  or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin = true)
);

drop policy if exists "Users read own devlog bookmarks" on public.devlog_bookmarks;
create policy "Users read own devlog bookmarks"
on public.devlog_bookmarks for select to authenticated
using (profile_id = auth.uid());
drop policy if exists "Users add own devlog bookmarks" on public.devlog_bookmarks;
create policy "Users add own devlog bookmarks"
on public.devlog_bookmarks for insert to authenticated
with check (profile_id = auth.uid());
drop policy if exists "Users delete own devlog bookmarks" on public.devlog_bookmarks;
create policy "Users delete own devlog bookmarks"
on public.devlog_bookmarks for delete to authenticated
using (profile_id = auth.uid());

drop policy if exists "Public reads project follows" on public.project_follows;
create policy "Public reads project follows"
on public.project_follows for select
using (true);
drop policy if exists "Users follow projects as themselves" on public.project_follows;
create policy "Users follow projects as themselves"
on public.project_follows for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_follows.project_id and p.is_published = true and p.moderation_status = 'visible'
  )
);
drop policy if exists "Users unfollow projects as themselves" on public.project_follows;
create policy "Users unfollow projects as themselves"
on public.project_follows for delete to authenticated
using (profile_id = auth.uid());

grant select on public.devlog_reactions, public.devlog_comments, public.project_follows to anon, authenticated;
grant insert, update, delete on public.devlog_reactions to authenticated;
grant insert, update on public.devlog_comments to authenticated;
grant select, insert, delete on public.devlog_bookmarks to authenticated;
grant insert, delete on public.project_follows to authenticated;

create or replace function public.validate_devlog_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_update uuid;
  v_grandparent uuid;
begin
  if tg_op = 'UPDATE' and (
    new.update_id is distinct from old.update_id
    or new.author_id is distinct from old.author_id
    or new.parent_id is distinct from old.parent_id
  ) then
    raise exception 'Comment ownership and thread cannot be changed.';
  end if;
  new.body := trim(new.body);
  new.updated_at := now();
  if new.parent_id is not null then
    select update_id, parent_id
    into v_parent_update, v_grandparent
    from public.devlog_comments
    where id = new.parent_id;
    if not found or v_parent_update <> new.update_id then
      raise exception 'Reply target does not belong to this devlog.';
    end if;
    if v_grandparent is not null then
      raise exception 'Replies may only be one level deep.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_devlog_comment_parent on public.devlog_comments;
create trigger validate_devlog_comment_parent
before insert or update of body, parent_id on public.devlog_comments
for each row execute function public.validate_devlog_comment_parent();

create or replace function public.protect_devlog_reaction_identity()
returns trigger
language plpgsql
as $$
begin
  if new.update_id is distinct from old.update_id
    or new.profile_id is distinct from old.profile_id then
    raise exception 'Reaction ownership cannot be changed.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists protect_devlog_reaction_identity on public.devlog_reactions;
create trigger protect_devlog_reaction_identity
before update on public.devlog_reactions
for each row execute function public.protect_devlog_reaction_identity();

create or replace function public.notify_devlog_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_project_name text;
  v_update_title text;
  v_parent_author uuid;
  v_commenter_name text;
begin
  select p.owner_id, p.name, u.title
  into v_owner, v_project_name, v_update_title
  from public.project_updates u
  join public.projects p on p.id = u.project_id
  where u.id = new.update_id;

  select coalesce(display_name, username, 'Someone')
  into v_commenter_name
  from public.profiles
  where id = new.author_id;

  if v_owner is not null and v_owner <> new.author_id then
    insert into public.notifications(profile_id, type, title, message, link_url)
    values (
      v_owner,
      'devlog_comment',
      'New devlog comment',
      coalesce(v_commenter_name, 'Someone') || ' commented on ' || v_update_title || ' for ' || v_project_name || '.',
      '/devlogs/' || new.update_id::text || '#comments'
    );
  end if;

  if new.parent_id is not null then
    select author_id into v_parent_author
    from public.devlog_comments
    where id = new.parent_id;
    if v_parent_author is not null
      and v_parent_author <> new.author_id
      and v_parent_author is distinct from v_owner then
      insert into public.notifications(profile_id, type, title, message, link_url)
      values (
        v_parent_author,
        'devlog_reply',
        'New reply to your comment',
        coalesce(v_commenter_name, 'Someone') || ' replied to your comment on ' || v_update_title || '.',
        '/devlogs/' || new.update_id::text || '#comments'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_devlog_comment on public.devlog_comments;
create trigger notify_devlog_comment
after insert on public.devlog_comments
for each row execute function public.notify_devlog_comment();

create or replace function public.notify_project_followers_on_devlog()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
begin
  if not new.is_published or new.follower_notification_sent_at is not null then
    return new;
  end if;

  select name into v_project_name
  from public.projects
  where id = new.project_id;

  insert into public.notifications(profile_id, type, title, message, link_url)
  select
    f.profile_id,
    'devlog_published',
    'New update from ' || coalesce(v_project_name, 'a project you follow'),
    new.title,
    '/devlogs/' || new.id::text
  from public.project_follows f
  where f.project_id = new.project_id
    and f.profile_id <> new.author_id;

  update public.project_updates
  set follower_notification_sent_at = now()
  where id = new.id and follower_notification_sent_at is null;
  return new;
end;
$$;

drop trigger if exists notify_project_followers_on_devlog_insert on public.project_updates;
create trigger notify_project_followers_on_devlog_insert
after insert on public.project_updates
for each row
when (new.is_published = true)
execute function public.notify_project_followers_on_devlog();

drop trigger if exists notify_project_followers_on_devlog_publish on public.project_updates;
create trigger notify_project_followers_on_devlog_publish
after update of is_published on public.project_updates
for each row
when (old.is_published is distinct from new.is_published and new.is_published = true)
execute function public.notify_project_followers_on_devlog();

commit;
