// oauth-kakao.ts — 카카오 커스텀 OAuth 토큰교환 → Supabase 세션
// 슬라이스 #1 scaffold: 타입 stub. 실구현은 슬라이스 #3 (auth-kakao EF).

export interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
      profile_image_url?: string;
    };
  };
}

/** ⚠️ 슬라이스 #3 auth-kakao EF에서 실구현 */
export async function exchangeKakaoCode(
  _code: string,
  _redirectUri: string,
): Promise<KakaoTokenResponse> {
  throw new Error("Not implemented — 슬라이스 #3 에서 구현");
}

export async function getKakaoUserInfo(
  _accessToken: string,
): Promise<KakaoUserInfo> {
  throw new Error("Not implemented — 슬라이스 #3 에서 구현");
}
