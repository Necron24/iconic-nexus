begin;

create table if not exists public.invalid_test_reports (
  id uuid primary key default gen_random_uuid(),
  campaign_member_id uuid not null references public.campaign_members(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in (
    'requirements_not_followed',
    'spam_or_nonsense',
    'copied_feedback',
    'wrong_project',
    'fabricated_evidence',
    'abusive_content'
  )),
  reason text not null check (char_length(reason) between 20 and 2000),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text check (resolution in ('tester_approved','invalid_upheld')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists one_open_invalid_report_per_member
on public.invalid_test_reports(campaign_member_id)
where status='open';

create index if not exists invalid_test_reports_status_created_idx
on public.invalid_test_reports(status, created_at desc);

alter table public.invalid_test_reports enable row level security;

revoke all on public.invalid_test_reports from anon, authenticated;
grant select on public.invalid_test_reports to authenticated;

drop policy if exists "Relevant users view invalid test reports" on public.invalid_test_reports;
create policy "Relevant users view invalid test reports"
on public.invalid_test_reports for select to authenticated
using (
  reported_by = auth.uid()
  or exists (
    select 1
    from public.campaign_members cm
    where cm.id = campaign_member_id
      and cm.tester_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  )
);

create or replace function public.report_invalid_test(
  p_member_id uuid,
  p_category text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_owner uuid := auth.uid();
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
  v_report_id uuid;
begin
  if v_owner is null then raise exception 'Please log in.'; end if;

  if p_category not in (
    'requirements_not_followed','spam_or_nonsense','copied_feedback',
    'wrong_project','fabricated_evidence','abusive_content'
  ) then
    raise exception 'Choose a valid invalid-test category.';
  end if;

  if length(trim(coalesce(p_reason,''))) < 20 then
    raise exception 'Explain the invalid test in at least 20 characters.';
  end if;

  select * into v_member
  from public.campaign_members
  where id = p_member_id
  for update;
  if not found then raise exception 'Testing membership not found.'; end if;

  select * into v_campaign
  from public.testing_campaigns
  where id = v_member.campaign_id;

  select * into v_project
  from public.projects
  where id = v_campaign.project_id;

  if v_project.owner_id <> v_owner then
    raise exception 'You do not own this campaign.';
  end if;

  if v_member.status <> 'submitted' then
    raise exception 'Only submitted feedback can be reported as invalid.';
  end if;

  if exists (
    select 1 from public.invalid_test_reports
    where campaign_member_id = p_member_id and status = 'open'
  ) then
    raise exception 'This test already has an open invalid-test review.';
  end if;

  insert into public.invalid_test_reports(
    campaign_member_id, reported_by, category, reason
  ) values (
    p_member_id, v_owner, p_category, trim(p_reason)
  ) returning id into v_report_id;

  update public.feedback_reports
  set review_note = 'Reported for admin review: ' || trim(p_reason),
      reviewed_at = now(),
      reviewed_by = v_owner,
      review_due_at = null
  where campaign_member_id = p_member_id;

  insert into public.notifications(profile_id,type,title,message,link_url)
  values(
    v_member.tester_id,
    'invalid_test_review',
    'Test sent for admin review',
    'The developer reported your test for ' || v_campaign.title || ' as potentially invalid. Your reward remains reserved until an administrator reviews it.',
    '/dashboard/testing/' || p_member_id
  );

  insert into public.notifications(profile_id,type,title,message,link_url)
  select
    id,
    'invalid_test_reported',
    'Invalid test review required',
    'A developer reported a submitted test for ' || v_campaign.title || '.',
    '/dashboard/admin/reports'
  from public.profiles
  where is_admin = true;

  return v_report_id;
end;
$$;

grant execute on function public.report_invalid_test(uuid,text,text) to authenticated;

create or replace function public.admin_resolve_invalid_test(
  p_report_id uuid,
  p_approve_tester boolean,
  p_resolution_note text
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid := auth.uid();
  v_report public.invalid_test_reports%rowtype;
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
  v_result text;
begin
  if not exists(
    select 1 from public.profiles
    where id = v_admin and is_admin = true
  ) then
    raise exception 'Admin access required.';
  end if;

  if length(trim(coalesce(p_resolution_note,''))) < 10 then
    raise exception 'Add a clear resolution note.';
  end if;

  select * into v_report
  from public.invalid_test_reports
  where id = p_report_id
  for update;

  if not found or v_report.status <> 'open' then
    raise exception 'Open invalid-test report not found.';
  end if;

  select * into v_member
  from public.campaign_members
  where id = v_report.campaign_member_id
  for update;

  select * into v_campaign
  from public.testing_campaigns
  where id = v_member.campaign_id;

  select * into v_project
  from public.projects
  where id = v_campaign.project_id;

  if p_approve_tester then
    v_result := public._approve_feedback_member(v_member.id, v_admin, false);

    update public.invalid_test_reports
    set status='resolved', resolution='tester_approved',
        resolution_note=trim(p_resolution_note), resolved_by=v_admin,
        resolved_at=now()
    where id=p_report_id;

    insert into public.notifications(profile_id,type,title,message,link_url)
    values(
      v_project.owner_id,
      'invalid_test_resolved',
      'Invalid-test report not upheld',
      'An administrator approved the tester feedback for ' || v_campaign.title || '. The tester was paid. ' || trim(p_resolution_note),
      '/dashboard/projects/' || v_project.id || '/campaigns/' || v_campaign.id || '/feedback'
    );

    insert into public.notifications(profile_id,type,title,message,link_url)
    values(
      v_member.tester_id,
      'invalid_test_resolved',
      'Your feedback was approved',
      'An administrator approved your feedback for ' || v_campaign.title || '. Your reward was paid. ' || trim(p_resolution_note),
      '/dashboard/credits'
    );

    return 'tester_approved';
  end if;

  update public.campaign_members
  set status='rejected'
  where id=v_member.id;

  update public.invalid_test_reports
  set status='resolved', resolution='invalid_upheld',
      resolution_note=trim(p_resolution_note), resolved_by=v_admin,
      resolved_at=now()
  where id=p_report_id;

  insert into public.notifications(profile_id,type,title,message,link_url)
  values(
    v_member.tester_id,
    'invalid_test_resolved',
    'Test marked invalid',
    'An administrator upheld the invalid-test report for ' || v_campaign.title || '. No reward was paid. ' || trim(p_resolution_note),
    '/dashboard/testing/' || v_member.id
  );

  insert into public.notifications(profile_id,type,title,message,link_url)
  values(
    v_project.owner_id,
    'invalid_test_resolved',
    'Invalid-test report upheld',
    'An administrator marked the submitted test for ' || v_campaign.title || ' as invalid. The reserved reward remains in the campaign budget.',
    '/dashboard/projects/' || v_project.id || '/campaigns/' || v_campaign.id || '/feedback'
  );

  return 'invalid_upheld';
end;
$$;

grant execute on function public.admin_resolve_invalid_test(uuid,boolean,text) to authenticated;

-- Keep automatic approval from paying feedback that is already under admin review.
create or replace function public.process_due_feedback_approvals()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_row record;
  v_count integer:=0;
begin
  for v_row in
    select fr.campaign_member_id
    from public.feedback_reports fr
    join public.campaign_members cm on cm.id=fr.campaign_member_id
    where cm.status='submitted'
      and fr.review_due_at is not null
      and fr.review_due_at<=now()
      and not exists(
        select 1 from public.feedback_disputes fd
        where fd.campaign_member_id=cm.id and fd.status='open'
      )
      and not exists(
        select 1 from public.invalid_test_reports ir
        where ir.campaign_member_id=cm.id and ir.status='open'
      )
    for update of fr skip locked
  loop
    perform public._approve_feedback_member(v_row.campaign_member_id,null,true);
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.process_due_feedback_approvals() from public,anon,authenticated;

commit;
