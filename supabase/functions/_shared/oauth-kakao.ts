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
    phone_number?: string;
    phone_number_needs_agreement?: boolean;
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
 * 요청 scope: profile_nickname,profile_image,account_email,phone_number
 * (카카오 디벨로퍼 앱 동의항목 설정 필수)
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
  /** 국내 휴대전화 표기(숫자만, 예: 01012345678). 미동의/국외/비정상이면 null. */
  phone: string | null;
}

/**
 * KakaoUserInfo → 내부 정규화 형태로 변환.
 * - 이메일 없거나 미인증: synthetic email 사용(unique = kakao_id 기반)
 * - 닉네임 없음: "해낼게 유저" 기본값
 */
/** synthetic 이메일 도메인 suffix — normalizeKakaoUser의 폴백과 반드시 동기화 */
export const SYNTHETIC_KAKAO_EMAIL_SUFFIX = "@kakao.haenael.app";

/**
 * 이메일이 이 카카오 사용자의 synthetic 이메일(`kakao_{providerId}@kakao.haenael.app`)과
 * **정확히 일치**하는지 판별한다.
 *
 * 보안 결함3 수정: 자동 계정연결(별도 소유권 증명 없이 기존 유저에 새
 * provider_id를 붙이는 동작)은 synthetic 이메일(카카오 고유 id 기반이라
 * 위조 불가·유니크 보장)에서만 안전하다. 카카오가 검증한 real 이메일이
 * 기존 계정과 충돌하면 그 계정을 "내 것"이라 주장하는 것과 다를 바 없는
 * 신원 도용 벡터가 되므로 자동연결을 금지해야 한다.
 *
 * 보안 결함3 재리뷰(P2) 보강: suffix(`@kakao.haenael.app`)만 검사하면 카카오가
 * 검증한 real 이메일이 우연히/의도적으로 이 도메인으로 끝날 때 synthetic으로
 * 오인돼 자동연결 우회가 가능하다. 반드시 `kakao_${providerId}@kakao.haenael.app`
 * 정확 문자열과 대조한다(providerId는 카카오가 부여한 위조 불가 값).
 */
export function isSyntheticKakaoEmail(
  email: string,
  providerId: string,
): boolean {
  return email === `kakao_${providerId}${SYNTHETIC_KAKAO_EMAIL_SUFFIX}`;
}

/**
 * 카카오 `phone_number`를 국내 휴대전화 숫자 표기로 정규화한다.
 * 공식 응답의 국내 형식(`+82 10 1234 5678`, `+82 10-1234-5678`)과
 * 이미 국내 표기인 입력만 허용한다. 문자 본인인증이나 해외 번호 추정은 하지 않는다.
 */
export function normalizeKoreanMobilePhone(phone: unknown): string | null {
  if (typeof phone !== "string" || !phone.trim()) return null;

  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0082")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("82")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("10")) digits = `0${digits}`;

  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

export function normalizeKakaoUser(user: KakaoUserInfo): KakaoUserNormalized {
  const hasVerifiedEmail = user.kakao_account?.email &&
    user.kakao_account.is_email_verified &&
    user.kakao_account.is_email_valid;

  return {
    providerId: String(user.id),
    email: hasVerifiedEmail
      ? user.kakao_account!.email!
      : `kakao_${user.id}@kakao.haenael.app`,
    nickname: user.kakao_account?.profile?.nickname ??
      user.properties?.nickname ??
      "해낼게 유저",
    profileImage: user.kakao_account?.profile?.profile_image_url ??
      user.properties?.profile_image ??
      null,
    phone: normalizeKoreanMobilePhone(user.kakao_account?.phone_number),
  };
}
