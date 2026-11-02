import { describe, expect, it } from "vitest";
import {
  isVisualImageSnapshotInScope,
  sanitizeVisualAssetUrl,
} from "../../e2e/support/visual-ready";

describe("visual ready image policy", () => {
  it("query token을 제거하고 viewport 밖 lazy image를 검증 범위에 둔다", () => {
    expect(sanitizeVisualAssetUrl(
      "https://example.com/object/avatar.png?token=secret#fragment",
      "https://example.com",
    )).toBe("https://example.com/object/avatar.png");
    expect(isVisualImageSnapshotInScope({
      hiddenByAttribute: false,
      display: "block",
      visibility: "visible",
      width: 40,
      height: 40,
    })).toBe(true);
  });

  it("명시적으로 숨긴 image는 검증 범위에서 제외한다", () => {
    expect(isVisualImageSnapshotInScope({
      hiddenByAttribute: true,
      display: "block",
      visibility: "visible",
      width: 40,
      height: 40,
    })).toBe(false);
  });

  it("data URL payload는 진단에 노출하지 않는다", () => {
    expect(sanitizeVisualAssetUrl("data:image/png;base64,SECRET", "https://example.com"))
      .toBe("data:image/png;base64");
  });
});
