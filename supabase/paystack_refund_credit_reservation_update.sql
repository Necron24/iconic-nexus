begin;

-- A refund can take time to settle. Credits tied to that payment must stop being
-- spendable as soon as Paystack reports the refund as pending or processing.
alter table public.credit_purchase_orders
  add column if not exists refund_reserved_credits integer not null default 0,
  add column if not exists refund_reference text;

alter table public.credit_purchase_orders
  drop constraint if exists credit_purchase_orders_status_check;
alter table public.credit_purchase_orders
  add constraint credit_purchase_orders_status_check
  check (status in ('pending','complete','failed','cancelled','refund_pending','refunded'));

-- A chargeback or refund can arrive after credits have been spent. A negative
-- balance represents that debt and automatically prevents every existing spend
-- function (which already requires enough credits) from spending more.
alter table public.profiles drop constraint if exists profiles_credits_check;

create or replace function public.process_paystack_reversal(
  p_payment_reference text,
  p_event_key text,
  p_event_type text,
  p_refund_amount_zar numeric,
  p_raw_payload jsonb
)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_credit_order public.credit_purchase_orders%rowtype;
  v_subscription_order public.subscription_purchase_orders%rowtype;
  v_bonus integer;
  v_target_credits integer;
  v_delta integer;
  v_refund_reference text;
begin
  insert into public.paystack_webhook_events(
    event_key,event_type,payment_reference,status,raw_payload
  )
  values(p_event_key,p_event_type,p_payment_reference,'processing',p_raw_payload)
  on conflict(event_key) do nothing;
  if not found then return; end if;

  if p_event_type like 'refund.%' then
    select * into v_credit_order
      from public.credit_purchase_orders
      where payfast_payment_id=p_payment_reference for update;

    if found and v_credit_order.status in ('complete','refund_pending','refunded') then
      v_refund_reference := nullif(p_raw_payload->>'refund_reference','');
      v_target_credits := case
        when coalesce(p_refund_amount_zar,0) <= 0 then v_credit_order.credits
        when p_refund_amount_zar >= v_credit_order.amount_zar then v_credit_order.credits
        else greatest(1,ceil(v_credit_order.credits * p_refund_amount_zar / v_credit_order.amount_zar)::integer)
      end;
      v_delta := greatest(v_target_credits-v_credit_order.refund_reserved_credits,0);

      if p_event_type in ('refund.pending','refund.processing','refund.needs-attention','refund.processed') and v_delta>0 then
        update public.profiles
          set credits=credits-v_delta,updated_at=now()
          where id=v_credit_order.profile_id;
        update public.credit_purchase_orders
          set refund_reserved_credits=refund_reserved_credits+v_delta,
              refund_reference=coalesce(v_refund_reference,refund_reference),
              status=case when p_event_type='refund.processed' then 'refunded' else 'refund_pending' end,
              updated_at=now()
          where id=v_credit_order.id;
        insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note)
        values(v_credit_order.profile_id,-v_delta,'admin_adjustment',v_credit_order.id,
          case when p_event_type='refund.processed'
            then 'Paystack refund: purchased credits reversed'
            else 'Credits reserved for pending Paystack refund' end);
      elsif p_event_type='refund.processed' then
        update public.credit_purchase_orders
          set status='refunded',refund_reference=coalesce(v_refund_reference,refund_reference),updated_at=now()
          where id=v_credit_order.id;
      elsif p_event_type='refund.failed' and v_credit_order.status='refund_pending' then
        update public.profiles
          set credits=credits+v_credit_order.refund_reserved_credits,updated_at=now()
          where id=v_credit_order.profile_id;
        if v_credit_order.refund_reserved_credits>0 then
          insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note)
          values(v_credit_order.profile_id,v_credit_order.refund_reserved_credits,'admin_adjustment',v_credit_order.id,
            'Failed Paystack refund: reserved credits released');
        end if;
        update public.credit_purchase_orders
          set status='complete',refund_reserved_credits=0,refund_reference=null,updated_at=now()
          where id=v_credit_order.id;
      end if;
    end if;

    if p_event_type='refund.processed' then
      select * into v_subscription_order
        from public.subscription_purchase_orders
        where payfast_payment_id=p_payment_reference for update;
      if found and v_subscription_order.status='complete' then
        update public.subscription_purchase_orders set status='refunded',updated_at=now()
          where id=v_subscription_order.id;
        select monthly_bonus_credits into v_bonus
          from public.subscription_plans where code=v_subscription_order.plan_code;
        if coalesce(v_bonus,0)>0 then
          update public.profiles set credits=credits-v_bonus,updated_at=now()
            where id=v_subscription_order.profile_id;
          insert into public.credit_transactions(profile_id,amount,transaction_type,reference_id,note)
          values(v_subscription_order.profile_id,-v_bonus,'admin_adjustment',v_subscription_order.id,
            'Paystack refund: subscription bonus reversed');
        end if;
        update public.profile_subscriptions set
          plan_code='free',status='cancelled',cancel_at_period_end=false,
          current_period_end=now(),next_payment_date=null,updated_at=now()
          where profile_id=v_subscription_order.profile_id
            and last_payment_reference=p_payment_reference;
      end if;
    end if;
  elsif p_event_type='charge.dispute.create' then
    update public.profile_subscriptions set status='past_due',updated_at=now()
      where last_payment_reference=p_payment_reference;
  end if;

  update public.paystack_webhook_events
    set status='processed',processed_at=now()
    where event_key=p_event_key;
end $$;

revoke all on function public.process_paystack_reversal(text,text,text,numeric,jsonb) from public;

commit;
