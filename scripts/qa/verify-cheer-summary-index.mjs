#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const dockerArgs = ["exec", "-i", "supabase_db_haenael-ge", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt"];
const sql = (statement) => execFileSync("docker", dockerArgs, { input: statement, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
const suffix = randomBytes(5).toString("hex");
const prefix = `idx-${suffix}`;
const owner = randomUUID();
const other = randomUUID();

const dashboardSummaryQuery = `
WITH owned_goals AS (
  SELECT g.* FROM public.goal AS g
  WHERE g.member_id = '${owner}'::uuid AND g.deleted_at IS NULL AND g.status <> 'DELETED'
), cheer_counts AS (
  SELECT c.goal_id, count(*)::integer AS cheer_count
  FROM public.cheer AS c JOIN owned_goals AS g ON g.id = c.goal_id
  WHERE c.status = 'CONFIRMED' AND c.deleted_at IS NULL AND NOT c.is_welcome
  GROUP BY c.goal_id
), recent_cheer_rows AS (
  SELECT g.id AS goal_id, recent.id, recent.created_at, recent.message,
    recent.is_anonymous, recent.supporter_name, recent.profile_image, recent.position
  FROM owned_goals AS g
  CROSS JOIN LATERAL (
    SELECT c.id, c.created_at, c.message, c.is_anonymous,
      CASE WHEN c.is_anonymous THEN NULL ELSE COALESCE(m.nickname, c.display_name) END AS supporter_name,
      CASE WHEN c.is_anonymous THEN NULL ELSE m.profile_image END AS profile_image,
      row_number() OVER (ORDER BY c.created_at DESC, c.id DESC) AS position
    FROM public.cheer AS c
    LEFT JOIN public.social_cheer_member_attribution AS a ON a.cheer_id = c.id
    LEFT JOIN public.member AS m ON m.id = a.supporter_member_id
    WHERE c.goal_id = g.id AND c.status = 'CONFIRMED'
      AND c.deleted_at IS NULL AND NOT c.is_welcome
    ORDER BY c.created_at DESC, c.id DESC LIMIT 3
  ) AS recent
), cheer_summary AS (
  SELECT r.goal_id,
    jsonb_agg(jsonb_build_object('profile_image', r.profile_image, 'is_anonymous', r.is_anonymous)
      ORDER BY r.created_at DESC, r.id DESC) AS supporter_avatars,
    (jsonb_agg(jsonb_build_object('supporter_name', r.supporter_name, 'message', r.message,
      'created_at', r.created_at, 'is_anonymous', r.is_anonymous)
      ORDER BY r.created_at DESC, r.id DESC) FILTER (WHERE r.position = 1))->0 AS recent_cheer
  FROM recent_cheer_rows AS r GROUP BY r.goal_id
)
SELECT jsonb_agg(jsonb_build_object(
  'goal_id', g.id, 'cheer_count', COALESCE(cc.cheer_count, 0),
  'supporter_avatars', COALESCE(s.supporter_avatars, '[]'::jsonb), 'recent_cheer', s.recent_cheer
))
FROM owned_goals AS g
LEFT JOIN cheer_counts AS cc ON cc.goal_id = g.id
LEFT JOIN cheer_summary AS s ON s.goal_id = g.id`;

function explain(statement) {
  const raw = sql(statement);
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) throw new Error(`explain_json_missing: ${raw.slice(0, 200)}`);
  return JSON.parse(raw.slice(start, end + 1))[0];
}

function summarize(explainResult) {
  const nodes = [];
  const visit = (node) => {
    nodes.push({ node_type: node["Node Type"], relation: node["Relation Name"] ?? null, index: node["Index Name"] ?? null, actual_rows: node["Actual Rows"] ?? null, loops: node["Actual Loops"] ?? null });
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(explainResult.Plan);
  return {
    execution_ms: explainResult["Execution Time"],
    planning_ms: explainResult["Planning Time"],
    shared_hit_blocks: explainResult.Plan["Shared Hit Blocks"] ?? 0,
    shared_read_blocks: explainResult.Plan["Shared Read Blocks"] ?? 0,
    result_rows: explainResult.Plan["Actual Rows"],
    cheer_access: nodes.filter((node) => node.relation === "cheer"),
    indexes: [...new Set(nodes.map((node) => node.index).filter(Boolean))],
  };
}

try {
  sql(`
    INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,raw_app_meta_data,raw_user_meta_data,is_super_admin,is_anonymous)
    VALUES
      ('${owner}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${prefix}-owner@test.local','',now(),now(),'','','','{}','{}',false,false),
      ('${other}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','${prefix}-other@test.local','',now(),now(),'','','','{}','{}',false,false);
    INSERT INTO public.member(id,nickname) VALUES ('${owner}','Index Owner'),('${other}','Index Other');
    INSERT INTO public.goal(member_id,slug,title,due_date,status)
    SELECT CASE WHEN n <= 10 THEN '${owner}'::uuid ELSE '${other}'::uuid END,
      '${prefix}-'||n, 'index fixture '||n, '2026-12-31', 'ACTIVE'
    FROM generate_series(1,100) AS n;
    INSERT INTO public.payment(order_id,amount_krw,status,pg_customer_key)
    SELECT '${prefix}-pay-'||g.id||'-'||n, 1000, 'DONE', 'INDEX_FIXTURE'
    FROM public.goal AS g CROSS JOIN generate_series(1,60) AS n WHERE g.slug LIKE '${prefix}-%';
    INSERT INTO public.cheer(goal_id,display_name,is_anonymous,message,clover_amount,payment_id,status,created_at)
    SELECT g.id, 'fixture', false, '인덱스 실행 계획 fixture', 1000, p.id, 'CONFIRMED', now() - n * interval '1 second'
    FROM public.goal AS g CROSS JOIN generate_series(1,60) AS n
    JOIN public.payment AS p ON p.order_id='${prefix}-pay-'||g.id||'-'||n
    WHERE g.slug LIKE '${prefix}-%';
  `);
  sql("VACUUM (ANALYZE) public.cheer;");
  const seqscan = sql("SHOW enable_seqscan;");
  const withIndex = summarize(explain(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${dashboardSummaryQuery};`));
  const withoutIndex = summarize(explain(`BEGIN; DROP INDEX public.cheer_social_summary_recent_idx; EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${dashboardSummaryQuery}; ROLLBACK;`));
  const indexUsed = withIndex.indexes.includes("cheer_social_summary_recent_idx");
  const buffersImproved = withIndex.shared_hit_blocks < withoutIndex.shared_hit_blocks;
  const recentRowsWithIndex = Math.min(...withIndex.cheer_access.map((node) => node.actual_rows));
  const recentRowsWithoutIndex = Math.min(...withoutIndex.cheer_access.map((node) => node.actual_rows));
  const recentRowsImproved = recentRowsWithIndex < recentRowsWithoutIndex;
  console.log(JSON.stringify({ enable_seqscan: seqscan, fixture_goals: 100, fixture_cheers: 6000, with_index: withIndex, without_index: withoutIndex, index_used: indexUsed, shared_hit_blocks_improved: buffersImproved, recent_branch_rows: { with_index: recentRowsWithIndex, without_index: recentRowsWithoutIndex, improved: recentRowsImproved } }));
  if (seqscan !== "on" || !indexUsed || !recentRowsImproved || withIndex.result_rows !== withoutIndex.result_rows) process.exitCode = 1;
} finally {
  sql(`
    DELETE FROM public.cheer WHERE goal_id IN (SELECT id FROM public.goal WHERE slug LIKE '${prefix}-%');
    DELETE FROM public.payment WHERE order_id LIKE '${prefix}-pay-%';
    DELETE FROM public.goal WHERE slug LIKE '${prefix}-%';
    DELETE FROM public.member WHERE id IN ('${owner}','${other}');
    DELETE FROM auth.users WHERE id IN ('${owner}','${other}');
  `);
}
