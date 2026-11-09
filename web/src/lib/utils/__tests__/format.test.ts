import { describe, expect, it } from "vitest";
import { formatDate } from "../format";

describe("formatDate", () => {
  it("QA-REVERIFY-VIEWPORT-01 서버와 브라우저에서 한국 날짜를 동일하게 만든다", () => {
    expect(formatDate("2026-11-08T15:30:00.000Z")).toBe("2026년 11월 9일");
  });
});
