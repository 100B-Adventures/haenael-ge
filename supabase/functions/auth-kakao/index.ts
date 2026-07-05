// auth-kakao — 카카오 커스텀 OAuth → Supabase 세션 발급
// 슬라이스 #3 실구현.
//
// 설계: docs/design-patterns.md §11a
// 인가코드(code) + redirect_uri 를 받아:
//   1. 카카오 토큰 교환
//   2. 카카오 사용자 정보 조회
//   3. Supabase Auth 유저 upsert (admin API)
//   4. public.member 행 upsert
//   5. generateLink → hashed_token 반환
//      클라이언트는 verifyOtp({ token_hash, type: 'email' }) 로 세션 확립
//
// env(Edge Function secret):
//   KAKAO_CLIENT_ID     — 카카오 REST API 키
//   KAKAO_CLIENT_SECRET — 카카오 앱 시크릿 키
//   SUPABASE_URL        — 자동 주입
//   SUPABASE_SERVICE_ROLE_KEY — 자동 주입
//
// ⛔ 회수 필요: 카카오 디벨로퍼 앱 생성 후 실키 설정 + redirect URI 등록

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  exchangeKakaoCode,
  getKakaoUserInfo,
  KakaoAuthError,
  normalizeKakaoUser,
} from "../_shared/oauth-kakao.ts";
import { withRegionHeader } from "../_shared/region.ts";

// ─── CORS ────────────────────────────────────────────────────────────────────

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── 응답 헬퍼 ───────────────────────────────────────────────────────────────

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

function jsonError(
  code: string,
  message: string,
  status: number,
): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: withRegionHeader(
      new Headers({ "Content-Type": "application/json", ...CORS_HEADERS }),
    ),
  });
}

// ─── 핸들러 ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonError("method_not_allowed", "POST only", 405);
  }

  // ─── 환경 변수 ─────────────────────────────────────────────────────────────

  const KAKAO_CLIENT_ID = Deno.env.get("KAKAO_CLIENT_ID");
  const KAKAO_CLIENT_SECRET = Deno.env.get("KAKAO_CLIENT_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!KAKAO_CLIENT_ID || !KAKAO_CLIENT_SECRET) {
    return jsonError(
      "missing_env",
      "KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET 미설정. 카카오 디벨로퍼에서 앱 키를 발급하고 Edge Function secret에 등록하세요.",
      503,
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("missing_supabase_env", "Supabase env 미주입", 503);
  }

  // ─── 요청 파싱 ────────────────────────────────────────────────────────────

  let code: string;
  let redirectUri: string;

  try {
    const body = await req.json();
    if (typeof body.code !== "string" || !body.code.trim()) {
      throw new Error("code 없음");
    }
    if (typeof body.redirect_uri !== "string" || !body.redirect_uri.trim()) {
      throw new Error("redirect_uri 없음");
    }
    code = body.code.trim();
    redirectUri = body.redirect_uri.trim();
  } catch (e) {
    return jsonError(
      "invalid_body",
      `code, redirect_uri 필수: ${e instanceof Error ? e.message : e}`,
      400,
    );
  }

  // ─── 카카오 OAuth 흐름 ───────────────────────────────────────────────────

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. 인가코드 → 카카오 액세스토큰
    const kakaoToken = await exchangeKakaoCode(
      code,
      redirectUri,
      KAKAO_CLIENT_ID,
      KAKAO_CLIENT_SECRET,
    );

    // 2. 카카오 사용자 정보
    const kakaoUserRaw = await getKakaoUserInfo(kakaoToken.access_token);
    const { providerId, email, nickname, profileImage } =
      normalizeKakaoUser(kakaoUserRaw);

    // 3. 기존 유저 조회 (member 테이블 — provider_id가 PK보다 빠름)
    //    service_role → RLS 우회, 직접 조회 가능
    const { data: existingMember } = await supabaseAdmin
      .from("member")
      .select("id")
      .eq("provider", "kakao")
      .eq("provider_id", providerId)
      .maybeSingle();

    let userId: string;

    if (existingMember) {
      // 기존 유저: auth metadata + nickname/profile_image 갱신
      userId = existingMember.id as string;

      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          provider: "kakao",
          provider_id: providerId,
          nickname,
          profile_image: profileImage,
        },
      });

      await supabaseAdmin
        .from("member")
        .update({ nickname, profile_image: profileImage })
        .eq("id", userId);
    } else {
      // 신규 유저: auth user 생성
      const { data: newUserData, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            provider: "kakao",
            provider_id: providerId,
            nickname,
            profile_image: profileImage,
          },
        });

      if (createError || !newUserData.user) {
        // email 충돌(synthetic email 포함) — 재조회
        if (
          createError?.message?.includes("already been registered") ||
          createError?.status === 422
        ) {
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000,
          });
          const found = users?.find((u) => u.email === email);
          if (!found) {
            return jsonError(
              "user_conflict",
              "email 충돌이지만 사용자를 찾을 수 없음",
              500,
            );
          }
          userId = found.id;
          // member 행이 없으면 생성 (이 분기: auth user가 있지만 member가 없는 엣지케이스)
        } else {
          throw createError ?? new Error("user creation returned null");
        }
      } else {
        userId = newUserData.user.id;
      }

      // public.member 행 생성 (upsert: id PK 충돌 시 안전)
      const { error: memberError } = await supabaseAdmin.from("member").upsert(
        {
          id: userId,
          provider: "kakao",
          provider_id: providerId,
          nickname,
          profile_image: profileImage,
        },
        { onConflict: "id", ignoreDuplicates: false },
      );

      if (memberError) {
        // member 생성 실패는 치명적(auth user만 있으면 일관성 깨짐)
        // auth user 롤백: 모범 사례 = 원자성 보장을 위해 auth user도 삭제
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return jsonError(
          "member_creation_failed",
          `member 행 생성 실패: ${memberError.message}`,
          500,
        );
      }
    }

    // 4. magic link 생성 → hashed_token
    //    클라이언트: supabase.auth.verifyOtp({ token_hash, type: 'email' })
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { shouldCreateUser: false },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      throw linkError ?? new Error("generateLink failed — hashed_token 없음");
    }

    return jsonOk({
      hashed_token: linkData.properties.hashed_token,
      type: "email",
    });
  } catch (err) {
    if (err instanceof KakaoAuthError) {
      return jsonError("kakao_error", err.message, 502);
    }
    const message = err instanceof Error ? err.message : "internal_error";
    console.error("[auth-kakao] unexpected:", message);
    return jsonError("internal_error", message, 500);
  }
});
