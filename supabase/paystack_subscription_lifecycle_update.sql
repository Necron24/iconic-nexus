begin;

alter table public.profile_subscriptions
  add column if not exists paystack_customer_code text,
  add column if not exists paystack_subscription_code text,
  add column if not exists paystack_email_token text,
  add column if not exists next_payment_date timestamptz,
  add column if not exists last_payment_reference text;

create unique index if not exists profile_subscriptions_paystack_subscription_code_key
  on public.profile_subscriptions(paystack_subscription_code)
  where paystack_subscription_code is not null;

create table if not exists public.subscription_payment_events (
  reference text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  subscription_code text,
  event_type text not null,
  amount_zar numeric(10,2),
  status text not null default 'processed',
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.subscription_payment_events enable row level security;

create table if not exists public.paystack_webhook_events (
  event_key text primary key,
  event_type text not null,
  payment_reference text,
  status text not null default 'received',
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.paystack_webhook_events enable row level security;

drop policy if exists "Users read own subscription payment events" on public.subscription_payment_events;
create policy "Users read own subscription payment events"
  on public.subscription_payment_events for select
  using (profile_id = auth.uid());

create or replace function public.complete_subscription_purchase(
  p_order_id uuid,
  p_payfast_payment_id text,
  p_payfast_token text,
  p_paid_amount numeric,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_order public.subscription_purchase_orders%rowtype;
  v_bonus integer;
  v_period text:=to_char(now(),'YYYY-MM');
begin
  select * into v_order from public.subscription_purchase_orders where id=p_order_id for update;
  if not found then raise exception 'Subscription order not found.'; end if;
  if v_order.status='complete' then return; end if;
  if abs(v_order.amount_zar-p_paid_amount)>0.01 then raise exception 'Payment amount mismatch.'; end if;

  update public.subscription_purchase_orders
    set status='complete',
        payfast_payment_id=p_payfast_payment_id,
        payfast_token=p_payfast_token,
        raw_payload=p_raw_payload,
        completed_at=now(),
        updated_at=now()
    where id=p_order_id;

  insert into public.profile_subscriptions(
    profile_id,plan_code,status,payfast_token,paystack_customer_code,
    current_period_start,current_period_end,last_bonus_period,last_payment_reference
  )
  values(
    v_order.profile_id,v_order.plan_code,'active',nullif(p_payfast_token,''),
    nullif(p_payfast_token,''),now(),now()+interval '1 month',v_period,p_payfast_payment_id
  )
  on conflict(profile_id) do update set
    plan_code=excluded.plan_code,
    status='active',
    payfast_token=coalesce(excluded.payfast_token,profile_subscriptions.payfast_token),
    paystack_customer_code=coalesce(excluded.paystack_customer_code,profile_subscriptions.paystack_customer_code),
    current_period_start=now(),
    current_period_end=now()+interval '1 month',
    cancel_at_period_end=false,
    last_bonus_period=v_period,
    last_payment_reference=p_payfast_payment_id,
    updated_at=now();

  insert into public.subscription_payment_events(
    reference,profile_id,event_type,amount_zar,raw_payload
  )
  values(p_payfast_payment_id,v_order.profile_id,'initial_payment',p_paid_amount,p_raw_payload)
  on conflict(reference) do nothing;

  select monthly_bonus_credits into v_bonus
    from public.subscription_plans where code=v_order.plan_code;
  if coalesce(v_bonus,0)>0 then
    update public.profiles set credits=credits+v_bonus,updated_at=now()
      where id=v_order.profile_id;
    insert into public.credit_transactions(
      profile_id,amount,transaction_type,reference_id,note
    )
    values(
      v_order.profile_id,v_bonus,'subscription_bonus',v_order.id,
      v_order.plan_code||' monthly bonus credits'
    );
  end if;
end $$;

create or replace function public.link_paystack_subscription(
  p_customer_code text,
  p_subscription_code text,
  p_email_token text,
  p_next_payment_date timestamptz,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare v_profile_id uuid;
begin
  select profile_id into v_profile_id
    from public.profile_subscriptions
    where paystack_customer_code=p_customer_code or payfast_token=p_customer_code
    order by updated_at desc limit 1;
  if v_profile_id is null then raise exception 'Subscription customer not found.'; end if;

  update public.profile_subscriptions set
    paystack_customer_code=p_customer_code,
    paystack_subscription_code=p_subscription_code,
    paystack_email_token=p_email_token,
    next_payment_date=p_next_payment_date,
    status='active',
    updated_at=now()
  where profile_id=v_profile_id;

  insert into public.subscription_payment_events(
    reference,profile_id,subscription_code,event_type,raw_payload
  )
  values(
    'subscription-create:'||p_subscription_code,v_profile_id,p_subscription_code,
    'subscription.create',p_raw_payload
  )
  on conflict(reference) do nothing;
end $$;

create or replace function public.complete_subscription_renewal(
  p_customer_code text,
  p_subscription_code text,
  p_reference text,
  p_paid_amount numeric,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_subscription public.profile_subscriptions%rowtype;
  v_expected numeric;
  v_bonus integer;
  v_event_inserted integer;
begin
  select * into v_subscription
    from public.profile_subscriptions
    where paystack_subscription_code=p_subscription_code
       or paystack_customer_code=p_customer_code
       or payfast_token=p_customer_code
    order by updated_at desc limit 1 for update;
  if not found then raise exception 'Subscription customer not found.'; end if;

  select monthly_price_zar,monthly_bonus_credits into v_expected,v_bonus
    from public.subscription_plans where code=v_subscription.plan_code;
  if abs(v_expected-p_paid_amount)>0.01 then raise exception 'Renewal amount mismatch.'; end if;

  insert into public.subscription_payment_events(
    reference,profile_id,subscription_code,event_type,amount_zar,raw_payload
  )
  values(
    p_reference,v_subscription.profile_id,p_subscription_code,
    'renewal_payment',p_paid_amount,p_raw_payload
  )
  on conflict(reference) do nothing;
  get diagnostics v_event_inserted = row_count;
  if v_event_inserted=0 then return; end if;

  update public.profile_subscriptions set
    status='active',
    paystack_customer_code=coalesce(nullif(p_customer_code,''),paystack_customer_code),
    paystack_subscription_code=coalesce(nullif(p_subscription_code,''),paystack_subscription_code),
    current_period_start=coalesce(p_period_start,now()),
    current_period_end=coalesce(p_period_end,now()+interval '1 month'),
    next_payment_date=coalesce(p_period_end,now()+interval '1 month'),
    cancel_at_period_end=false,
    last_bonus_period=to_char(coalesce(p_period_start,now()),'YYYY-MM'),
    last_payment_reference=p_reference,
    updated_at=now()
  where profile_id=v_subscription.profile_id;

  if coalesce(v_bonus,0)>0 then
    update public.profiles set credits=credits+v_bonus,updated_at=now()
      where id=v_subscription.profile_id;
    insert into public.credit_transactions(
      profile_id,amount,transaction_type,note
    )
    values(
      v_subscription.profile_id,v_bonus,'subscription_bonus',
      v_subscription.plan_code||' renewal bonus credits'
    );
  end if;
end $$;

create or replace function public.mark_subscription_event(
  p_subscription_code text,
  p_customer_code text,
  p_event_type text,
  p_event_reference text,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare v_subscription public.profile_subscriptions%rowtype;
begin
  select * into v_subscription
    from public.profile_subscriptions
    where paystack_subscription_code=p_subscription_code
       or paystack_customer_code=p_customer_code
       or payfast_token=p_customer_code
    order by updated_at desc limit 1 for update;
  if not found then raise exception 'Subscription customer not found.'; end if;

  insert into public.subscription_payment_events(
    reference,profile_id,subscription_code,event_type,status,raw_payload
  )
  values(
    p_event_reference,v_subscription.profile_id,p_subscription_code,
    p_event_type,'processed',p_raw_payload
  )
  on conflict(reference) do nothing;

  if p_event_type='invoice.payment_failed' then
    update public.profile_subscriptions set status='past_due',updated_at=now()
      where profile_id=v_subscription.profile_id;
  elsif p_event_type='subscription.not_renew' then
    update public.profile_subscriptions set cancel_at_period_end=true,updated_at=now()
      where profile_id=v_subscription.profile_id;
  elsif p_event_type='subscription.disable' then
    update public.profile_subscriptions set
      plan_code='free',status='cancelled',cancel_at_period_end=false,
      current_period_end=now(),next_payment_date=null,updated_at=now()
      where profile_id=v_subscription.profile_id;
  end if;
end $$;

create or replace function public.process_paystack_reversal(
  p_payment_reference text,
  p_event_key text,
  p_event_type text,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_credit_order public.credit_purchase_orders%rowtype;
  v_subscription_order public.subscription_purchase_orders%rowtype;
  v_bonus integer;
begin
  insert into public.paystack_webhook_events(
    event_key,event_type,payment_reference,status,raw_payload
  )
  values(p_event_key,p_event_type,p_payment_reference,'processing',p_raw_payload)
  on conflict(event_key) do nothing;
  if not found then return; end if;

  if p_event_type='refund.processed' then
    select * into v_credit_order
      from public.credit_purchase_orders
      where payfast_payment_id=p_payment_reference for update;
    if found and v_credit_order.status='complete' then
      update public.credit_purchase_orders
        set status='refunded',updated_at=now()
        where id=v_credit_order.id;
      update public.profiles
        set credits=credits-v_credit_order.credits,updated_at=now()
        where id=v_credit_order.profile_id;
      insert into public.credit_transactions(
        profile_id,amount,transaction_type,reference_id,note
      )
      values(
        v_credit_order.profile_id,-v_credit_order.credits,'admin_adjustment',
        v_credit_order.id,'Paystack refund: purchased credits reversed'
      );
    end if;

    select * into v_subscription_order
      from public.subscription_purchase_orders
      where payfast_payment_id=p_payment_reference for update;
    if found and v_subscription_order.status='complete' then
      update public.subscription_purchase_orders
        set status='refunded',updated_at=now()
        where id=v_subscription_order.id;
      select monthly_bonus_credits into v_bonus
        from public.subscription_plans where code=v_subscription_order.plan_code;
      if coalesce(v_bonus,0)>0 then
        update public.profiles
          set credits=credits-v_bonus,updated_at=now()
          where id=v_subscription_order.profile_id;
        insert into public.credit_transactions(
          profile_id,amount,transaction_type,reference_id,note
        )
        values(
          v_subscription_order.profile_id,-v_bonus,'admin_adjustment',
          v_subscription_order.id,'Paystack refund: subscription bonus reversed'
        );
      end if;
      update public.profile_subscriptions set
        plan_code='free',status='cancelled',cancel_at_period_end=false,
        current_period_end=now(),next_payment_date=null,updated_at=now()
        where profile_id=v_subscription_order.profile_id
          and last_payment_reference=p_payment_reference;
    end if;
  elsif p_event_type='charge.dispute.create' then
    update public.profile_subscriptions set status='past_due',updated_at=now()
      where last_payment_reference=p_payment_reference;
  end if;

  update public.paystack_webhook_events
    set status='processed',processed_at=now()
    where event_key=p_event_key;
end $$;

update public.subscription_purchase_orders
  set status='cancelled',updated_at=now()
  where status='pending' and created_at < now()-interval '24 hours';

update public.credit_purchase_orders
  set status='cancelled',updated_at=now()
  where status='pending' and created_at < now()-interval '24 hours';

revoke all on function public.link_paystack_subscription(text,text,text,timestamptz,jsonb) from public;
revoke all on function public.complete_subscription_renewal(text,text,text,numeric,timestamptz,timestamptz,jsonb) from public;
revoke all on function public.mark_subscription_event(text,text,text,text,jsonb) from public;
revoke all on function public.process_paystack_reversal(text,text,text,jsonb) from public;

commit;
