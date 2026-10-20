-- Fresh Supabase projects grant broad table privileges to API roles before project
-- migrations run. RLS still hides rows, but these four contracts intentionally require
-- permission errors so private columns and operator-only tables cannot be probed.

REVOKE SELECT ON TABLE public.member FROM anon;
REVOKE SELECT ON TABLE public.clover_balance FROM anon;
REVOKE SELECT ON TABLE public.cashout_request FROM anon;
REVOKE SELECT ON TABLE public.report FROM anon, authenticated;

COMMENT ON TABLE public.report IS
  'User roles may INSERT reports, but only service_role may SELECT them. The explicit grants are enforced by 20261021011000_fresh_db_rls_grants.sql.';
