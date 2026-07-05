// lib/utils/draft.ts — 목표 draft 로컬 저장 (localStorage)
// 온보딩 중 비로그인 상태에서 목표를 잃지 않도록 보존.

const DRAFT_KEY = "haenael_goal_draft";

export interface GoalDraft {
  title: string;
  description?: string;
  deadline?: string;
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
