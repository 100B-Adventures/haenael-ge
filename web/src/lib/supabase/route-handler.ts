// lib/supabase/route-handler.ts — Route Handler 전용 Supabase 클라이언트
// 세션 쿠키를 NextResponse 에 직접 설정하는 패턴.
// ref: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs
//
// 사용 예(auth/kakao/callback/route.ts):
//   const response = NextResponse.redirect(...)
//   const supabase = createRouteHandlerClient(request, response)
//   await supabase.auth.verifyOtp({ token_hash, type: 'email' })
//   return response // 쿠키 포함됨

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "./database.types";

/**
 * Route Handler 에서 request/response 쌍에 쿠키를 바인딩한 Supabase 클라이언트.
 * auth 작업(verifyOtp 등)으로 발급된 세션이 response.cookies 에 세팅된다.
 */
export function createRouteHandlerClient(
  request: NextRequest | Request,
  response: NextResponse,
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // request.cookies: Next.js Request에서 가져옴
          return ("cookies" in request && typeof request.cookies === "object" &&
              "getAll" in request.cookies)
            ? (request.cookies as { getAll(): { name: string; value: string }[] }).getAll()
            : [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
