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
  ["minimum.web-custom-validity-must-not-use-threshold", form, /nextAmount < minCashoutClover/]
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
