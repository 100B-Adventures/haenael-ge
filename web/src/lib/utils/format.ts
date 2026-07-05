// lib/utils/format.ts — 포맷 유틸

/** 금액을 한국 원화 표기로 포맷 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

/** D-day 계산 (목표 마감일까지 남은 일수) */
export function calcDday(deadline: string | Date): number {
  const target = new Date(deadline);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** 날짜 포맷 (한국 locale) */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}
