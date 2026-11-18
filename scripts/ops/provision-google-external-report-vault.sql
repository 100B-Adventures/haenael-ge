-- psql variables only. Secret values must be injected in memory by the deployment wrapper.
-- Required: google_external_report_url, edge_invoke_publishable_key,
--           google_external_report_internal_token
BEGIN;
CREATE TEMP TABLE google_external_report_vault_input(
  name text PRIMARY KEY,
  secret_value text,
  description text
) ON COMMIT DROP;
INSERT INTO google_external_report_vault_input(name, secret_value, description) VALUES
  ('google_external_report_url', :'google_external_report_url', 'Google external transaction report Edge Function URL'),
  ('edge_invoke_publishable_key', :'edge_invoke_publishable_key', 'Edge Function publishable key'),
  ('google_external_report_internal_token', :'google_external_report_internal_token', 'Google external transaction report internal token');

DO $provision$
DECLARE
  v_input record;
  v_secret_id uuid;
BEGIN
  FOR v_input IN SELECT * FROM google_external_report_vault_input ORDER BY name LOOP
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
