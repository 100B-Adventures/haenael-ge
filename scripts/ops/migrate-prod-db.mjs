// 이전 운영 DB -> 현재 운영 DB 데이터 이관 (2026-10-12 P0)
//
// 쓰는 법:
//   OLD_URL=... OLD_SERVICE_KEY=... NEW_URL=... NEW_SERVICE_KEY=... \
//     node scripts/ops/migrate-prod-db.mjs --dry-run
//   확인 후 --dry-run 을 빼고 다시 돌린다.
//
// 설계 원칙
//   - 기본은 모의 실행이다. --apply 가 없으면 아무것도 쓰지 않는다.
//   - 부모부터 자식 순서로 넣는다(외래키).
//   - upsert(onConflict=id)라 여러 번 돌려도 중복이 안 생긴다.
//   - auth.users 는 REST 로 못 옮긴다. Auth Admin API 로 따로 처리한다(아래 주석).
//   - 금액이 걸린 테이블은 이관 후 행 수와 합계를 양쪽에서 재대조한다.

const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`환경변수 ${k} 가 없다`);
  return v;
};

const OLD_URL = need("OLD_URL").replace(/\/$/, "");
const OLD_KEY = need("OLD_SERVICE_KEY");
const NEW_URL = need("NEW_URL").replace(/\/$/, "");
const NEW_KEY = need("NEW_SERVICE_KEY");
const APPLY = process.argv.includes("--apply");

// 부모 -> 자식 순서. 이 순서를 바꾸면 외래키에서 깨진다.
const TABLES = ["member", "goal", "cheer", "clover_ledger", "cashout_request", "notification", "report"];
// 금액이 걸려 합계까지 대조할 테이블
const MONEY = { cheer: "amount", clover_ledger: "amount", cashout_request: "gross_amount" };

const h = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

async function readAll(table) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const r = await fetch(`${OLD_URL}/rest/v1/${table}?select=*&order=id.asc`, {
      headers: { ...h(OLD_KEY), Range: `${from}-${from + page - 1}`, Prefer: "count=exact" },
    });
    if (r.status === 404) return null; // 그 DB에 없는 테이블
    if (!r.ok) throw new Error(`${table} 읽기 실패 ${r.status}: ${await r.text()}`);
    const batch = await r.json();
    rows.push(...batch);
    if (batch.length < page) return rows;
  }
}

async function countNew(table) {
  const r = await fetch(`${NEW_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: { ...h(NEW_KEY), Prefer: "count=exact" },
  });
  const cr = r.headers.get("content-range") || "*/?";
  return cr.split("/")[1];
}

async function upsert(table, rows) {
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const r = await fetch(`${NEW_URL}/rest/v1/${table}?on_conflict=id`, {
      method: "POST",
      headers: { ...h(NEW_KEY), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows.slice(i, i + chunk)),
    });
    if (!r.ok) throw new Error(`${table} 쓰기 실패 ${r.status}: ${await r.text()}`);
  }
}

const sum = (rows, col) => rows.reduce((a, r) => a + (Number(r?.[col]) || 0), 0);

console.log(APPLY ? "=== 실제 이관 ===" : "=== 모의 실행 (아무것도 쓰지 않는다) ===");
for (const t of TABLES) {
  const rows = await readAll(t);
  if (rows === null) { console.log(`${t.padEnd(18)} 이전 DB에 없음, 건너뜀`); continue; }
  const before = await countNew(t);
  const money = MONEY[t] ? ` 합계(${MONEY[t]})=${sum(rows, MONEY[t])}` : "";
  if (APPLY && rows.length) await upsert(t, rows);
  const after = await countNew(t);
  console.log(`${t.padEnd(18)} 이전=${String(rows.length).padEnd(5)} 현재 ${before} -> ${after}${money}`);
}

console.log(`
남은 것: auth.users 는 이 스크립트로 못 옮긴다.
  이전 DB  GET  /auth/v1/admin/users   (service key)
  현재 DB  POST /auth/v1/admin/users   (service key, id 를 유지해 생성)
member.id 가 auth.users.id 를 참조하므로 auth 를 먼저 옮기고 이 스크립트를 돌려야 한다.
돌린 뒤 양쪽에서 행 수와 금액 합계가 같은지 다시 확인한다.`);
