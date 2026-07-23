begin;

create or replace function public.admin_get_invalid_test_case(p_report_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  ) then
    raise exception 'Admin access required.';
  end if;

  select jsonb_build_object(
    'id', ir.id,
    'status', ir.status,
    'category', ir.category,
    'reason', ir.reason,
    'resolution_note', ir.resolution_note,
    'created_at', ir.created_at,
    'campaign_member_id', member.id,
    'tester_username', tester.username,
    'tester_display_name', tester.display_name,
    'developer_username', developer.username,
    'developer_display_name', developer.display_name,
    'project_name', coalesce(project.name, 'Unknown project'),
    'campaign_title', coalesce(campaign.title, 'Unknown campaign'),
    'campaign_instructions', campaign.instructions,
    'minimum_minutes', coalesce(campaign.minimum_minutes, 0),
    'reward_credits', coalesce(campaign.reward_credits, 0),
    'membership_status', coalesce(member.status, 'unknown'),
    'what_worked', feedback.what_worked,
    'what_was_confusing', feedback.what_was_confusing,
    'bug_details', feedback.bug_details,
    'overall_rating', feedback.overall_rating,
    'performance_rating', feedback.performance_rating,
    'stability_rating', feedback.stability_rating,
    'ease_of_use_rating', feedback.ease_of_use_rating,
    'sessions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ts.id,
          'minutes_tested', ts.minutes_tested,
          'device_name', ts.device_name,
          'os_version', ts.os_version,
          'notes', ts.notes,
          'created_at', ts.created_at
        ) order by ts.created_at desc
      )
      from public.test_sessions ts
      where ts.campaign_member_id = member.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.invalid_test_reports ir
  left join public.campaign_members member
    on member.id = ir.campaign_member_id
  left join public.testing_campaigns campaign
    on campaign.id = member.campaign_id
  left join public.projects project
    on project.id = campaign.project_id
  left join public.profiles tester
    on tester.id = member.tester_id
  left join public.profiles developer
    on developer.id = ir.reported_by
  left join lateral (
    select fr.*
    from public.feedback_reports fr
    where fr.campaign_member_id = member.id
    limit 1
  ) feedback on true
  where ir.id = p_report_id;

  return v_result;
end;
$$;

revoke all on function public.admin_get_invalid_test_case(uuid) from public, anon;
grant execute on function public.admin_get_invalid_test_case(uuid) to authenticated;

commit;
