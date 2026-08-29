#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = join(repoRoot, "supabase/migrations");
const args = process.argv.slice(2);
const mutationIndex = args.indexOf("--mutation");
const mutation = mutationIndex >= 0 ? args[mutationIndex + 1] : null;

function source(path) {
  return readFileSync(join(repoRoot, path), "utf8");
}

const latestMigration = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .reverse()
  .find((name) => readFileSync(join(migrationsDir, name), "utf8").includes("CREATE OR REPLACE FUNCTION public.create_cashout_request"));

if (!latestMigration) {
  console.error("CASHOUT_CONTRACT_FAIL latest create_cashout_request migration not found");
  process.exit(2);
}

let db = readFileSync(join(migrationsDir, latestMigration), "utf8");
let eligibility = source("supabase/migrations/20260822000000_cashout_clover_lock_a1.sql");
let form = source("web/src/components/cashout/CashoutRequestForm.tsx");
let page = source("web/src/app/(receiver)/cashout/page.tsx");
let statusPage = source("web/src/app/(receiver)/cashout/status/page.tsx");
let errors = source("web/src/lib/cashout-errors.ts");
let terms = source("web/src/app/terms/page.tsx");
let fee = source("web/src/lib/cashout-fee.ts");

if (mutation === "ui-payable-threshold") {
  form = form.replace("totalBalance >= minCashoutClover", "payableAmount >= minCashoutClover");
}
if (mutation === "db-request-threshold") {
  db = db.replace("p_clover_amount IS NULL OR p_clover_amount < 1", "p_clover_amount IS NULL OR p_clover_amount < v_min");
}
if (mutation === "db-fee-rate") {
  db = db.replace("(v_gross * 10::bigint) / 100::bigint", "(v_gross * 9::bigint) / 100::bigint");
}

const checks = [
  ["minimum.db-request-lower-bound", db, /p_clover_amount IS NULL OR p_clover_amount < 1/],
  ["minimum.db-total-threshold", db, /IF v_total < v_min THEN\s+RAISE EXCEPTION 'cashout_below_minimum'/],
  ["minimum.db-payable-upper-bound", db, /IF p_clover_amount > v_payable THEN\s+RAISE EXCEPTION 'cashout_insufficient_balance'/],
  ["minimum.web-total-threshold", form, /totalBalance >= minCashoutClover/],
  ["minimum.web-positive-payable", form, /payableAmount > 0/],
  ["minimum.web-request-lower-bound", form, /if \(cloverAmount < 1\)/],
  ["minimum.web-total-validation", form, /if \(totalBalance < minCashoutClover\)/],
  ["minimum.web-payable-upper-bound", form, /if \(cloverAmount > payableAmount\)/],
  ["minimum.web-input-min", form, /min=\{1\}/],
  ["minimum.web-custom-validity-lower-bound", form, /nextAmount < 1/],
  ["copy.web-separated-threshold-and-payable", form, /환전 기준: 모인 클로버 \$\{minCashoutClover\}개 이상 · 지금 지급 가능 \$\{payableAmount\}개/],
  ["copy.web-zero-payable-explains-welcome", form, /웰컴 클로버는 환전되지 않아요\. 친구 응원이 들어오면 지급 가능한 만큼 신청할 수 있어요\./],
  ["copy.error-total-threshold", errors, /cashout_below_minimum:\s*\n?\s*"모인 클로버가 30개 이상이면/],
  ["copy.error-request-lower-bound", errors, /cashout_below_minimum:\s*\n?\s*"[^"]*지급 가능한 클로버를 1개 이상 신청할 수 있어요\."/],
  ["copy.status-total-threshold", statusPage, /모인 클로버가 \{minCashoutClover\}개 이상이면 환전 자격을 채워요\./],
  ["copy.status-request-lower-bound", statusPage, /신청량은 지금 지급 가능한 클로버 안에서 1개 이상 선택할 수/],
  ["terms.cashout-active", terms, /환전하는\s+기능은 현재 운영 중입니다/],
  ["terms.total-threshold-and-request-range", terms, /모인 클로버가\s+30개 이상이면 환전 자격[\s\S]*지급 가능한 클로버 안에서 1개 이상/],
  ["terms.kyc-absence-allowed", terms, /본인인증 기록이 없는 회원도 신청할 수 있습니다/],
  ["terms.verified-minor-blocked", terms, /미성년으로 확인된 회원은 신청할 수\s+없습니다/],
  ["terms.manual-account-payout", terms, /계좌정보를 확인하고 계좌이체를 수동으로 처리합니다/],
  ["terms.tax-boundary", terms, /소득 구분[\s\S]*확정된 세무 판단이\s+아닙니다[\s\S]*전문가 검토 결과/],
  ["balance.db-total", eligibility, /v_total,\s+v_welcome,\s+v_locked,/],
  ["balance.db-available", eligibility, /GREATEST\(v_total - v_locked, 0\)/],
  ["balance.db-payable", eligibility, /GREATEST\(v_total - v_welcome - v_locked, 0\)/],
  ["balance.db-reached-threshold", eligibility, /\(v_total >= v_min\)/],
  ["balance.web-single-rpc-source", page, /supabase\.rpc\("clover_eligibility"/],
  ["balance.web-total-field", page, /eligibility\?\.total_balance/],
  ["balance.web-payable-field", page, /eligibility\?\.payable_amount/],
  ["balance.web-threshold-field", page, /eligibility\?\.reached_threshold/],
  ["amount.web-clover-unit", fee, /KRW_PER_CLOVER = 1000/],
  ["amount.web-fee-rate", fee, /SERVICE_FEE_PERCENT = 10/],
  ["amount.web-vat-rate", fee, /VAT_PERCENT = 10/],
  ["amount.web-withholding-rate", fee, /WITHHOLDING_PERMILLE = 33/],
  ["amount.db-gross", db, /v_gross := p_clover_amount::bigint \* 1000::bigint/],
  ["amount.db-fee", db, /v_fee := \(v_gross \* 10::bigint\) \/ 100::bigint/],
  ["amount.db-vat", db, /v_vat := \(v_fee \* 10::bigint\) \/ 100::bigint/],
  ["amount.db-withholding", db, /v_withholding := \(\(v_gross - v_fee_total\) \* 33::bigint\) \/ 1000::bigint/],
  ["amount.db-net", db, /v_net := v_gross - v_fee_total - v_withholding/]
];

const forbidden = [
  ["minimum.db-must-not-use-request-as-threshold", db, /p_clover_amount IS NULL OR p_clover_amount < v_min/],
  ["minimum.web-must-not-use-payable-as-threshold", form, /payableAmount >= minCashoutClover/],
  ["minimum.web-custom-validity-must-not-use-threshold", form, /nextAmount < minCashoutClover/],
  ["copy.web-must-not-call-threshold-request-minimum", form, /최소 \$\{minCashoutClover\}개 · 현재 지급 가능|친구 응원분 30클로버부터|환전은 최소 30클로버부터/],
  ["copy.error-must-not-map-request-lower-bound-to-thirty", errors, /cashout_below_minimum:\s*\n?\s*"[^"]*(?:친구 응원분 30클로버부터|신청량 최소 30)/],
  ["copy.status-must-not-use-friend-thirty-as-eligibility", statusPage, /친구 응원분이 30클로버 이상이면 신청/],
  ["terms.must-not-promise-disabled-or-future-kyc", terms, /현재 버전에서 명시적으로 비활성화|향후\s+활성화되는 경우|본인인증\(KYC\) 절차를\s+완료해야/],
  ["terms.must-not-promise-nonexistent-verification", terms, /본인인증\(휴대폰 PASS|예금주 조회\(계좌실명확인\) API/]
];

let failures = 0;
for (const [id, text, pattern] of checks) {
  const passed = pattern.test(text);
  console.log(`${passed ? "PASS" : "FAIL"} ${id}`);
  if (!passed) failures += 1;
}
for (const [id, text, pattern] of forbidden) {
  const passed = !pattern.test(text);
  console.log(`${passed ? "PASS" : "FAIL"} ${id}`);
  if (!passed) failures += 1;
}

console.log(`CASHOUT_CONTRACT source=${latestMigration} checks=${checks.length + forbidden.length} failures=${failures}`);
if (failures) {
  console.error("CASHOUT_CONTRACT_FAIL");
  process.exit(1);
}
console.log("CASHOUT_CONTRACT_PASS");
