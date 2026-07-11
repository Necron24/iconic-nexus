-- Iconic Nexus testing sessions, feedback review, attachments and atomic credit awards

alter table public.feedback_reports add column if not exists review_note text;
alter table public.feedback_reports add column if not exists reviewed_at timestamptz;
alter table public.feedback_reports add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-media','feedback-media',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/png','image/jpeg','image/webp'];

drop policy if exists "Testers insert own sessions" on public.test_sessions;
create policy "Testers insert own sessions" on public.test_sessions for insert to authenticated with check (exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid()));
drop policy if exists "Testers and owners view sessions" on public.test_sessions;
create policy "Testers and owners view sessions" on public.test_sessions for select to authenticated using (exists(select 1 from public.campaign_members m join public.testing_campaigns c on c.id=m.campaign_id join public.projects p on p.id=c.project_id where m.id=campaign_member_id and (m.tester_id=auth.uid() or p.owner_id=auth.uid())));

drop policy if exists "Testers create own feedback" on public.feedback_reports;
create policy "Testers create own feedback" on public.feedback_reports for insert to authenticated with check (exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid()));
drop policy if exists "Testers and owners view feedback" on public.feedback_reports;
create policy "Testers and owners view feedback" on public.feedback_reports for select to authenticated using (exists(select 1 from public.campaign_members m join public.testing_campaigns c on c.id=m.campaign_id join public.projects p on p.id=c.project_id where m.id=campaign_member_id and (m.tester_id=auth.uid() or p.owner_id=auth.uid())));
drop policy if exists "Testers delete unsubmitted feedback" on public.feedback_reports;
create policy "Testers delete unsubmitted feedback" on public.feedback_reports for delete to authenticated using (exists(select 1 from public.campaign_members m where m.id=campaign_member_id and m.tester_id=auth.uid() and m.status not in ('submitted','approved')));

drop policy if exists "Feedback attachments visible to participants" on public.feedback_attachments;
create policy "Feedback attachments visible to participants" on public.feedback_attachments for select to authenticated using (exists(select 1 from public.feedback_reports f join public.campaign_members m on m.id=f.campaign_member_id join public.testing_campaigns c on c.id=m.campaign_id join public.projects p on p.id=c.project_id where f.id=feedback_report_id and (m.tester_id=auth.uid() or p.owner_id=auth.uid())));
drop policy if exists "Testers add own feedback attachments" on public.feedback_attachments;
create policy "Testers add own feedback attachments" on public.feedback_attachments for insert to authenticated with check (exists(select 1 from public.feedback_reports f join public.campaign_members m on m.id=f.campaign_member_id where f.id=feedback_report_id and m.tester_id=auth.uid()));

drop policy if exists "Testers update own membership progress" on public.campaign_members;
create policy "Testers update own membership progress" on public.campaign_members for update to authenticated using (tester_id=auth.uid()) with check (tester_id=auth.uid());

drop policy if exists "Users upload own feedback media" on storage.objects;
create policy "Users upload own feedback media" on storage.objects for insert to authenticated with check (bucket_id='feedback-media' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "Feedback media public read" on storage.objects;
create policy "Feedback media public read" on storage.objects for select using (bucket_id='feedback-media');
drop policy if exists "Users delete own feedback media" on storage.objects;
create policy "Users delete own feedback media" on storage.objects for delete to authenticated using (bucket_id='feedback-media' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.review_testing_feedback(p_member_id uuid, p_approve boolean, p_review_note text default null)
returns text language plpgsql security definer set search_path=public as $$
declare v_owner uuid:=auth.uid(); v_member public.campaign_members%rowtype; v_campaign public.testing_campaigns%rowtype; v_project public.projects%rowtype;
begin
 if v_owner is null then raise exception 'Please log in.'; end if;
 select * into v_member from public.campaign_members where id=p_member_id for update;
 if not found then raise exception 'Testing membership not found.'; end if;
 select * into v_campaign from public.testing_campaigns where id=v_member.campaign_id;
 select * into v_project from public.projects where id=v_campaign.project_id;
 if v_project.owner_id<>v_owner then raise exception 'You do not own this campaign.'; end if;
 if v_member.status<>'submitted' then raise exception 'This report is not awaiting review.'; end if;
 update public.feedback_reports set review_note=p_review_note,reviewed_at=now(),reviewed_by=v_owner where campaign_member_id=p_member_id;
 if p_approve then
   update public.campaign_members set status='approved',approved_at=now() where id=p_member_id;
   if v_campaign.reward_credits>0 and not exists(select 1 from public.credit_transactions where profile_id=v_member.tester_id and transaction_type='test_reward' and reference_id=p_member_id) then
     update public.profiles set credits=credits+v_campaign.reward_credits,updated_at=now() where id=v_member.tester_id;
     insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note) values(v_member.tester_id,v_campaign.reward_credits,'test_reward',p_member_id,'Approved testing campaign feedback');
   end if;
   return 'approved';
 else
   update public.campaign_members set status='in_progress',submitted_at=null where id=p_member_id;
   return 'changes_requested';
 end if;
end;$$;
grant execute on function public.review_testing_feedback(uuid,boolean,text) to authenticated;
