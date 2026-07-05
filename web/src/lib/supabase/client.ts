// lib/supabase/client.ts — 브라우저용 Supabase anon 클라이언트
// 슬라이스 #1 scaffold. RLS가 행 단위 보안을 담당하므로 anon key 사용.

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
