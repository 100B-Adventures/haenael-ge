// auth-kakao/index.test.ts — Edge Function 단위 테스트 (Deno native)
// 실행: deno test --allow-net --allow-env supabase/functions/auth-kakao/index.test.ts
//
// ⚠️ 참고: 이 테스트는 Deno 런타임이 필요합니다.
// 로컬 개발 환경에 Deno가 없으면 `supabase functions serve auth-kakao` 후 curl로 smoke test.
//
// 테스트 전략:
//   - EF를 직접 임포트하지 않고, 핵심 어댑터 함수(oauth-kakao.ts)를 단위 테스트
//   - HTTP 레벨 smoke test는 서버 기동 후 curl로 검증

import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  isSyntheticKakaoEmail,
  KakaoAuthError,
  normalizeKakaoUser,
  type KakaoUserInfo,
} from "../_shared/oauth-kakao.ts";

// ─── normalizeKakaoUser 단위 ──────────────────────────────────────────────────

Deno.test("normalizeKakaoUser — 인증된 email 있음", () => {
  const user: KakaoUserInfo = {
    id: 12345678,
    kakao_account: {
      email: "test@example.com",
      is_email_verified: true,
      is_email_valid: true,
      profile: {
        nickname: "테스터",
        profile_image_url: "https://k.kakaocdn.net/img.jpg",
      },
    },
  };

  const result = normalizeKakaoUser(user);
  assertEquals(result.email, "test@example.com");
  assertEquals(result.nickname, "테스터");
  assertEquals(result.profileImage, "https://k.kakaocdn.net/img.jpg");
  assertEquals(result.providerId, "12345678");
});

Deno.test("normalizeKakaoUser — email 미인증 → synthetic email", () => {
  const user: KakaoUserInfo = {
    id: 99999,
    kakao_account: {
      email: "not_verified@example.com",
      is_email_verified: false,
      is_email_valid: true,
    },
  };

  const result = normalizeKakaoUser(user);
  assertEquals(result.email, "kakao_99999@kakao.haenael.app");
});

Deno.test("normalizeKakaoUser — email 없음 → synthetic email", () => {
  const user: KakaoUserInfo = {
    id: 777,
    properties: { nickname: "프로퍼티닉네임" },
  };

  const result = normalizeKakaoUser(user);
  assertEquals(result.email, "kakao_777@kakao.haenael.app");
  assertEquals(result.nickname, "프로퍼티닉네임");
  assertEquals(result.profileImage, null);
});

Deno.test("normalizeKakaoUser — 닉네임 없음 → 기본값", () => {
  const user: KakaoUserInfo = { id: 1 };
  const result = normalizeKakaoUser(user);
  assertEquals(result.nickname, "해낼게 유저");
});

// ─── isSyntheticKakaoEmail — 보안 결함3 회귀 테스트 ──────────────────────────
// (email 충돌 시 real 이메일은 자동연결 거부, synthetic은 허용해야 함)

Deno.test("isSyntheticKakaoEmail — providerId와 정확히 일치하면 true", () => {
  assertEquals(isSyntheticKakaoEmail("kakao_12345@kakao.haenael.app", "12345"), true);
  assertEquals(isSyntheticKakaoEmail("kakao_777@kakao.haenael.app", "777"), true);
});

Deno.test("isSyntheticKakaoEmail — real 이메일이면 false (자동연결 거부 대상)", () => {
  assertEquals(isSyntheticKakaoEmail("test@example.com", "12345"), false);
  assertEquals(isSyntheticKakaoEmail("victim@gmail.com", "12345"), false);
});

Deno.test("isSyntheticKakaoEmail — 도메인만 비슷한 위조 시도는 false", () => {
  // suffix가 아니라 부분 포함이면 안 됨 (예: kakao.haenael.app.evil.com)
  assertEquals(
    isSyntheticKakaoEmail("kakao_1@kakao.haenael.app.evil.com", "1"),
    false,
  );
});

Deno.test("isSyntheticKakaoEmail — P2: 도메인으로 끝나는 real 이메일은 providerId 불일치로 false", () => {
  // 공격자가 검증한 real 이메일이 우연/의도적으로 synthetic 도메인으로 끝나도
  // providerId가 일치하지 않으면 synthetic 아님 → 자동연결 거부
  assertEquals(
    isSyntheticKakaoEmail("attacker@kakao.haenael.app", "99999"),
    false,
  );
  assertEquals(
    isSyntheticKakaoEmail("kakao_11111@kakao.haenael.app", "99999"),
    false,
  );
});

// ─── KakaoAuthError ───────────────────────────────────────────────────────────

Deno.test("KakaoAuthError — instanceof Error", () => {
  const err = new KakaoAuthError("test_code", "테스트 메시지");
  assertInstanceOf(err, Error);
  assertEquals(err.name, "KakaoAuthError");
  assertEquals(err.code, "test_code");
  assertEquals(err.message, "테스트 메시지");
});

// ─── exchangeKakaoCode — 네트워크 에러 (fetch mock) ─────────────────────────

Deno.test("exchangeKakaoCode — 잘못된 code → KakaoAuthError", async () => {
  // 실제 Kakao 서버에 잘못된 code로 호출 → token_exchange_failed
  // ⚠️ 이 테스트는 네트워크 접근이 필요합니다 (--allow-net)
  // CI/로컬에서 네트워크 없으면 skip.
  const { exchangeKakaoCode } = await import("../_shared/oauth-kakao.ts");

  await assertRejects(
    () =>
      exchangeKakaoCode(
        "invalid_code_for_test",
        "http://localhost:3000/auth/kakao/callback",
        "test_client_id",
        "test_client_secret",
      ),
    KakaoAuthError,
  );
});

// ─── EF HTTP smoke test (서버 기동 시) ──────────────────────────────────────

// 아래 테스트는 `supabase functions serve auth-kakao` 기동 후 수동 실행:
//
// curl -X OPTIONS http://localhost:54321/functions/v1/auth-kakao \
//   -H "Access-Control-Request-Method: POST" → 204
//
// curl -X GET http://localhost:54321/functions/v1/auth-kakao \
//   -H "Authorization: Bearer ${ANON_KEY}" → 405
//
// curl -X POST http://localhost:54321/functions/v1/auth-kakao \
//   -H "Authorization: Bearer ${ANON_KEY}" \
//   -H "Content-Type: application/json" \
//   -d '{}' → 400 (code 없음) or 503 (env 없음)
