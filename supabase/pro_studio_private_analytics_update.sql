begin;

create table if not exists public.subscription_plans (
  code text primary key,
  name text not null,
  monthly_price_zar numeric(10,2) not null default 0,
  active_campaign_limit integer not null,
  private_campaigns boolean not null default false,
  team_member_limit integer not null default 1,
  monthly_bonus_credits integer not null default 0,
  advanced_analytics boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans
(code,name,monthly_price_zar,active_campaign_limit,private_campaigns,team_member_limit,monthly_bonus_credits,advanced_analytics,sort_order)
values
('free','Free',0,1,false,1,0,false,10),
('pro','Iconic Nexus Pro',99,5,true,1,100,true,20),
('studio','Iconic Nexus Studio',249,20,true,8,300,true,30)
on conflict (code) do update set
name=excluded.name, monthly_price_zar=excluded.monthly_price_zar,
active_campaign_limit=excluded.active_campaign_limit, private_campaigns=excluded.private_campaigns,
team_member_limit=excluded.team_member_limit, monthly_bonus_credits=excluded.monthly_bonus_credits,
advanced_analytics=excluded.advanced_analytics, sort_order=excluded.sort_order;

create table if not exists public.profile_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  plan_code text not null default 'free' references public.subscription_plans(code),
  status text not null default 'active' check (status in ('active','past_due','paused','cancelled')),
  payfast_token text unique,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_bonus_period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profile_subscriptions(profile_id,plan_code,status)
select id,'free','active' from public.profiles
on conflict (profile_id) do nothing;

create table if not exists public.subscription_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  amount_zar numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending','complete','failed','cancelled','refunded')),
  payfast_payment_id text unique,
  payfast_token text,
  raw_payload jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin','developer','reviewer','viewer')),
  status text not null default 'active' check (status in ('active','invited','removed')),
  invited_email text,
  created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

alter table public.testing_campaigns add column if not exists is_private boolean not null default false;
alter table public.testing_campaigns add column if not exists access_code text;
alter table public.testing_campaigns add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.subscription_plans enable row level security;
alter table public.profile_subscriptions enable row level security;
alter table public.subscription_purchase_orders enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "Public reads plans" on public.subscription_plans;
create policy "Public reads plans" on public.subscription_plans for select using (active=true);
drop policy if exists "Users read own subscription" on public.profile_subscriptions;
create policy "Users read own subscription" on public.profile_subscriptions for select using (profile_id=auth.uid());
drop policy if exists "Users read own subscription orders" on public.subscription_purchase_orders;
create policy "Users read own subscription orders" on public.subscription_purchase_orders for select using (profile_id=auth.uid());
drop policy if exists "Organization members can read organization" on public.organizations;
create policy "Organization members can read organization" on public.organizations for select using (
 owner_id=auth.uid() or exists(select 1 from public.organization_members m where m.organization_id=id and m.profile_id=auth.uid() and m.status='active')
);
drop policy if exists "Organization members can read memberships" on public.organization_members;
create policy "Organization members can read memberships" on public.organization_members for select using (
 profile_id=auth.uid() or exists(select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid())
);

create or replace function public.current_plan(p_profile_id uuid default auth.uid())
returns table(plan_code text,plan_name text,active_campaign_limit integer,private_campaigns boolean,team_member_limit integer,monthly_bonus_credits integer,advanced_analytics boolean,status text,current_period_end timestamptz)
language sql stable security definer set search_path=public as $$
 select p.code,p.name,p.active_campaign_limit,p.private_campaigns,p.team_member_limit,p.monthly_bonus_credits,p.advanced_analytics,
        coalesce(s.status,'active'),s.current_period_end
 from public.subscription_plans p
 left join public.profile_subscriptions s on s.plan_code=p.code and s.profile_id=p_profile_id
 where p.code=coalesce((select plan_code from public.profile_subscriptions where profile_id=p_profile_id),'free')
 limit 1
$$;

create or replace function public.create_subscription_order(p_plan_code text)
returns table(order_id uuid,plan_code text,plan_name text,amount_zar numeric)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_plan public.subscription_plans%rowtype; v_id uuid;
begin
 if v_user is null then raise exception 'Authentication required.'; end if;
 select * into v_plan from public.subscription_plans where code=p_plan_code and active=true and monthly_price_zar>0;
 if not found then raise exception 'Subscription plan is unavailable.'; end if;
 insert into public.subscription_purchase_orders(profile_id,plan_code,amount_zar) values(v_user,v_plan.code,v_plan.monthly_price_zar) returning id into v_id;
 return query select v_id,v_plan.code,v_plan.name,v_plan.monthly_price_zar;
end $$;

create or replace function public.complete_subscription_purchase(p_order_id uuid,p_payfast_payment_id text,p_payfast_token text,p_paid_amount numeric,p_raw_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.subscription_purchase_orders%rowtype; v_bonus integer; v_period text:=to_char(now(),'YYYY-MM');
begin
 select * into v_order from public.subscription_purchase_orders where id=p_order_id for update;
 if not found then raise exception 'Subscription order not found.'; end if;
 if v_order.status='complete' then return; end if;
 if abs(v_order.amount_zar-p_paid_amount)>0.01 then raise exception 'Payment amount mismatch.'; end if;
 update public.subscription_purchase_orders set status='complete',payfast_payment_id=p_payfast_payment_id,payfast_token=p_payfast_token,raw_payload=p_raw_payload,completed_at=now(),updated_at=now() where id=p_order_id;
 insert into public.profile_subscriptions(profile_id,plan_code,status,payfast_token,current_period_start,current_period_end,last_bonus_period)
 values(v_order.profile_id,v_order.plan_code,'active',nullif(p_payfast_token,''),now(),now()+interval '1 month',v_period)
 on conflict(profile_id) do update set plan_code=excluded.plan_code,status='active',payfast_token=coalesce(excluded.payfast_token,profile_subscriptions.payfast_token),current_period_start=now(),current_period_end=now()+interval '1 month',cancel_at_period_end=false,last_bonus_period=v_period,updated_at=now();
 select monthly_bonus_credits into v_bonus from public.subscription_plans where code=v_order.plan_code;
 if coalesce(v_bonus,0)>0 then
   update public.profiles set credits=credits+v_bonus,updated_at=now() where id=v_order.profile_id;
   insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note) values(v_order.profile_id,v_bonus,'subscription_bonus',v_order.id,v_order.plan_code||' monthly bonus credits');
 end if;
end $$;

create or replace function public.set_campaign_privacy(p_campaign_id uuid,p_is_private boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_allowed boolean;
begin
 select cp.private_campaigns into v_allowed from public.current_plan(v_user) cp;
 if p_is_private and not coalesce(v_allowed,false) then raise exception 'Private campaigns require Pro or Studio.'; end if;
 update public.testing_campaigns c set is_private=p_is_private,access_code=case when p_is_private then coalesce(c.access_code,upper(substr(md5(random()::text),1,8))) else null end
 where c.id=p_campaign_id and exists(select 1 from public.projects p where p.id=c.project_id and p.owner_id=v_user);
 if not found then raise exception 'Campaign not found.'; end if;
end $$;

create or replace function public.create_organization(p_name text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_limit integer; v_id uuid; v_slug text;
begin
 select team_member_limit into v_limit from public.current_plan(v_user);
 if coalesce(v_limit,1)<=1 then raise exception 'Studio is required for team workspaces.'; end if;
 if exists(select 1 from public.organizations where owner_id=v_user) then raise exception 'You already own a workspace.'; end if;
 v_slug:=regexp_replace(lower(trim(p_name)),'[^a-z0-9]+','-','g')||'-'||substr(md5(random()::text),1,5);
 insert into public.organizations(owner_id,name,slug) values(v_user,trim(p_name),v_slug) returning id into v_id;
 insert into public.organization_members(organization_id,profile_id,role,status) values(v_id,v_user,'owner','active');
 return v_id;
end $$;

create or replace function public.add_organization_member(p_organization_id uuid,p_email text,p_role text)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_target uuid; v_limit integer; v_count integer;
begin
 if p_role not in ('admin','developer','reviewer','viewer') then raise exception 'Invalid role.'; end if;
 if not exists(select 1 from public.organizations where id=p_organization_id and owner_id=v_user) then raise exception 'Only the workspace owner can add members.'; end if;
 select cp.team_member_limit into v_limit from public.current_plan(v_user) cp;
 select count(*) into v_count from public.organization_members where organization_id=p_organization_id and status='active';
 if v_count>=coalesce(v_limit,1) then raise exception 'Your plan team-member limit has been reached.'; end if;
 select id into v_target from public.profiles where lower(email)=lower(trim(p_email));
 if v_target is null then raise exception 'That email does not have an Iconic Nexus account yet.'; end if;
 insert into public.organization_members(organization_id,profile_id,role,status,invited_email) values(p_organization_id,v_target,p_role,'active',lower(trim(p_email)))
 on conflict(organization_id,profile_id) do update set role=excluded.role,status='active',invited_email=excluded.invited_email;
end $$;

create or replace function public.get_developer_analytics()
returns table(projects bigint,active_campaigns bigint,approved_tests bigint,total_views bigint,credits_spent bigint,average_rating numeric)
language sql stable security definer set search_path=public as $$
 with mine as (select id from public.projects where owner_id=auth.uid()),
 camps as (select c.* from public.testing_campaigns c join mine p on p.id=c.project_id),
 members as (select m.* from public.campaign_members m join camps c on c.id=m.campaign_id)
 select
  (select count(*) from mine),
  (select count(*) from camps where status='active' and (ends_at is null or ends_at>now())),
  (select count(*) from members where status='approved'),
  0::bigint,
  coalesce((select sum(spent_credits)::bigint from camps),0),
  coalesce((select round(avg(r.overall_rating)::numeric,2) from public.feedback_reports r join members m on m.id=r.campaign_member_id where m.status='approved'),0)
$$;

revoke all on function public.current_plan(uuid) from public;
grant execute on function public.current_plan(uuid) to authenticated;
revoke all on function public.create_subscription_order(text) from public;
grant execute on function public.create_subscription_order(text) to authenticated;
revoke all on function public.set_campaign_privacy(uuid,boolean) from public;
grant execute on function public.set_campaign_privacy(uuid,boolean) to authenticated;
revoke all on function public.create_organization(text) from public;
grant execute on function public.create_organization(text) to authenticated;
revoke all on function public.add_organization_member(uuid,text,text) from public;
grant execute on function public.add_organization_member(uuid,text,text) to authenticated;
revoke all on function public.get_developer_analytics() from public;
grant execute on function public.get_developer_analytics() to authenticated;

commit;
