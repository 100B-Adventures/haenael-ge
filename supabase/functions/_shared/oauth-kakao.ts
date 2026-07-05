// _shared/oauth-kakao.ts — 카카오 커스텀 OAuth 어댑터
// 슬라이스 #3 실구현.
// ref: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
// 설계: design-patterns.md §11a — 카카오는 Supabase 네이티브 미지원 → 커스텀 EF 어댑터

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  refresh_token_expires_in: number;
  expires_in: number;
  scope: string;
  id_token?: string; // OIDC scope 포함 시
}

export interface KakaoUserInfo {
  id: number; // 카카오 고유 사용자 ID (stable, long-lived)
  kakao_account?: {
    email?: string;
    is_email_verified?: boolean;
    is_email_valid?: boolean;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
      is_default_image?: boolean;
    };
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  connected_at?: string;
}

// ─── 에러 클래스 ──────────────────────────────────────────────────────────────

export class KakaoAuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "KakaoAuthError";
    this.code = code;
  }
}

// ─── 인가코드 → 액세스토큰 교환 ──────────────────────────────────────────────

/**
 * 카카오 인가코드(code)를 액세스토큰으로 교환한다.
 * 호출: auth-kakao EF 에서만. 키는 EF env로만 주입.
 *
 * ref: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#request-token
 */
export async function exchangeKakaoCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
): Promise<KakaoTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  let response: Response;
  try {
    response = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: params.toString(),
    });
  } catch (networkErr) {
    throw new KakaoAuthError(
      "network_error",
      `카카오 토큰 엔드포인트 연결 실패: ${networkErr}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(empty)");
    throw new KakaoAuthError(
      "token_exchange_failed",
      `카카오 토큰 교환 실패 status=${response.status}: ${body}`,
    );
  }

  const data = await response.json().catch(() => null);
  if (!data?.access_token) {
    throw new KakaoAuthError(
      "invalid_token_response",
      "카카오 토큰 응답에 access_token 없음",
    );
  }

  return data as KakaoTokenResponse;
}

// ─── 사용자 정보 조회 ─────────────────────────────────────────────────────────

/**
 * 카카오 액세스토큰으로 사용자 정보를 조회한다.
 *
 * ref: https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#req-user-info
 * 요청 scope: profile_nickname,profile_image,account_email (카카오 디벨로퍼 앱 설정 필수)
 */
export async function getKakaoUserInfo(
  accessToken: string,
): Promise<KakaoUserInfo> {
  let response: Response;
  try {
    response = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });
  } catch (networkErr) {
    throw new KakaoAuthError(
      "network_error",
      `카카오 사용자 정보 엔드포인트 연결 실패: ${networkErr}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(empty)");
    throw new KakaoAuthError(
      "user_info_failed",
      `카카오 사용자 정보 조회 실패 status=${response.status}: ${body}`,
    );
  }

  const data = await response.json().catch(() => null);
  if (!data?.id) {
    throw new KakaoAuthError(
      "invalid_user_response",
      "카카오 사용자 응답에 id 없음",
    );
  }

  return data as KakaoUserInfo;
}

// ─── 사용자 정보 추출 헬퍼 ────────────────────────────────────────────────────

export interface KakaoUserNormalized {
  providerId: string;
  /** 인증된 이메일 또는 synthetic(`kakao_{id}@kakao.haenael.app`) */
  email: string;
  nickname: string;
  profileImage: string | null;
}

/**
 * KakaoUserInfo → 내부 정규화 형태로 변환.
 * - 이메일 없거나 미인증: synthetic email 사용(unique = kakao_id 기반)
 * - 닉네임 없음: "해낼게 유저" 기본값
 */
export function normalizeKakaoUser(user: KakaoUserInfo): KakaoUserNormalized {
  const hasVerifiedEmail =
    user.kakao_account?.email &&
    user.kakao_account.is_email_verified &&
    user.kakao_account.is_email_valid;

  return {
    providerId: String(user.id),
    email: hasVerifiedEmail
      ? user.kakao_account!.email!
      : `kakao_${user.id}@kakao.haenael.app`,
    nickname:
      user.kakao_account?.profile?.nickname ??
      user.properties?.nickname ??
      "해낼게 유저",
    profileImage:
      user.kakao_account?.profile?.profile_image_url ??
      user.properties?.profile_image ??
      null,
  };
}
