-- Required before completing paid subscription purchases.
-- Safe to run more than once.
alter type public.credit_transaction_type
  add value if not exists 'subscription_bonus';
