-- psql variables only. Secret values must be injected in memory by the deployment wrapper.
-- Required: storage_cleanup_worker_url, edge_invoke_publishable_key, storage_cleanup_internal_token
BEGIN;
CREATE TEMP TABLE storage_cleanup_vault_input(name text PRIMARY KEY, secret_value text, description text) ON COMMIT DROP;
INSERT INTO storage_cleanup_vault_input(name, secret_value, description) VALUES
  ('storage_cleanup_worker_url', :'storage_cleanup_worker_url', 'storage cleanup worker URL'),
  ('edge_invoke_publishable_key', :'edge_invoke_publishable_key', 'Edge Function publishable key'),
  ('storage_cleanup_internal_token', :'storage_cleanup_internal_token', 'storage cleanup internal token');

DO $provision$
DECLARE
  v_input record;
  v_secret_id uuid;
BEGIN
  FOR v_input IN SELECT * FROM storage_cleanup_vault_input ORDER BY name LOOP
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
