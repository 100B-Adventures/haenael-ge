// lib/utils/draft.ts — 목표 draft 로컬 저장 (localStorage)
// 온보딩 중 비로그인 상태에서 목표를 잃지 않도록 보존.
// 슬라이스 #4: 필드명을 DB 스키마(reason, due_date)와 정합.

const DRAFT_KEY = "haenael_goal_draft";
const SAVED_SLUG_KEY = "haenael_saved_slug";
const SAVE_INTENT_KEY = "haenael_save_intent";
const COVER_DB_NAME = "haenael_goal_draft_assets";
const COVER_STORE_NAME = "pending_cover";
const COVER_RECORD_KEY = "cover";

export interface GoalDraft {
  /** "○○ 해낼게" 목표 제목 (suffix 없이 저장) */
  title: string;
  /** 왜 — 응원의 이유 (cheer.message의 소스) */
  reason: string;
  /** 마감일 ISO date string (YYYY-MM-DD) */
  due_date: string;
  /** 사용자가 명시적으로 고른 커버. 없으면 제목 기반 자동 선택 */
  cover_preset_key?: string;
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

/**
 * 저장 의도(save intent) 마킹 — "로그인 이후에만 링크 발급" (회장 2026-07-19).
 *
 * 사용자가 "저장하고 내 링크 받기" 버튼을 실제로 눌렀을 때만 세팅한다.
 * 로그인 후 onboarding으로 복귀했을 때, 이 플래그가 있는 draft만
 * 자동 커밋(1회) 대상이 된다. 세션만 살아있고(재방문 등) 버튼을 누른 적
 * 없으면 이 플래그가 없으므로 자동저장되지 않는다 — 핵심 회귀 방지.
 */
export function saveSaveIntent(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVE_INTENT_KEY, "1");
}

export function hasSaveIntent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SAVE_INTENT_KEY) === "1";
}

export function clearSaveIntent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_INTENT_KEY);
}

type StoredCoverFile = {
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
};

function openCoverDb(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(COVER_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(COVER_STORE_NAME)) {
        request.result.createObjectStore(COVER_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraftCoverFile(file: File): Promise<void> {
  const db = await openCoverDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(COVER_STORE_NAME, "readwrite");
    transaction.objectStore(COVER_STORE_NAME).put(
      {
        blob: file,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
      } satisfies StoredCoverFile,
      COVER_RECORD_KEY,
    );
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function loadDraftCoverFile(): Promise<File | null> {
  const db = await openCoverDb();
  if (!db) return null;
  const stored = await new Promise<StoredCoverFile | undefined>((resolve, reject) => {
    const request = db
      .transaction(COVER_STORE_NAME, "readonly")
      .objectStore(COVER_STORE_NAME)
      .get(COVER_RECORD_KEY);
    request.onsuccess = () => resolve(request.result as StoredCoverFile | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!stored) return null;
  return new File([stored.blob], stored.name, {
    type: stored.type,
    lastModified: stored.lastModified,
  });
}

export async function clearDraftCoverFile(): Promise<void> {
  const db = await openCoverDb();
  if (!db) return;
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(COVER_STORE_NAME, "readwrite");
    transaction.objectStore(COVER_STORE_NAME).delete(COVER_RECORD_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}
