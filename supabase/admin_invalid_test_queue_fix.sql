begin;

create or replace function public.admin_list_invalid_test_reports()
returns table (
  id uuid,
  campaign_member_id uuid,
  status text,
  category text,
  reason text,
  resolution text,
  resolution_note text,
  created_at timestamptz,
  developer_id uuid,
  developer_username text,
  developer_display_name text,
  tester_id uuid,
  tester_username text,
  tester_display_name text,
  project_id uuid,
  project_name text,
  campaign_id uuid,
  campaign_title text,
  campaign_instructions text,
  reward_credits integer,
  what_worked text,
  what_was_confusing text,
  bug_details text,
  total_minutes integer,
  session_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) then
    raise exception 'Admin access required.';
  end if;

  return query
  select
    ir.id,
    ir.campaign_member_id,
    ir.status,
    ir.category,
    ir.reason,
    ir.resolution,
    ir.resolution_note,
    ir.created_at,
    developer.id as developer_id,
    developer.username as developer_username,
    developer.display_name as developer_display_name,
    tester.id as tester_id,
    tester.username as tester_username,
    tester.display_name as tester_display_name,
    project.id as project_id,
    project.name as project_name,
    campaign.id as campaign_id,
    campaign.title as campaign_title,
    campaign.instructions as campaign_instructions,
    campaign.reward_credits,
    feedback.what_worked,
    feedback.what_was_confusing,
    feedback.bug_details,
    coalesce(sessions.total_minutes, 0)::integer as total_minutes,
    coalesce(sessions.session_count, 0)::integer as session_count
  from public.invalid_test_reports ir
  join public.campaign_members member
    on member.id = ir.campaign_member_id
  join public.testing_campaigns campaign
    on campaign.id = member.campaign_id
  join public.projects project
    on project.id = campaign.project_id
  join public.profiles developer
    on developer.id = ir.reported_by
  join public.profiles tester
    on tester.id = member.tester_id
  left join public.feedback_reports feedback
    on feedback.campaign_member_id = member.id
  left join lateral (
    select
      coalesce(sum(ts.minutes_tested), 0)::integer as total_minutes,
      count(*)::integer as session_count
    from public.test_sessions ts
    where ts.campaign_member_id = member.id
  ) sessions on true
  order by
    case when ir.status = 'open' then 0 else 1 end,
    ir.created_at desc;
end;
$$;

revoke all on function public.admin_list_invalid_test_reports() from public, anon;
grant execute on function public.admin_list_invalid_test_reports() to authenticated;

-- Recreate the admin notification step so every current administrator is alerted.
create or replace function public.notify_admins_of_invalid_test(
  p_report_id uuid,
  p_campaign_title text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(profile_id, type, title, message, link_url)
  select
    p.id,
    'invalid_test_reported',
    'Invalid test review required',
    'A developer reported a submitted test for ' || p_campaign_title || '.',
    '/dashboard/admin/reports'
  from public.profiles p
  where p.is_admin = true;
end;
$$;

revoke all on function public.notify_admins_of_invalid_test(uuid, text) from public, anon, authenticated;

commit;
