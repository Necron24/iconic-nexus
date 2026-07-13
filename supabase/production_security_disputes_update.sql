-- Iconic Nexus production security, account controls, disputes and auto-approval

alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check check (account_status in ('active','suspended','banned'));

alter table public.projects add column if not exists moderation_status text not null default 'visible';
alter table public.projects add column if not exists moderation_reason text;
alter table public.projects add column if not exists moderated_at timestamptz;
alter table public.projects add column if not exists moderated_by uuid references public.profiles(id) on delete set null;
alter table public.projects drop constraint if exists projects_moderation_status_check;
alter table public.projects add constraint projects_moderation_status_check check (moderation_status in ('visible','hidden'));

alter table public.feedback_reports add column if not exists review_due_at timestamptz;
alter table public.reports add column if not exists resolution_note text;

create table if not exists public.feedback_disputes (
  id uuid primary key default gen_random_uuid(),
  campaign_member_id uuid not null references public.campaign_members(id) on delete cascade,
  opened_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 20 and 2000),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists one_open_dispute_per_member on public.feedback_disputes(campaign_member_id) where status='open';
create index if not exists feedback_disputes_status_created_idx on public.feedback_disputes(status,created_at desc);
alter table public.feedback_disputes enable row level security;

drop policy if exists "Testers view own disputes" on public.feedback_disputes;
create policy "Testers view own disputes" on public.feedback_disputes for select to authenticated
using (opened_by=auth.uid() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));

drop policy if exists "Testers open own disputes" on public.feedback_disputes;
create policy "Testers open own disputes" on public.feedback_disputes for insert to authenticated
with check (opened_by=auth.uid());

drop policy if exists "Admins update disputes" on public.feedback_disputes;
create policy "Admins update disputes" on public.feedback_disputes for update to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));

-- Published listings must also pass moderation.
drop policy if exists "Published projects are public" on public.projects;
create policy "Published projects are public" on public.projects for select
using ((is_published=true and moderation_status='visible') or auth.uid()=owner_id or exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));

create or replace function public._approve_feedback_member(p_member_id uuid, p_actor uuid, p_auto boolean default false)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_approved_count integer;
begin
  select * into v_member from public.campaign_members where id=p_member_id for update;
  if not found then raise exception 'Testing membership not found.'; end if;
  if v_member.status <> 'submitted' then return 'not_pending'; end if;
  select * into v_campaign from public.testing_campaigns where id=v_member.campaign_id for update;
  if v_campaign.reserved_credits < v_campaign.reward_credits then raise exception 'Campaign does not have enough reserved credits.'; end if;

  update public.feedback_reports
  set reviewed_at=now(), reviewed_by=p_actor,
      review_note=case when p_auto then 'Automatically approved after the 7-day review period.' else review_note end
  where campaign_member_id=p_member_id;

  update public.campaign_members set status='approved',approved_at=now() where id=p_member_id;

  if not exists(select 1 from public.credit_transactions where profile_id=v_member.tester_id and transaction_type='test_reward' and reference_id=p_member_id) then
    update public.testing_campaigns set reserved_credits=reserved_credits-reward_credits,spent_credits=spent_credits+reward_credits where id=v_campaign.id;
    update public.profiles set credits=credits+v_campaign.reward_credits,updated_at=now() where id=v_member.tester_id;
    insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note)
    values(v_member.tester_id,v_campaign.reward_credits,'test_reward',p_member_id,case when p_auto then 'Auto-approved feedback: ' else 'Approved feedback: ' end||v_campaign.title);
  end if;

  select count(*)::integer into v_approved_count from public.campaign_members where tester_id=v_member.tester_id and status='approved';
  update public.profiles set tester_reputation=least(5.0,3.5+(least(v_approved_count,10)*0.15)),updated_at=now() where id=v_member.tester_id;
  insert into public.notifications(profile_id,type,title,message,link_url)
  values(v_member.tester_id,'feedback_approved',case when p_auto then 'Feedback automatically approved' else 'Feedback approved' end,
    'Your feedback for '||v_campaign.title||' was approved. You earned '||v_campaign.reward_credits||' credits.','/dashboard/credits');
  return 'approved';
end;
$$;
revoke all on function public._approve_feedback_member(uuid,uuid,boolean) from public,anon,authenticated;

create or replace function public.review_testing_feedback(p_member_id uuid,p_approve boolean,p_review_note text default null)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_owner uuid:=auth.uid();
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
begin
  if v_owner is null then raise exception 'Please log in.'; end if;
  if exists(select 1 from public.profiles where id=v_owner and account_status<>'active') then raise exception 'Your account is restricted.'; end if;
  select * into v_member from public.campaign_members where id=p_member_id for update;
  if not found then raise exception 'Testing membership not found.'; end if;
  select * into v_campaign from public.testing_campaigns where id=v_member.campaign_id for update;
  select * into v_project from public.projects where id=v_campaign.project_id;
  if v_project.owner_id<>v_owner then raise exception 'You do not own this campaign.'; end if;
  if v_member.status<>'submitted' then raise exception 'This report is not awaiting review.'; end if;

  if p_approve then
    update public.feedback_reports set review_note=nullif(p_review_note,''),reviewed_at=now(),reviewed_by=v_owner where campaign_member_id=p_member_id;
    return public._approve_feedback_member(p_member_id,v_owner,false);
  end if;

  if length(trim(coalesce(p_review_note,'')))<10 then raise exception 'A clear change-request reason is required.'; end if;
  update public.feedback_reports set review_note=p_review_note,reviewed_at=now(),reviewed_by=v_owner where campaign_member_id=p_member_id;
  update public.campaign_members set status='in_progress',submitted_at=null where id=p_member_id;
  insert into public.notifications(profile_id,type,title,message,link_url)
  values(v_member.tester_id,'changes_requested','Changes requested','The developer requested changes to your feedback for '||v_campaign.title||'. Note: '||p_review_note,'/dashboard/testing/'||p_member_id);
  return 'changes_requested';
end;
$$;
grant execute on function public.review_testing_feedback(uuid,boolean,text) to authenticated;

create or replace function public.open_feedback_dispute(p_member_id uuid,p_reason text)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_member public.campaign_members%rowtype;
  v_campaign public.testing_campaigns%rowtype;
  v_project public.projects%rowtype;
  v_id uuid;
begin
  if v_user is null then raise exception 'Please log in.'; end if;
  if length(trim(coalesce(p_reason,'')))<20 then raise exception 'Explain the appeal in at least 20 characters.'; end if;
  select * into v_member from public.campaign_members where id=p_member_id and tester_id=v_user;
  if not found then raise exception 'Testing membership not found.'; end if;
  if v_member.status<>'in_progress' then raise exception 'Only a returned feedback report can be appealed.'; end if;
  if not exists(select 1 from public.feedback_reports where campaign_member_id=p_member_id and reviewed_at is not null and review_note is not null) then raise exception 'No developer decision is available to appeal.'; end if;
  if exists(select 1 from public.feedback_disputes where campaign_member_id=p_member_id and status='open') then raise exception 'An appeal is already open.'; end if;

  insert into public.feedback_disputes(campaign_member_id,opened_by,reason) values(p_member_id,v_user,trim(p_reason)) returning id into v_id;
  select * into v_campaign from public.testing_campaigns where id=v_member.campaign_id;
  select * into v_project from public.projects where id=v_campaign.project_id;
  insert into public.notifications(profile_id,type,title,message,link_url)
  select id,'dispute_opened','Feedback appeal opened','A tester appealed a feedback decision for '||v_campaign.title||'.','/dashboard/admin/reports'
  from public.profiles where is_admin=true;
  insert into public.notifications(profile_id,type,title,message,link_url)
  values(v_project.owner_id,'dispute_opened','Feedback decision appealed','A tester appealed your change request for '||v_campaign.title||'.','/dashboard/projects/'||v_project.id||'/campaigns/'||v_campaign.id||'/feedback');
  return v_id;
end;
$$;
grant execute on function public.open_feedback_dispute(uuid,text) to authenticated;

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
    from public.feedback_reports fr join public.campaign_members cm on cm.id=fr.campaign_member_id
    where cm.status='submitted' and fr.review_due_at is not null and fr.review_due_at<=now()
      and not exists(select 1 from public.feedback_disputes fd where fd.campaign_member_id=cm.id and fd.status='open')
    for update of fr skip locked
  loop
    perform public._approve_feedback_member(v_row.campaign_member_id,null,true);
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.process_due_feedback_approvals() from public,anon,authenticated;

create or replace function public.admin_resolve_feedback_dispute(p_dispute_id uuid,p_approve_tester boolean,p_resolution_note text)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  v_admin uuid:=auth.uid();
  v_dispute public.feedback_disputes%rowtype;
  v_member public.campaign_members%rowtype;
begin
  if not exists(select 1 from public.profiles where id=v_admin and is_admin=true) then raise exception 'Admin access required.'; end if;
  if length(trim(coalesce(p_resolution_note,'')))<10 then raise exception 'A clear resolution note is required.'; end if;
  select * into v_dispute from public.feedback_disputes where id=p_dispute_id for update;
  if not found or v_dispute.status<>'open' then raise exception 'Open dispute not found.'; end if;
  select * into v_member from public.campaign_members where id=v_dispute.campaign_member_id;
  if p_approve_tester then
    update public.campaign_members set status='submitted',submitted_at=coalesce(submitted_at,now()) where id=v_member.id;
    perform public._approve_feedback_member(v_member.id,v_admin,false);
  end if;
  update public.feedback_disputes set status='resolved',resolution_note=trim(p_resolution_note),resolved_by=v_admin,resolved_at=now() where id=p_dispute_id;
  insert into public.notifications(profile_id,type,title,message,link_url)
  values(v_dispute.opened_by,'dispute_resolved','Feedback appeal resolved',trim(p_resolution_note),'/dashboard/testing/'||v_member.id);
  return case when p_approve_tester then 'tester_approved' else 'developer_upheld' end;
end;
$$;
grant execute on function public.admin_resolve_feedback_dispute(uuid,boolean,text) to authenticated;

create or replace function public.admin_set_user_status(p_user_id uuid,p_status text,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin=true) then raise exception 'Admin access required.'; end if;
  if p_status not in ('active','suspended','banned') then raise exception 'Invalid account status.'; end if;
  if exists(select 1 from public.profiles where id=p_user_id and is_admin=true) then raise exception 'Admin accounts cannot be restricted here.'; end if;
  update public.profiles set account_status=p_status,suspension_reason=nullif(trim(coalesce(p_reason,'')),''),suspended_at=case when p_status='active' then null else now() end,updated_at=now() where id=p_user_id;
  insert into public.notifications(profile_id,type,title,message,link_url) values(p_user_id,'account_status','Account status updated','Your account status is now '||p_status||coalesce('. Reason: '||nullif(trim(coalesce(p_reason,'')),''),'.'),'/account-restricted');
end;$$;
grant execute on function public.admin_set_user_status(uuid,text,text) to authenticated;

create or replace function public.admin_set_project_visibility(p_project_id uuid,p_hidden boolean,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_owner uuid;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and is_admin=true) then raise exception 'Admin access required.'; end if;
  update public.projects set moderation_status=case when p_hidden then 'hidden' else 'visible' end,moderation_reason=nullif(trim(coalesce(p_reason,'')),''),moderated_at=now(),moderated_by=auth.uid() where id=p_project_id returning owner_id into v_owner;
  if v_owner is null then raise exception 'Project not found.'; end if;
  insert into public.notifications(profile_id,type,title,message,link_url) values(v_owner,'project_moderation',case when p_hidden then 'Project hidden' else 'Project restored' end,coalesce(nullif(trim(coalesce(p_reason,'')),''),'A moderation status change was applied.'),'/dashboard/projects');
end;$$;
grant execute on function public.admin_set_project_visibility(uuid,boolean,text) to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path=public,auth,storage
as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'Please log in.'; end if;
  if exists(select 1 from public.feedback_disputes where opened_by=v_user and status='open') then raise exception 'Resolve your open feedback disputes before deleting your account.'; end if;
  if exists(select 1 from public.campaign_members where tester_id=v_user and status='submitted') then raise exception 'Wait for submitted feedback to be reviewed before deleting your account.'; end if;
  delete from storage.objects where bucket_id in ('profile-media','project-media','feedback-media') and (storage.foldername(name))[1]=v_user::text;
  delete from auth.users where id=v_user;
end;
$$;
grant execute on function public.delete_my_account() to authenticated;

-- Ensure new/legacy submitted reports receive a review deadline.
update public.feedback_reports fr set review_due_at=coalesce(fr.reviewed_at,cm.submitted_at,fr.created_at)+interval '7 days'
from public.campaign_members cm where cm.id=fr.campaign_member_id and fr.review_due_at is null;

-- Harden direct table writes for restricted users and allow safe report resubmission.
create or replace function public.is_active_account(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=p_user and account_status='active');
$$;
grant execute on function public.is_active_account(uuid) to authenticated;

drop policy if exists "Owners create projects" on public.projects;
create policy "Owners create projects" on public.projects for insert to authenticated
with check (auth.uid()=owner_id and public.is_active_account());
drop policy if exists "Owners update projects" on public.projects;
create policy "Owners update projects" on public.projects for update to authenticated
using (auth.uid()=owner_id and public.is_active_account()) with check (auth.uid()=owner_id and public.is_active_account());
drop policy if exists "Owners delete projects" on public.projects;
create policy "Owners delete projects" on public.projects for delete to authenticated
using (auth.uid()=owner_id and public.is_active_account());

drop policy if exists "Testers insert own sessions" on public.test_sessions;
create policy "Testers insert own sessions" on public.test_sessions for insert to authenticated
with check (public.is_active_account() and exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid()));

drop policy if exists "Testers create own feedback" on public.feedback_reports;
create policy "Testers create own feedback" on public.feedback_reports for insert to authenticated
with check (public.is_active_account() and exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid()));

drop policy if exists "Testers update own feedback before approval" on public.feedback_reports;
create policy "Testers update own feedback before approval" on public.feedback_reports for update to authenticated
using (public.is_active_account() and exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid() and m.status not in ('submitted','approved')))
with check (public.is_active_account() and exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid() and m.status not in ('submitted','approved')));

drop policy if exists "Testers delete own feedback attachments" on public.feedback_attachments;
create policy "Testers delete own feedback attachments" on public.feedback_attachments for delete to authenticated
using (exists(select 1 from public.feedback_reports f join public.campaign_members m on m.id=f.campaign_member_id where f.id=feedback_report_id and m.tester_id=auth.uid() and m.status not in ('submitted','approved')));

drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports for insert to authenticated
with check (reporter_id=auth.uid() and public.is_active_account());

grant execute on function public.process_due_feedback_approvals() to service_role;
