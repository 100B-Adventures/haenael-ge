// lib/supabase/client.ts — Supabase 클라이언트 초기화.
// 브라우저=anon key(RLS 적용), 서버=service_role(RLS 우회, Edge Function 전용).
// RLS가 행 단위 보안을 담당하므로 브라우저에선 anon key만 사용한다.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
