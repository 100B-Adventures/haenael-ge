// 이전 운영 DB 에서 받아 둔 JSON 백업으로 이관 SQL 을 만든다.
//
// 쓰는 법: node scripts/ops/build-migration-sql.mjs <백업디렉터리>
//   예: node scripts/ops/build-migration-sql.mjs ~/.sj-agent-harness/backups/haenael-ge-old-db-20261012
//
// 입력  : <백업디렉터리>/json/<schema>.<table>.json  (psql json_agg 출력, 타입 보존)
// 출력  : <백업디렉터리>/migrate-into-new.sql        (권한 600)
//
// 설계
//   - json_populate_recordset 을 쓰므로 컬럼 순서·개수 변화에 영향받지 않는다.
//   - on conflict do nothing 이라 여러 번 돌려도 중복이 생기지 않는다.
//   - 부모 테이블부터 넣는다(외래키).
//   - 트리거를 끄지 않는다. 끄면 잔액·원장 정합이 조용히 깨질 수 있다.
//   - 백업 파일에 개인정보가 들어 있으므로 출력 파일 권한을 600 으로 둔다.

import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const base = process.argv[2];
if (!base) {
  console.error("백업 디렉터리를 인자로 넘겨라");
  process.exit(1);
}
const jsonDir = join(base, "json");

// 부모 -> 자식 순서. 바꾸면 외래키에서 깨진다.
const ORDER = [
  "auth.users",
  "public.member",
  "public.goal",
  "public.cheer",
  "public.payment",
  "public.payment_log",
  "public.clover_balance",
  "public.clover_ledger",
  "public.cashout_request",
  "public.cashout_account_access_log",
  "public.admin_member",
  "public.notification",
  "public.report",
  "public.lead",
];

const stamp = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
const out = [
  "-- haenael-ge 이전 운영 DB -> 현재 운영 DB 레코드 이관",
  "-- 원본 gmpwrcxpvgylmllasoqy (postAGI 조직)",
  "-- 대상 ossvejipdivgxzcqszbw (해낼게 조직)",
  `-- 생성 ${stamp} KST`,
  "-- 재실행 안전: on conflict do nothing",
  "begin;",
];

let total = 0;
for (const q of ORDER) {
  const path = join(jsonDir, `${q}.json`);
  if (!existsSync(path)) {
    out.push(`-- 백업 없음, 건너뜀: ${q}`);
    continue;
  }
  const raw = readFileSync(path, "utf8").trim() || "[]";
  const rows = JSON.parse(raw);
  total += rows.length;
  const [schema, table] = q.split(".");
  // json_agg 는 배열 원소 사이에 줄바꿈을 넣는다. 그대로 쓰면 구문이 여러 줄이 되어
  // 테이블 단위로 쪼갤 때 깨진다. 한 줄로 압축한다(값은 그대로 보존된다).
  const literal = JSON.stringify(rows).replaceAll("'", "''");
  out.push(
    `insert into ${schema}."${table}" select * from json_populate_recordset(null::${schema}."${table}", '${literal}'::json) on conflict do nothing;  -- ${rows.length}행`,
  );
}

out.push("commit;", "", "-- 이관 후 양쪽에서 같은 값이 나와야 한다", [
  "select (select count(*) from auth.users) users,",
  "(select count(*) from public.member) members,",
  "(select count(*) from public.goal) goals,",
  "(select count(*) from public.cheer) cheers,",
  "(select count(*) from public.payment) payments,",
  "(select count(*) from public.clover_ledger) ledger,",
  "(select count(*) from public.cashout_request) cashouts;",
].join(" "));

const target = join(base, "migrate-into-new.sql");
writeFileSync(target, out.join("\n") + "\n", "utf8");
chmodSync(target, 0o600);
console.log(`생성: ${target}`);
console.log(`총 ${total}행, ${readFileSync(target).length}바이트`);
