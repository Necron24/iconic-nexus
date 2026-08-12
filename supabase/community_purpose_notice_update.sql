begin;

alter table public.profiles
  add column if not exists community_notice_acknowledged_at timestamptz;

create or replace function public.acknowledge_community_purpose_notice()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  update public.profiles
  set community_notice_acknowledged_at = coalesce(community_notice_acknowledged_at, now()),
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.acknowledge_community_purpose_notice() from public;
grant execute on function public.acknowledge_community_purpose_notice() to authenticated;

commit;
