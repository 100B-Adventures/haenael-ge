#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
expected_sha="${1:-}"
run_dir="${2:-}"
secret_file="${CASHOUT_STAGING_SECRET_FILE:-$HOME/.sj-agent-harness/secrets/haenael-ge-cashout-staging-test.env}"
staging_alias="https://haenael-ge-v2-staging-100-b.vercel.app"

if [[ ! "$expected_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: $0 <40-char-source-sha> <run-dir>" >&2
  exit 2
fi
if [[ -z "$run_dir" ]]; then
  echo "run-dir is required" >&2
  exit 2
fi

cd "$repo_root"
git cat-file -e "${expected_sha}^{commit}"

for project_file in .vercel/project.json web/.vercel/project.json; do
  if [[ ! -f "$project_file" ]]; then
    echo "missing $project_file" >&2
    exit 3
  fi
  if [[ "$(jq -r '.projectName // empty' "$project_file")" != "haenael-ge" ]]; then
    echo "refusing project mapping in $project_file" >&2
    exit 3
  fi
done

if [[ -e web/.next ]]; then
  echo "refusing stale web/.next; move it aside before deploy" >&2
  exit 4
fi
if [[ ! -f "$secret_file" || "$(stat -c '%a' "$secret_file")" != "600" ]]; then
  echo "cashout staging secret file missing or not mode 600" >&2
  exit 5
fi

set -a
# shellcheck disable=SC1090
source "$secret_file"
set +a

required_names=(
  CASHOUT_STAGING_TEST_ENABLED
  CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY
  CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY
  CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS
  W12_STAGING_TEST_MEMBER_ID
)
for name in "${required_names[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "missing required staging variable: $name" >&2
    exit 6
  fi
done
if [[ "$CASHOUT_STAGING_TEST_ENABLED" != "true" ]]; then
  echo "CASHOUT_STAGING_TEST_ENABLED must be true" >&2
  exit 6
fi
if (( ${#CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY} < 32 || ${#CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY} < 32 )); then
  echo "cashout staging keys must be at least 32 characters" >&2
  exit 6
fi
if [[ "$CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY" == "$CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY" ]]; then
  echo "cashout staging encryption and fingerprint keys must differ" >&2
  exit 6
fi
case ",${CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS,,}," in
  *",${W12_STAGING_TEST_MEMBER_ID,,},"*) ;;
  *)
    echo "W12_STAGING_TEST_MEMBER_ID is absent from the staging allowlist" >&2
    exit 6
    ;;
esac

mkdir -p "$run_dir"
deploy_json="$run_dir/deploy.json"
deploy_log="$run_dir/deploy.log"
alias_log="$run_dir/alias.log"
health_json="$run_dir/health.json"

vercel deploy --yes --force --json --scope 100-b \
  --build-env "DEPLOY_SOURCE_SHA=$expected_sha" \
  --env "DEPLOY_SOURCE_SHA=$expected_sha" \
  --env "CASHOUT_STAGING_TEST_ENABLED=$CASHOUT_STAGING_TEST_ENABLED" \
  --env "CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY=$CASHOUT_STAGING_TEST_ACCOUNT_ENCRYPTION_KEY" \
  --env "CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY=$CASHOUT_STAGING_TEST_ACCOUNT_FINGERPRINT_KEY" \
  --env "CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS=$CASHOUT_STAGING_TEST_ALLOWED_MEMBER_IDS" \
  >"$deploy_json" 2>"$deploy_log"

deployment_id="$(jq -er '.deployment.id' "$deploy_json")"
deployment_url="$(jq -er '.deployment.url' "$deploy_json")"
ready_state="$(jq -er '.deployment.readyState' "$deploy_json")"
environment="$(jq -er '.deployment.environment' "$deploy_json")"
if [[ "$ready_state" != "READY" || "$environment" != "preview" ]]; then
  echo "deployment is not a ready preview" >&2
  exit 7
fi

vercel alias set "$deployment_url" "${staging_alias#https://}" --scope 100-b >"$alias_log" 2>&1

for _ in {1..12}; do
  if curl -fsS --max-time 20 "${staging_alias}/api/health?source=${expected_sha}" >"$health_json" \
    && [[ "$(jq -r '.sourceSha // empty' "$health_json")" == "$expected_sha" ]] \
    && [[ "$(jq -r '.status // empty' "$health_json")" == "ok" ]]; then
    jq -n --arg deploymentId "$deployment_id" --arg deploymentUrl "$deployment_url" \
      --arg alias "$staging_alias" --arg sourceSha "$expected_sha" \
      '{deploymentId:$deploymentId,deploymentUrl:$deploymentUrl,alias:$alias,sourceSha:$sourceSha}' \
      >"$run_dir/summary.json"
    echo "STAGING_DEPLOYMENT_READY $deployment_id $deployment_url"
    exit 0
  fi
  sleep 5
done

echo "staging alias health did not reach expected sourceSha" >&2
exit 8
