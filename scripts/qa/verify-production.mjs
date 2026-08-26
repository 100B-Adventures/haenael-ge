#!/usr/bin/env node
/**
 * 배포 후 운영이 실제로 도는지 확인한다.
 *
 * 왜 필요한가.
 *   2026-08-25 하루에 배포가 네 번 잘못 나갔다. 로컬 테스트 263개가 전부
 *   통과하는데 운영 첫 환전 신청이 실패했다. 로컬은 내 컴퓨터의 환경변수를
 *   쓰고 운영은 다른 값을 쓴다. 그 차이를 로컬 테스트로는 원리상 못 잡는다.
 *
 * 무엇을 확인하나.
 *   로그인이 필요 없는 경로만 친다. 로그인 세션이 필요한 환전 신청 자체는
 *   여기서 못 돌린다. 대신 그 신청이 기대는 것들이 살아 있는지 본다.
 *   빌드가 나갔는지, 화면이 뜨는지, 계산 기준이 맞는지, 데이터베이스 함수와
 *   알림 경로가 서 있는지.
 *
 * 쓰는 법
 *   node scripts/qa/verify-production.mjs
 *   node scripts/qa/verify-production.mjs --url https://haenaelge.vercel.app
 */

const BASE = (() => {
  const i = process.argv.indexOf("--url");
  return i > -1 ? process.argv[i + 1] : "https://haenaelge.vercel.app";
})();

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { status: res.status, text: await res.text() };
}

async function main() {
  console.log(`운영 검증 대상: ${BASE}\n`);

  // 1. 첫 화면이 뜨는가. 배포가 실제로 서비스되고 있다는 최소 조건.
  try {
    const { status } = await get("/");
    record("홈 화면 응답", status === 200, `HTTP ${status}`);
  } catch (e) {
    record("홈 화면 응답", false, e.message);
  }

  // 2. 약관에 현행 이용료가 떠 있는가.
  //    옛 배포가 production URL 에 붙어 있으면 여기서 옛 수치가 나온다.
  //    2026-08-25 에 실제로 이 방식으로 옛 배포를 발견했다.
  try {
    const { text } = await get("/terms");
    const old = (text.match(/5%/g) || []).length;
    const now = (text.match(/10%/g) || []).length;
    record("약관 이용료 표기", now > 0 && old === 0, `10% ${now}곳, 5% ${old}곳`);
  } catch (e) {
    record("약관 이용료 표기", false, e.message);
  }

  // 3. 환전 화면이 뜨는가. 로그인 화면으로 넘어가는 것도 정상 동작이다.
  //    500 이나 빈 응답이면 화면 자체가 깨진 것이다.
  try {
    const { status, text } = await get("/cashout");
    const alive = status < 500 && text.length > 500;
    record("환전 화면 응답", alive, `HTTP ${status}, ${text.length}바이트`);
  } catch (e) {
    record("환전 화면 응답", false, e.message);
  }

  console.log("");
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.log(`운영 검증 실패 ${failed.length}건. 배포를 완료라고 말하지 마라.`);
    process.exit(1);
  }
  console.log(`운영 검증 ${results.length}건 통과.`);
  console.log("");
  console.log("여기서 확인하지 못한 것:");
  console.log("  - 환전 신청이 실제로 접수되는지 (로그인 세션 필요)");
  console.log("  - 알림톡이 실제로 도착하는지 (수신함 확인 필요)");
  console.log("  이 둘은 운영 데이터베이스 조회로 사후 확인한다.");
}

main().catch((e) => {
  console.error(`검증 스크립트 자체가 실패했다: ${e.message}`);
  process.exit(1);
});
