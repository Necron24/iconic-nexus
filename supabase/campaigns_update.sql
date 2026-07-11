-- Iconic Nexus campaign creation and joining update

-- Owners may create, update and delete campaigns for their own projects.
drop policy if exists "Project owners create campaigns" on public.testing_campaigns;
create policy "Project owners create campaigns"
on public.testing_campaigns for insert
to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Project owners update campaigns" on public.testing_campaigns;
create policy "Project owners update campaigns"
on public.testing_campaigns for update
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

drop policy if exists "Project owners delete campaigns" on public.testing_campaigns;
create policy "Project owners delete campaigns"
on public.testing_campaigns for delete
to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  )
);

-- Public campaign pages need aggregate membership visibility.
drop policy if exists "Campaign member counts are public" on public.campaign_members;
create policy "Campaign member counts are public"
on public.campaign_members for select
using (
  exists (
    select 1
    from public.testing_campaigns c
    join public.projects p on p.id = c.project_id
    where c.id = campaign_id
      and (p.is_published = true or p.owner_id = auth.uid() or tester_id = auth.uid())
  )
);

-- Atomic and validated join operation.
create or replace function public.join_testing_campaign(p_campaign_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_campaign public.testing_campaigns%rowtype;
  v_owner_id uuid;
  v_member_count integer;
begin
  if v_user_id is null then
    raise exception 'Please log in to join this campaign.';
  end if;

  select c.*
  into v_campaign
  from public.testing_campaigns c
  where c.id = p_campaign_id
  for update;

  if not found then
    raise exception 'Campaign not found.';
  end if;

  select p.owner_id
  into v_owner_id
  from public.projects p
  where p.id = v_campaign.project_id;

  if v_owner_id = v_user_id then
    raise exception 'You cannot join a campaign for your own project.';
  end if;

  if v_campaign.status <> 'active' then
    raise exception 'This campaign is not active.';
  end if;

  if v_campaign.ends_at is not null and v_campaign.ends_at <= now() then
    raise exception 'This campaign has ended.';
  end if;

  if exists (
    select 1 from public.campaign_members
    where campaign_id = p_campaign_id and tester_id = v_user_id
  ) then
    return 'already_joined';
  end if;

  select count(*) into v_member_count
  from public.campaign_members
  where campaign_id = p_campaign_id;

  if v_member_count >= v_campaign.tester_goal then
    raise exception 'This campaign has reached its tester goal.';
  end if;

  insert into public.campaign_members (campaign_id, tester_id, status)
  values (p_campaign_id, v_user_id, 'joined');

  return 'joined';
end;
$$;

grant execute on function public.join_testing_campaign(uuid) to authenticated;
