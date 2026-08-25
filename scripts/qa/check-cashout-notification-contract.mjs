#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const mutationIndex = args.indexOf("--mutation");
const mutation = mutationIndex >= 0 ? args[mutationIndex + 1] : null;
let source = readFileSync(join(repoRoot, "web/src/lib/cashout-notifications.ts"), "utf8");

if (mutation === "swallow-notify-failure") {
  source = source.replace(
    "await recordNotificationFailure(serviceClient, input);",
    "// mutation: failure swallowed",
  );
}

const checks = [
  ["notify.internal-token-required", /NOTIFY_INTERNAL_TOKEN/],
  ["notify.invoke-error-is-thrown", /if \(error\) throw error/],
  ["notify.failure-is-caught", /catch \(error\)/],
  ["notify.failure-is-persisted", /await recordNotificationFailure\(serviceClient, input\)/],
  ["notify.failure-row-channel", /channel:\s*"INAPP"/],
  ["notify.failure-row-status", /alimtalk_status:\s*"FAILED"/],
  ["notify.failure-row-member", /member_id:\s*input\.memberId/],
  ["notify.failure-row-type", /type:\s*input\.type/],
];

let failures = 0;
for (const [id, pattern] of checks) {
  const passed = pattern.test(source);
  console.log(`${passed ? "PASS" : "FAIL"} ${id}`);
  if (!passed) failures += 1;
}

console.log(`NOTIFY_CONTRACT checks=${checks.length} failures=${failures}`);
if (failures) {
  console.error("NOTIFY_CONTRACT_FAIL");
  process.exit(1);
}
console.log("NOTIFY_CONTRACT_PASS");
