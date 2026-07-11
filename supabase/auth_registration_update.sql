-- Run this file if you already ran the original schema.sql before
-- registration metadata support was added.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, country, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'country',
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'both'::public.user_role)
  );

  insert into public.credit_transactions (profile_id, amount, transaction_type, note)
  values (new.id, 50, 'welcome', 'Welcome Nexus Credits');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
