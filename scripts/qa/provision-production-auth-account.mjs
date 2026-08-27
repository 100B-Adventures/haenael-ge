#!/usr/bin/env node

import { chmodSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "../../web/node_modules/@supabase/supabase-js/dist/index.mjs";

const PURPOSE = "production-readonly-e2e";
const EMAIL = "qa-production-readonly@haenaelge.invalid";
const SECRET_DIR = path.join(homedir(), ".sj-agent-harness", "secrets");
const SECRET_FILE = path.join(SECRET_DIR, "haenael-ge-qa-production.env");

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 미설정`);
  return value;
}

async function findQaUser(admin) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const emailMatch = data.users.find((user) => user.email === EMAIL);
    if (emailMatch) {
      if (emailMatch.user_metadata?.purpose !== PURPOSE) {
        throw new Error("고정 QA 이메일이 다른 용도로 사용 중이므로 계정 변경을 중단한다");
      }
      return emailMatch;
    }
    const purposeConflict = data.users.find((user) => user.user_metadata?.purpose === PURPOSE);
    if (purposeConflict) {
      throw new Error("같은 QA purpose를 가진 다른 이메일이 있어 계정 변경을 중단한다");
    }
    if (data.users.length < 100) return null;
  }
}

function envLine(name, value) {
  return `${name}=${JSON.stringify(value)}`;
}

async function main() {
  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const host = new URL(supabaseUrl);
  if (host.protocol !== "https:" || !host.hostname.endsWith(".supabase.co")) {
    throw new Error("운영 Supabase HTTPS 호스트가 아니므로 계정 생성을 중단한다");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let user = await findQaUser(admin);
  let created = false;
  const password = `${randomBytes(32).toString("base64url")}A1!`;

  if (user) {
    const { data: member, error: memberError } = await admin
      .from("member")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (memberError) throw memberError;
    if (member) throw new Error("기존 QA 계정에 member 제품행이 있어 credential 회전을 중단한다");

    const { data, error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { ...user.user_metadata, purpose: PURPOSE },
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password,
      email_confirm: true,
      user_metadata: { purpose: PURPOSE },
    });
    if (error) throw error;
    user = data.user;
    created = true;
  }

  try {
    const { data: member, error: memberError } = await admin
      .from("member")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (memberError) throw memberError;
    if (member) throw new Error("QA 계정에 member 제품행이 생성돼 안전 계약을 위반했다");

    mkdirSync(SECRET_DIR, { recursive: true, mode: 0o700 });
    chmodSync(SECRET_DIR, 0o700);
    const tempFile = `${SECRET_FILE}.tmp`;
    const body = [
      envLine("QA_PRODUCTION_SUPABASE_URL", supabaseUrl),
      envLine("QA_PRODUCTION_SUPABASE_ANON_KEY", supabaseAnonKey),
      envLine("QA_PRODUCTION_EMAIL", user.email ?? EMAIL),
      envLine("QA_PRODUCTION_PASSWORD", password),
      envLine("QA_PRODUCTION_EXPECTED_USER_ID", user.id),
      "",
    ].join("\n");
    writeFileSync(tempFile, body, { mode: 0o600 });
    chmodSync(tempFile, 0o600);
    renameSync(tempFile, SECRET_FILE);
    chmodSync(SECRET_FILE, 0o600);
  } catch (error) {
    if (created) await admin.auth.admin.deleteUser(user.id);
    throw error;
  }

  console.log(`PASS QA auth-only 계정 ${created ? "생성" : "재사용"}`);
  console.log(`PASS local credential mode 600: ${SECRET_FILE}`);
  console.log("PASS member 제품행 0건");
}

main().catch((error) => {
  console.error(`FAIL QA auth-only 계정 준비: ${error.message}`);
  process.exit(1);
});
