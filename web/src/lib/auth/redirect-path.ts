// lib/auth/redirect-path.ts — 카카오 OAuth 리다이렉트 경로 화이트리스트
//
// 보안 결함 수정 (Codex 2nd-pass 결함2): 기존 isSafeRedirectPath는
// `/\evil.example` 같은 백슬래시 경로를 통과시켰다. 브라우저/URL 파서가
// `\`를 `/`로 정규화하면 `//evil.example` → 프로토콜 상대 URL로 외부
// 호스트로 리다이렉트될 수 있다(오픈 리다이렉트).
//
// 화이트리스트: 내부 경로 세그먼트만 허용 — 영숫자/슬래시/언더스코어/하이픈.
// 콜론(:)·백슬래시(\)·이중슬래시(//) 는 전부 이 정규식에서 이미 배제된다.
const SAFE_REDIRECT_PATH_RE = /^\/[A-Za-z0-9/_-]*$/;

/**
 * path가 내부 상대 경로("/"로 시작하는 화이트리스트 문자만 포함)인지 검증한다.
 * OAuth state 파싱 지점과 callback 양쪽에서 동일하게 사용(이중 방어).
 */
export function isSafeRedirectPath(path: unknown): path is string {
  if (typeof path !== "string") return false;
  if (path.includes("\\")) return false; // 백슬래시 오픈 리다이렉트 방지
  if (path.startsWith("//")) return false;
  if (path.includes(":")) return false;
  return SAFE_REDIRECT_PATH_RE.test(path);
}
