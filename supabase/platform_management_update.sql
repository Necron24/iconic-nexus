-- Iconic Nexus platform management, notifications and campaign quality update

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general',
  title text not null,
  message text not null,
  link_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_profile_created_idx on public.notifications(profile_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "Users view own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications for select to authenticated using (profile_id=auth.uid());
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update to authenticated using (profile_id=auth.uid()) with check (profile_id=auth.uid());
drop policy if exists "Authenticated system inserts notifications" on public.notifications;
create policy "Authenticated system inserts notifications" on public.notifications for insert to authenticated with check (true);

create or replace function public.join_testing_campaign(p_campaign_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare v_user_id uuid:=auth.uid();v_campaign public.testing_campaigns%rowtype;v_owner_id uuid;v_member_count integer;v_project_name text;
begin
 if v_user_id is null then raise exception 'Please log in to join this campaign.';end if;
 select * into v_campaign from public.testing_campaigns where id=p_campaign_id for update;if not found then raise exception 'Campaign not found.';end if;
 select owner_id,name into v_owner_id,v_project_name from public.projects where id=v_campaign.project_id;
 if v_owner_id=v_user_id then raise exception 'You cannot join a campaign for your own project.';end if;
 if v_campaign.status<>'active' then raise exception 'This campaign is not active.';end if;
 if v_campaign.ends_at is not null and v_campaign.ends_at<=now() then raise exception 'This campaign has ended.';end if;
 if exists(select 1 from public.campaign_members where campaign_id=p_campaign_id and tester_id=v_user_id) then return 'already_joined';end if;
 select count(*) into v_member_count from public.campaign_members where campaign_id=p_campaign_id;
 if v_member_count>=v_campaign.tester_goal then raise exception 'This campaign has reached its tester goal.';end if;
 insert into public.campaign_members(campaign_id,tester_id,status) values(p_campaign_id,v_user_id,'joined');
 insert into public.notifications(profile_id,type,title,message,link_url) values(v_owner_id,'campaign_join','New tester joined',coalesce((select display_name from public.profiles where id=v_user_id),(select username from public.profiles where id=v_user_id),'A tester')||' joined '||v_campaign.title,'/dashboard/projects/'||v_campaign.project_id||'/campaigns/'||v_campaign.id||'/manage');
 return 'joined';
end;$$;
grant execute on function public.join_testing_campaign(uuid) to authenticated;

create or replace function public.review_testing_feedback(p_member_id uuid,p_approve boolean,p_review_note text default null)
returns text language plpgsql security definer set search_path=public as $$
declare v_owner uuid:=auth.uid();v_member public.campaign_members%rowtype;v_campaign public.testing_campaigns%rowtype;v_project public.projects%rowtype;v_approved_count integer;
begin
 if v_owner is null then raise exception 'Please log in.';end if;
 select * into v_member from public.campaign_members where id=p_member_id for update;if not found then raise exception 'Testing membership not found.';end if;
 select * into v_campaign from public.testing_campaigns where id=v_member.campaign_id;select * into v_project from public.projects where id=v_campaign.project_id;
 if v_project.owner_id<>v_owner then raise exception 'You do not own this campaign.';end if;if v_member.status<>'submitted' then raise exception 'This report is not awaiting review.';end if;
 update public.feedback_reports set review_note=p_review_note,reviewed_at=now(),reviewed_by=v_owner where campaign_member_id=p_member_id;
 if p_approve then
   update public.campaign_members set status='approved',approved_at=now() where id=p_member_id;
   if v_campaign.reward_credits>0 and not exists(select 1 from public.credit_transactions where profile_id=v_member.tester_id and transaction_type='test_reward' and reference_id=p_member_id) then
     update public.profiles set credits=credits+v_campaign.reward_credits,updated_at=now() where id=v_member.tester_id;
     insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note) values(v_member.tester_id,v_campaign.reward_credits,'test_reward',p_member_id,'Approved feedback: '||v_campaign.title);
   end if;
   select count(*) into v_approved_count from public.campaign_members where tester_id=v_member.tester_id and status='approved';
   update public.profiles set tester_reputation=least(5.0,3.5+(least(v_approved_count,10)*0.15)),updated_at=now() where id=v_member.tester_id;
   insert into public.notifications(profile_id,type,title,message,link_url) values(v_member.tester_id,'feedback_approved','Feedback approved','Your feedback for '||v_campaign.title||' was approved. You earned '||v_campaign.reward_credits||' credits.','/dashboard/credits');
   return 'approved';
 else
   update public.campaign_members set status='in_progress',submitted_at=null where id=p_member_id;
   insert into public.notifications(profile_id,type,title,message,link_url) values(v_member.tester_id,'changes_requested','Changes requested','The developer requested changes to your feedback for '||v_campaign.title||coalesce('. Note: '||nullif(p_review_note,''),'.'),'/dashboard/testing/'||p_member_id);
   return 'changes_requested';
 end if;
end;$$;
grant execute on function public.review_testing_feedback(uuid,boolean,text) to authenticated;
