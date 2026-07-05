// draft.test.ts — draft 유틸 단위 테스트

import { describe, it, expect, beforeEach } from "vitest";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  savePendingSlug,
  loadPendingSlug,
  clearPendingSlug,
} from "../draft";

// jsdom 환경에서 localStorage 사용 가능

describe("draft utils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saveDraft + loadDraft: 저장 후 복원", () => {
    saveDraft({ title: "편입", reason: "도서관", due_date: "2026-09-15" });
    const loaded = loadDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.title).toBe("편입");
    expect(loaded?.reason).toBe("도서관");
    expect(loaded?.due_date).toBe("2026-09-15");
    expect(loaded?.savedAt).toBeDefined();
  });

  it("loadDraft: 없으면 null 반환", () => {
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft: 삭제 후 null", () => {
    saveDraft({ title: "test", reason: "", due_date: "2026-01-01" });
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("savePendingSlug + loadPendingSlug", () => {
    savePendingSlug("abc123");
    expect(loadPendingSlug()).toBe("abc123");
    clearPendingSlug();
    expect(loadPendingSlug()).toBeNull();
  });
});
