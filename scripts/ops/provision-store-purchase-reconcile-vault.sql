-- psql variables only. Secret values must be injected in memory by the deployment wrapper.
-- Required: store_purchase_reconcile_url, edge_invoke_publishable_key,
--           store_purchase_reconcile_internal_token
BEGIN;
CREATE TEMP TABLE store_reconcile_vault_input(
  name text PRIMARY KEY,
  secret_value text,
  description text
) ON COMMIT DROP;
INSERT INTO store_reconcile_vault_input(name, secret_value, description) VALUES
  ('store_purchase_reconcile_url', :'store_purchase_reconcile_url', 'daily store purchase reconciliation URL'),
  ('edge_invoke_publishable_key', :'edge_invoke_publishable_key', 'Edge Function publishable key'),
  ('store_purchase_reconcile_internal_token', :'store_purchase_reconcile_internal_token', 'store purchase reconciliation internal token');

DO $provision$
DECLARE
  v_input record;
  v_secret_id uuid;
BEGIN
  FOR v_input IN SELECT * FROM store_reconcile_vault_input ORDER BY name LOOP
    SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_input.name;
    IF v_secret_id IS NULL THEN
      PERFORM vault.create_secret(v_input.secret_value, v_input.name, v_input.description);
    ELSE
      PERFORM vault.update_secret(v_secret_id, v_input.secret_value, v_input.name, v_input.description);
    END IF;
  END LOOP;
END
$provision$;
COMMIT;
