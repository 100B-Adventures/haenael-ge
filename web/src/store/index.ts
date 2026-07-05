// store/index.ts — 경량 Zustand 전역 상태 (draft·게스트세션)
// folder-structure.md: "상태(경량 Zustand) — draft·게스트세션"

import { create } from "zustand";
import type { GoalDraft } from "@/lib/utils/draft";

interface AppStore {
  /** 온보딩 draft (로그인 전 보존) */
  draft: GoalDraft | null;
  setDraft: (draft: GoalDraft | null) => void;

  /** 게스트 세션 여부 (anonymous auth) */
  isGuest: boolean;
  setIsGuest: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),

  isGuest: false,
  setIsGuest: (v) => set({ isGuest: v }),
}));
