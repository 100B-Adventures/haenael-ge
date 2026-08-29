import { describe, expect, it } from "vitest";
import { getCashoutErrorMessage } from "@/lib/cashout-errors";

describe("cashout error copy", () => {
  it("TC-ERR-COPY-01 cashout_below_minimum의 총보유 자격과 신청량 하한을 함께 안내한다", () => {
    const message = getCashoutErrorMessage("cashout_below_minimum");

    expect(message).toBe(
      "모인 클로버가 30개 이상이면 지급 가능한 클로버를 1개 이상 신청할 수 있어요.",
    );
    expect(message).toMatch(/모인 클로버가 30개 이상/);
    expect(message).toMatch(/지급 가능한 클로버를 1개 이상/);
    expect(message).not.toMatch(/친구 응원분 30클로버부터|신청량 최소 30/);
  });
});
