-- Supabase project auto-RLS trigger helper should not be callable by API roles.
-- This preserves the automatic RLS trigger while limiting direct RPC exposure.
-- On installations without this Supabase helper, this migration is a no-op.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from PUBLIC, anon, authenticated';
  end if;
end;
$$;
