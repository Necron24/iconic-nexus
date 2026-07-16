-- Run this read-only query in Supabase SQL Editor only if campaign creation
-- still rejects rewards below 25/50 credits after deploying the code update.

select
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_funded_testing_campaign',
    'update_funded_testing_campaign'
  )
order by p.proname;
