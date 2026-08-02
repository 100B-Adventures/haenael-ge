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
  isSyntheticKakaoEmail,
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
    const {
      providerId,
      email,
      nickname,
      profileImage,
      phone,
      shouldUpdatePhone,
    } = normalizeKakaoUser(kakaoUserRaw);

    // 3. 기존 유저 조회 (member 테이블 — provider_id가 PK보다 빠름)
    //    service_role → RLS 우회, 직접 조회 가능
    const { data: existingMember } = await supabaseAdmin
      .from("member")
      .select("id,phone")
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

      // 최신 번호는 교체, 명시적 동의 필요/철회 상태는 NULL로 삭제한다.
      // 전화번호 관련 필드 자체가 없는 응답에서만 기존 값을 보존한다.
      const { error: memberUpdateError } = await supabaseAdmin
        .from("member")
        .update({
          nickname,
          profile_image: profileImage,
          ...(shouldUpdatePhone ? { phone } : {}),
        })
        .eq("id", userId);

      if (memberUpdateError) {
        throw new Error(`member 갱신 실패: ${memberUpdateError.message}`);
      }
    } else {
      // 신규 유저: auth user 생성
      const { data: newUserData, error: createError } = await supabaseAdmin.auth
        .admin.createUser({
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
        // email 충돌 — 기존 Auth 유저가 이미 이 이메일을 쓰고 있음
        const isConflict =
          createError?.message?.includes("already been registered") ||
          createError?.status === 422;

        if (isConflict) {
          // 보안 결함3 수정: real(카카오 검증) 이메일 충돌은 소유권 증명 없이
          // 자동연결하지 않는다. synthetic 이메일(`kakao_{id}@kakao.haenael.app`,
          // 카카오 id 기반이라 위조 불가·유니크)만 안전하게 자동연결한다.
          // 현재는 scope에 account_email이 없어 이메일 scope 미보유 → 이 분기는
          // 이메일 scope 추가(비즈 앱 전환) 이후에나 real 이메일로 도달 가능하지만,
          // 그 전환 시 즉시 취약해지므로 선제 방어한다.
          if (!isSyntheticKakaoEmail(email, providerId)) {
            return jsonError(
              "email_conflict_manual_link_required",
              "이미 다른 계정에서 사용 중인 이메일입니다. 계정 연결은 로그인 후 별도 절차로 진행해주세요.",
              409,
            );
          }

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
          phone,
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
      // shouldCreateUser는 signInWithOtp 옵션이지 generateLink 옵션이 아니다(GenerateLinkOptions에 없음).
      // magiclink generateLink는 대상 유저가 이미 존재해야 hashed_token을 만들므로,
      // 이 속성 제거로 기존 동작(기존 유저만 링크 생성) 그대로 유지 — 타입에러(TS2353)만 해소.
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
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
