// lib/utils/draft.ts — 목표 draft 로컬 저장 (localStorage)
// 온보딩 중 비로그인 상태에서 목표를 잃지 않도록 보존.
// 슬라이스 #4: 필드명을 DB 스키마(reason, due_date)와 정합.

const DRAFT_KEY = "haenael_goal_draft";
const SAVED_SLUG_KEY = "haenael_saved_slug";

export interface GoalDraft {
  /** "○○ 해낼게" 목표 제목 (suffix 없이 저장) */
  title: string;
  /** 왜 — 응원의 이유 (cheer.message의 소스) */
  reason: string;
  /** 마감일 ISO date string (YYYY-MM-DD) */
  due_date: string;
  savedAt: string;
}

export function saveDraft(draft: Omit<GoalDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  const entry: GoalDraft = { ...draft, savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(entry));
}

export function loadDraft(): GoalDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoalDraft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DRAFT_KEY);
}

/** 저장 완료된 slug를 보관 — 로그인 후 onboarding 복귀 시 ShareLinkCard 표시 */
export function savePendingSlug(slug: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVED_SLUG_KEY, slug);
}

export function loadPendingSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SAVED_SLUG_KEY);
}

export function clearPendingSlug(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVED_SLUG_KEY);
}
