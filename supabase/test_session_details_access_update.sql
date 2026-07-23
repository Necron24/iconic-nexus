-- Iconic Nexus: allow administrators to inspect test sessions during disputes.
-- Testers and project owners retain their existing access.

begin;

drop policy if exists "Testers and owners view sessions" on public.test_sessions;
drop policy if exists "Testers owners and admins view sessions" on public.test_sessions;

create policy "Testers owners and admins view sessions"
on public.test_sessions
for select
to authenticated
using (
  exists (
    select 1
    from public.campaign_members m
    join public.testing_campaigns c on c.id = m.campaign_id
    join public.projects p on p.id = c.project_id
    where m.id = test_sessions.campaign_member_id
      and (
        m.tester_id = auth.uid()
        or p.owner_id = auth.uid()
        or exists (
          select 1
          from public.profiles viewer
          where viewer.id = auth.uid()
            and viewer.is_admin = true
        )
      )
  )
);

commit;
