// lib/supabase/server.ts — 서버 컴포넌트(RSC)/Route Handler용 Supabase 클라이언트
// @supabase/ssr 의 createServerClient 를 사용해 cookies()를 전달한다.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component에서 set 불가 — Middleware가 처리
          }
        },
      },
    },
  );
}
