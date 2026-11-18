import { describe, expect, it } from "vitest";
import { parseDeepLink } from "../lib/deep-links";
import { availableProviders, productForAmount } from "../lib/purchase-catalog";
import { decideUpdate } from "../lib/update-policy";
import { shouldRequestReview } from "../lib/review-policy";
import { canDeleteAccount, isPushCopySafe } from "../lib/policy";
import { validateGoalDraft } from "../lib/goal-validation";

describe("모바일 앱 기능 계약", () => {
  it("TC-APP-01-1 로그인 정상 경로: HTTPS 목표 딥링크를 목표 화면으로 해석한다", () => {
    expect(parseDeepLink("https://haenael.app/g/run-fast")).toEqual({ kind: "goal", slug: "run-fast" });
  });

  it("TC-APP-01-2 로그인 거절 경로: 알 수 없는 링크는 홈으로 안전하게 보낸다", () => {
    expect(parseDeepLink("https://haenael.app/unknown")).toEqual({ kind: "home" });
  });

  it("TC-APP-04-1 목표 정상 경로: 2자 이상 목표와 날짜를 허용한다", () => {
    expect(validateGoalDraft({ title: "첫 책", dueDate: "2027-03-01" })).toBeNull();
  });

  it("TC-APP-04-2 목표 거절 경로: 한 글자 목표를 거절한다", () => {
    expect(validateGoalDraft({ title: "책", dueDate: "2027-03-01" })).toContain("2자");
  });

  it("TC-APP-05-1 푸시 정상 경로: 금액 없는 응원 알림을 허용한다", () => {
    expect(isPushCopySafe("친구가 응원을 보냈어요")).toBe(true);
  });

  it("TC-APP-05-2 푸시 거절 경로: 클로버 수가 든 본문을 거절한다", () => {
    expect(isPushCopySafe("🍀 3개를 받았어요")).toBe(false);
  });

  it("TC-APP-02-1 iOS 결제 정상 경로: StoreKit만 노출한다", () => {
    expect(availableProviders("ios")).toEqual(["APPLE"]);
  });

  it("TC-APP-02-2 결제 거절 경로: 카탈로그 밖 수량을 거절한다", () => {
    expect(() => productForAmount(2)).toThrow("클로버 수량");
  });

  it("TC-APP-03-1 Android 결제 정상 경로: Play와 대체결제를 함께 노출한다", () => {
    expect(availableProviders("android")).toEqual(["GOOGLE_PLAY", "GOOGLE_ALTERNATIVE"]);
  });

  it("TC-APP-03-2 가격 경계: 3클로버의 스토어/토스 가격을 분리한다", () => {
    expect(productForAmount(3)).toMatchObject({ storePrice: 3600, tossPrice: 3300 });
  });

  it("TC-APP-07-1 리뷰 정상 경로: 응원 3건 이상 첫 워드맵에서 요청한다", () => {
    expect(shouldRequestReview({ cheerCount: 3, lastRequestedAt: null, justHadFailure: false })).toBe(true);
  });

  it("TC-APP-07-2 리뷰 거절 경로: 오류 직후에는 요청하지 않는다", () => {
    expect(shouldRequestReview({ cheerCount: 9, lastRequestedAt: null, justHadFailure: true })).toBe(false);
  });

  it("TC-APP-08-1 강제 업데이트 정상 경로: 최소 버전 미만을 잠근다", () => {
    expect(decideUpdate("1.2.9", { minimumVersion: "1.3.0", storeUrl: "store" }).required).toBe(true);
  });

  it("TC-APP-08-2 강제 업데이트 경계: 같은 버전은 통과한다", () => {
    expect(decideUpdate("1.3.0", { minimumVersion: "1.3.0", storeUrl: "store" }).required).toBe(false);
  });

  it("TC-APP-09-1 탈퇴 정상 경로: 잔액과 진행 환전이 없을 때만 허용한다", () => {
    expect(canDeleteAccount({ eligible: true, clover_balance: 0, pending_cashout_count: 0, blocked_reasons: {} })).toBe(true);
  });

  it("TC-APP-09-2 탈퇴 거절 경로: 보류 환전이 있으면 차단한다", () => {
    expect(canDeleteAccount({ eligible: false, clover_balance: 0, pending_cashout_count: 1, blocked_reasons: { cashout: "cashout_in_progress" } })).toBe(false);
  });
});
