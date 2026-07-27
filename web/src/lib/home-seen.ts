// lib/home-seen.ts — /home 마지막 방문 시각 localStorage 키.
// owner bar(/g/[slug])의 "새 응원 N개" 배지가 이 값과 cheer.created_at을 비교해 계산한다.
// 서버 스키마 변경 없이 클라이언트에서만 판정(DESIGN.md §6-(b′) 무관, user-flow.md §1.3 (b) owner bar).

export const HOME_LAST_SEEN_KEY = "haenael_last_home_seen";
