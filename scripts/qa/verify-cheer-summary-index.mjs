#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const plan = execFileSync(
  "docker",
  ["exec", "-i", "supabase_db_haenael-ge", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
  {
    input: `SET enable_seqscan=off;
EXPLAIN (COSTS OFF)
SELECT id, created_at, message, is_anonymous, display_name
FROM public.cheer
WHERE goal_id = -1
  AND status = 'CONFIRMED'
  AND deleted_at IS NULL
  AND NOT is_welcome
ORDER BY created_at DESC, id DESC
LIMIT 3;`,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  },
);
console.log(plan.trim());
if (!plan.includes("cheer_social_summary_recent_idx")) {
  console.error("CHEER_SUMMARY_INDEX_FAIL index_not_used");
  process.exit(1);
}
console.log("CHEER_SUMMARY_INDEX_PASS index=cheer_social_summary_recent_idx");
