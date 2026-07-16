begin;

create table if not exists public.credit_packs (
  code text primary key,
  name text not null,
  credits integer not null check (credits > 0),
  price_zar numeric(10,2) not null check (price_zar > 0),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.credit_packs(code,name,credits,price_zar,description,sort_order) values
('starter_100','Starter',100,49.00,'Enough for a small campaign or a quick boost.',10),
('builder_250','Builder',250,99.00,'Better value for active indie developers.',20),
('studio_600','Studio',600,199.00,'Run larger campaigns and promote releases.',30),
('power_1500','Power',1500,399.00,'Best value for frequent campaigns and boosts.',40)
on conflict (code) do update set name=excluded.name,credits=excluded.credits,price_zar=excluded.price_zar,description=excluded.description,sort_order=excluded.sort_order;

create table if not exists public.credit_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  pack_code text not null references public.credit_packs(code),
  credits integer not null check (credits > 0),
  amount_zar numeric(10,2) not null check (amount_zar > 0),
  status text not null default 'pending' check (status in ('pending','complete','failed','cancelled','refunded')),
  payfast_payment_id text unique,
  raw_payload jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists credit_purchase_orders_profile_idx on public.credit_purchase_orders(profile_id,created_at desc);

create table if not exists public.boost_products (
  code text primary key,
  name text not null,
  description text not null,
  target_type text not null check (target_type in ('project','campaign','devlog')),
  cost_credits integer not null check (cost_credits > 0),
  duration_hours integer not null check (duration_hours between 1 and 720),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.boost_products(code,name,description,target_type,cost_credits,duration_hours) values
('campaign_24h','Urgent campaign boost','Prioritises an active testing campaign in relevant campaign feeds.','campaign',25,24),
('project_3d','Project spotlight','Promotes a published project in relevant discovery feeds.','project',60,72),
('project_7d','Featured project','Longer featured placement for a published project.','project',150,168),
('devlog_24h','Promoted update','Highlights a published devlog or release update.','devlog',20,24)
on conflict (code) do update set name=excluded.name,description=excluded.description,target_type=excluded.target_type,cost_credits=excluded.cost_credits,duration_hours=excluded.duration_hours;

create table if not exists public.content_boosts (
  id uuid primary key default gen_random_uuid(),
  purchaser_id uuid not null references public.profiles(id) on delete cascade,
  boost_code text not null references public.boost_products(code),
  target_type text not null check (target_type in ('project','campaign','devlog')),
  target_id uuid not null,
  cost_credits integer not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','cancelled','refunded')),
  created_at timestamptz not null default now()
);
create index if not exists content_boosts_active_idx on public.content_boosts(target_type,target_id,ends_at) where status='active';
create unique index if not exists content_boosts_one_active_target_idx on public.content_boosts(target_type,target_id) where status='active';

alter table public.credit_packs enable row level security;
alter table public.credit_purchase_orders enable row level security;
alter table public.boost_products enable row level security;
alter table public.content_boosts enable row level security;

drop policy if exists "Public can read active credit packs" on public.credit_packs;
create policy "Public can read active credit packs" on public.credit_packs for select using (active=true);
drop policy if exists "Users can read own purchase orders" on public.credit_purchase_orders;
create policy "Users can read own purchase orders" on public.credit_purchase_orders for select using (profile_id=auth.uid());
drop policy if exists "Public can read active boost products" on public.boost_products;
create policy "Public can read active boost products" on public.boost_products for select using (active=true);
drop policy if exists "Users can read own boosts" on public.content_boosts;
create policy "Users can read own boosts" on public.content_boosts for select using (purchaser_id=auth.uid());
drop policy if exists "Public can read current active boosts" on public.content_boosts;
create policy "Public can read current active boosts" on public.content_boosts for select using (status='active' and ends_at>now());

create or replace function public.create_credit_purchase_order(p_pack_code text)
returns table(order_id uuid,pack_code text,pack_name text,credits integer,amount_zar numeric)
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_pack public.credit_packs%rowtype; v_order uuid;
begin
 if v_user is null then raise exception 'Authentication required.'; end if;
 if not exists(select 1 from public.profiles where id=v_user and coalesce(account_status,'active')='active') then raise exception 'Your account is restricted.'; end if;
 select * into v_pack from public.credit_packs where code=p_pack_code and active=true;
 if not found then raise exception 'Credit pack is unavailable.'; end if;
 insert into public.credit_purchase_orders(profile_id,pack_code,credits,amount_zar) values(v_user,v_pack.code,v_pack.credits,v_pack.price_zar) returning id into v_order;
 return query select v_order,v_pack.code,v_pack.name,v_pack.credits,v_pack.price_zar;
end $$;

create or replace function public.complete_credit_purchase(p_order_id uuid,p_payfast_payment_id text,p_paid_amount numeric,p_raw_payload jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_order public.credit_purchase_orders%rowtype;
begin
 select * into v_order from public.credit_purchase_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found.'; end if;
 if v_order.status='complete' then return; end if;
 if v_order.status<>'pending' then raise exception 'Order is not pending.'; end if;
 if abs(v_order.amount_zar-p_paid_amount)>0.01 then raise exception 'Payment amount mismatch.'; end if;
 if exists(select 1 from public.credit_purchase_orders where payfast_payment_id=p_payfast_payment_id and id<>p_order_id) then raise exception 'Payment reference already used.'; end if;
 update public.credit_purchase_orders set status='complete',payfast_payment_id=p_payfast_payment_id,raw_payload=p_raw_payload,completed_at=now(),updated_at=now() where id=p_order_id;
 update public.profiles set credits=credits+v_order.credits,updated_at=now() where id=v_order.profile_id;
 insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note) values(v_order.profile_id,v_order.credits,'credit_purchase',v_order.id,'Purchased '||v_order.credits||' Nexus Credits');
end $$;

create or replace function public.purchase_content_boost(p_boost_code text,p_target_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_product public.boost_products%rowtype; v_balance integer; v_id uuid; v_owned boolean:=false;
begin
 if v_user is null then raise exception 'Authentication required.'; end if;
 select * into v_product from public.boost_products where code=p_boost_code and active=true;
 if not found then raise exception 'Boost is unavailable.'; end if;
 if v_product.target_type='project' then select exists(select 1 from public.projects where id=p_target_id and owner_id=v_user and is_published=true and moderation_status='visible') into v_owned;
 elsif v_product.target_type='campaign' then select exists(select 1 from public.testing_campaigns c join public.projects p on p.id=c.project_id where c.id=p_target_id and p.owner_id=v_user and c.status in ('active','paused')) into v_owned;
 elsif v_product.target_type='devlog' then select exists(select 1 from public.project_updates u join public.projects p on p.id=u.project_id where u.id=p_target_id and p.owner_id=v_user and u.is_published=true) into v_owned;
 end if;
 if not v_owned then raise exception 'You cannot boost this item.'; end if;
 update public.content_boosts set status='expired' where status='active' and ends_at<=now();
 if exists(select 1 from public.content_boosts where target_type=v_product.target_type and target_id=p_target_id and status='active' and ends_at>now()) then raise exception 'This item already has an active boost.'; end if;
 select credits into v_balance from public.profiles where id=v_user for update;
 if coalesce(v_balance,0)<v_product.cost_credits then raise exception 'Not enough Nexus Credits.'; end if;
 update public.profiles set credits=credits-v_product.cost_credits,updated_at=now() where id=v_user;
 insert into public.content_boosts(purchaser_id,boost_code,target_type,target_id,cost_credits,ends_at) values(v_user,v_product.code,v_product.target_type,p_target_id,v_product.cost_credits,now()+make_interval(hours=>v_product.duration_hours)) returning id into v_id;
 insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note) values(v_user,-v_product.cost_credits,'boost_purchase',v_id,v_product.name);
 return v_id;
end $$;

revoke all on function public.create_credit_purchase_order(text) from public;
grant execute on function public.create_credit_purchase_order(text) to authenticated;
revoke all on function public.complete_credit_purchase(uuid,text,numeric,jsonb) from public,anon,authenticated;
grant execute on function public.complete_credit_purchase(uuid,text,numeric,jsonb) to service_role;
revoke all on function public.purchase_content_boost(text,uuid) from public;
grant execute on function public.purchase_content_boost(text,uuid) to authenticated;

commit;
