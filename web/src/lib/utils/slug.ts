// lib/utils/slug.ts — slug 생성 유틸
// architecture: goal slug = 인스타 바이오 링크 경로 (해낼게.app/g/{slug})

/** 한국어+영어 제목을 URL-safe slug로 변환 */
export function toSlug(text: string, suffix?: string): string {
  const base = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .slice(0, 40);
  return suffix ? `${base}-${suffix}` : base;
}

/** 슬러그 유효성 검사 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9가-힣-]{2,60}$/.test(slug);
}
