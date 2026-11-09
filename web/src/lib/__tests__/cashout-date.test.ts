import { describe, expect, it } from "vitest";
import { formatCashoutDate, formatCashoutDateTime } from "@/lib/cashout";

// 독립 검증 F-4(2026-11-10): 서버는 UTC 로 돌아 KST 00:00~08:59 신청이 하루 전 날짜로 보였다.
describe("환전 날짜는 한국 시간으로 표시한다", () => {
  it("UTC 전날 18:49 신청은 한국 날짜 다음 날로 보인다", () => {
    expect(formatCashoutDate("2026-11-09T18:49:19Z")).toBe("2026. 11. 10.");
  });

  it("UTC 14:59 신청은 한국 날짜 같은 날 23:59 이다", () => {
    expect(formatCashoutDate("2026-11-09T14:59:59Z")).toBe("2026. 11. 9.");
    expect(formatCashoutDateTime("2026-11-09T14:59:59Z")).toContain("11:59:59");
  });
});
