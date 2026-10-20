-- psql variables only. Secret values must be injected in memory by the deployment wrapper.
-- Required: storage_cleanup_worker_url, edge_invoke_publishable_key, storage_cleanup_internal_token
SELECT vault.create_secret(:'storage_cleanup_worker_url', 'storage_cleanup_worker_url', 'storage cleanup worker URL');
SELECT vault.create_secret(:'edge_invoke_publishable_key', 'edge_invoke_publishable_key', 'Edge Function publishable key');
SELECT vault.create_secret(:'storage_cleanup_internal_token', 'storage_cleanup_internal_token', 'storage cleanup internal token');
