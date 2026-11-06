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
let formView = source("web/src/components/cashout/CashoutRequestForm.tsx");
let formCopy = source("web/src/lib/copy/generated/components-cashout-cashoutrequestform.ts");
let page = source("web/src/app/(receiver)/cashout/page.tsx");
let statusPageView = source("web/src/app/(receiver)/cashout/status/page.tsx");
let statusPageCopy = source("web/src/lib/copy/generated/app-receiver-cashout-status-page.ts");
let errors = source("web/src/lib/cashout-errors.ts");
let termsView = source("web/src/app/terms/page.tsx");
let termsCopy = source("web/src/lib/copy/generated/app-terms-page.ts");
let fee = source("web/src/lib/cashout-fee.ts");

if (mutation === "ui-payable-threshold") {
  formView = formView.replace("totalBalance >= minCashoutClover", "payableAmount >= minCashoutClover");
}
if (mutation === "db-request-threshold") {
  db = db.replace("p_clover_amount IS NULL OR p_clover_amount < 1", "p_clover_amount IS NULL OR p_clover_amount < v_min");
}
if (mutation === "db-fee-rate") {
  db = db.replace("(v_gross * 10::bigint) / 100::bigint", "(v_gross * 9::bigint) / 100::bigint");
}
if (mutation === "drop-form-copy-binding") {
  formView = formView.replace("PRODUCT_COPY.TEXT_051", "PRODUCT_COPY.TEXT_050");
}
if (mutation === "drop-status-copy-binding") {
  statusPageView = statusPageView.replace("PRODUCT_COPY.TEXT_005", "PRODUCT_COPY.TEXT_003");
}
if (mutation === "drop-terms-cashout-binding") {
  termsView = termsView.replace("PRODUCT_COPY.TEXT_050", "PRODUCT_COPY.TEXT_049");
}
if (mutation === "drop-terms-eligibility-binding") {
  termsView = termsView.replace("PRODUCT_COPY.TEXT_052", "PRODUCT_COPY.TEXT_051");
}
if (mutation === "drop-terms-payout-binding") {
  termsView = termsView.replace("PRODUCT_COPY.TEXT_056", "PRODUCT_COPY.TEXT_055");
}
if (mutation === "drop-terms-tax-binding") {
  termsView = termsView.replace("PRODUCT_COPY.TEXT_046", "PRODUCT_COPY.TEXT_045");
}
if (mutation === "swap-terms-copy-bindings") {
  termsView = termsView
    .replace("PRODUCT_COPY.TEXT_050", "PRODUCT_COPY.__SWAP__")
    .replace("PRODUCT_COPY.TEXT_052", "PRODUCT_COPY.TEXT_050")
    .replace("PRODUCT_COPY.__SWAP__", "PRODUCT_COPY.TEXT_052");
}
if (mutation === "corrupt-form-copy") {
  formCopy = formCopy.replace("웰컴 클로버는 환전되지 않아요.", "웰컴 클로버도 환전돼요.");
}
if (mutation === "corrupt-status-copy") {
  statusPageCopy = statusPageCopy.replace("개 이상이면 환전 자격을 채워요.", "개 미만이어도 환전할 수 있어요.");
}
if (mutation === "corrupt-terms-cashout-copy") {
  termsCopy = termsCopy.replace("환전하는 기능은 현재 운영 중입니다.", "환전하는 기능은 아직 운영하지 않습니다.");
}
if (mutation === "corrupt-terms-eligibility-copy") {
  termsCopy = termsCopy.replace("본인인증 기록이 없는 회원도 신청할 수 있습니다.", "본인인증 기록이 있어야 신청할 수 있습니다.");
}
if (mutation === "corrupt-terms-payout-copy") {
  termsCopy = termsCopy.replace("계좌이체를 수동으로 처리합니다.", "계좌이체를 자동으로 처리합니다.");
}
if (mutation === "corrupt-terms-tax-copy") {
  termsCopy = termsCopy.replace("확정된 세무 판단이 아닙니다.", "확정된 세무 판단입니다.");
}

const statusPageCorpus = `${statusPageView}\n${statusPageCopy}`;
const termsCorpus = `${termsView}\n${termsCopy}`;

const checks = [
  ["minimum.db-request-lower-bound", db, /p_clover_amount IS NULL OR p_clover_amount < 1/],
  ["minimum.db-total-threshold", db, /IF v_total < v_min THEN\s+RAISE EXCEPTION 'cashout_below_minimum'/],
  ["minimum.db-payable-upper-bound", db, /IF p_clover_amount > v_payable THEN\s+RAISE EXCEPTION 'cashout_insufficient_balance'/],
  ["minimum.web-total-threshold", formView, /totalBalance >= minCashoutClover/],
  ["minimum.web-positive-payable", formView, /payableAmount > 0/],
  ["minimum.web-request-lower-bound", formView, /if \(cloverAmount < 1\)/],
  ["minimum.web-total-validation", formView, /if \(totalBalance < minCashoutClover\)/],
  ["minimum.web-payable-upper-bound", formView, /if \(cloverAmount > payableAmount\)/],
  ["minimum.web-input-min", formView, /min=\{1\}/],
  ["minimum.web-custom-validity-lower-bound", formView, /nextAmount < 1/],
  ["copy.web-separated-threshold-and-payable", formView, /환전 기준: 모인 클로버 \$\{minCashoutClover\}개 이상 · 지금 지급 가능 \$\{payableAmount\}개/],
  ["copy.web-zero-payable-explains-welcome", formCopy, /TEXT_051:\s*"웰컴 클로버는 환전되지 않아요\. 친구 응원이 들어오면 지급 가능한 만큼 신청할 수 있어요\."/],
  ["copy.web-zero-payable-binding", formView, /reachedThreshold\s+\? PRODUCT_COPY\.TEXT_051\s+: `환전 기준은 모인 클로버/],
  ["copy.error-total-threshold", errors, /cashout_below_minimum:\s*\n?\s*"모인 클로버가 30개 이상이면/],
  ["copy.error-request-lower-bound", errors, /cashout_below_minimum:\s*\n?\s*"[^"]*지급 가능한 클로버를 1개 이상 신청할 수 있어요\."/],
  ["copy.status-total-threshold", statusPageCopy, /TEXT_004:\s*"모인 클로버가 "[\s\S]*TEXT_005:\s*"개 이상이면 환전 자격을 채워요\./],
  ["copy.status-threshold-template-binding", statusPageView, /PRODUCT_COPY\.TEXT_004\}\{minCashoutClover\}\{PRODUCT_COPY\.TEXT_005/],
  ["copy.status-request-lower-bound", statusPageCopy, /TEXT_005:\s*"[^"]*신청량은 지금 지급 가능한 클로버 안에서 1개 이상 선택할 수/],
  ["copy.status-request-lower-bound-binding", statusPageView, /PRODUCT_COPY\.TEXT_004\}\{minCashoutClover\}\{PRODUCT_COPY\.TEXT_005/],
  ["terms.cashout-active", termsCopy, /TEXT_050:\s*"[^"]*환전하는 기능은 현재 운영 중입니다/],
  ["terms.cashout-active-binding", termsView, /<strong>\{PRODUCT_COPY\.TEXT_049\}<\/strong>\{PRODUCT_COPY\.TEXT_050\}/],
  ["terms.total-threshold-and-request-range", termsCopy, /TEXT_050:\s*"[^"]*모인 클로버가 30개 이상이면 환전 자격[^"]*지급 가능한 클로버 안에서 1개 이상/],
  ["terms.total-threshold-and-request-range-binding", termsView, /<strong>\{PRODUCT_COPY\.TEXT_049\}<\/strong>\{PRODUCT_COPY\.TEXT_050\}/],
  ["terms.kyc-absence-allowed", termsCopy, /TEXT_052:\s*"환전 신청 시 본인인증 기록이 없는 회원도 신청할 수 있습니다/],
  ["terms.kyc-absence-allowed-binding", termsView, /<p className="mb-2 leading-relaxed">\{PRODUCT_COPY\.TEXT_052\}<\/p>/],
  ["terms.verified-minor-blocked", termsCopy, /TEXT_052:\s*"[^"]*미성년으로 확인된 회원은 신청할 수 없습니다/],
  ["terms.verified-minor-blocked-binding", termsView, /<p className="mb-2 leading-relaxed">\{PRODUCT_COPY\.TEXT_052\}<\/p>/],
  ["terms.manual-account-payout", termsCopy, /TEXT_056:\s*"[^"]*계좌정보를 확인하고 계좌이체를 수동으로 처리합니다/],
  ["terms.manual-account-payout-binding", termsView, /<strong>\{PRODUCT_COPY\.TEXT_055\}<\/strong>\{PRODUCT_COPY\.TEXT_056\}/],
  ["terms.tax-boundary", termsCopy, /TEXT_046:\s*"[^"]*소득 구분[^"]*확정된 세무 판단이 아닙니다[^"]*전문가 검토 결과/],
  ["terms.tax-boundary-binding", termsView, /<strong>\{PRODUCT_COPY\.TEXT_045\}<\/strong>\{PRODUCT_COPY\.TEXT_046\}/],
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
  ["minimum.web-must-not-use-payable-as-threshold", formView, /payableAmount >= minCashoutClover/],
  ["minimum.web-custom-validity-must-not-use-threshold", formView, /nextAmount < minCashoutClover/],
  ["copy.web-must-not-call-threshold-request-minimum", `${formView}\n${formCopy}`, /최소 \$\{minCashoutClover\}개 · 현재 지급 가능|친구 응원분 30클로버부터|환전은 최소 30클로버부터/],
  ["copy.error-must-not-map-request-lower-bound-to-thirty", errors, /cashout_below_minimum:\s*\n?\s*"[^"]*(?:친구 응원분 30클로버부터|신청량 최소 30)/],
  ["copy.status-must-not-use-friend-thirty-as-eligibility", statusPageCorpus, /친구 응원분이 30클로버 이상이면 신청/],
  ["terms.must-not-promise-disabled-or-future-kyc", termsCorpus, /현재 버전에서 명시적으로 비활성화|향후\s+활성화되는 경우|본인인증\(KYC\) 절차를\s+완료해야/],
  ["terms.must-not-promise-nonexistent-verification", termsCorpus, /본인인증\(휴대폰 PASS|예금주 조회\(계좌실명확인\) API/]
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
