// redirect-path.test.ts — isSafeRedirectPath 화이트리스트 검증
// 보안 결함2 회귀 테스트: 백슬래시/이중슬래시/콜론 오픈 리다이렉트 거부.

import { describe, it, expect } from "vitest";
import { isSafeRedirectPath } from "../redirect-path";

describe("isSafeRedirectPath", () => {
  it("정상 내부 경로는 허용", () => {
    expect(isSafeRedirectPath("/onboarding")).toBe(true);
    expect(isSafeRedirectPath("/g/my-goal_123")).toBe(true);
    expect(isSafeRedirectPath("/")).toBe(true);
  });

  it("백슬래시 포함 경로는 거부 (브라우저가 \\ → / 정규화하는 오픈 리다이렉트)", () => {
    expect(isSafeRedirectPath("/\\evil.example")).toBe(false);
    expect(isSafeRedirectPath("/\\\\evil.example")).toBe(false);
    expect(isSafeRedirectPath("/foo\\bar")).toBe(false);
  });

  it("이중 슬래시(프로토콜 상대 URL)는 거부", () => {
    expect(isSafeRedirectPath("//evil.example")).toBe(false);
  });

  it("콜론(스킴 포함 URL)은 거부", () => {
    expect(isSafeRedirectPath("/javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectPath("https://evil.example")).toBe(false);
  });

  it("화이트리스트 밖 문자(공백·물음표 등)는 거부", () => {
    expect(isSafeRedirectPath("/foo bar")).toBe(false);
    expect(isSafeRedirectPath("/foo?x=1")).toBe(false);
    expect(isSafeRedirectPath("/foo#frag")).toBe(false);
  });

  it("/ 로 시작하지 않으면 거부", () => {
    expect(isSafeRedirectPath("onboarding")).toBe(false);
    expect(isSafeRedirectPath("")).toBe(false);
  });

  it("문자열이 아니면 거부", () => {
    expect(isSafeRedirectPath(null)).toBe(false);
    expect(isSafeRedirectPath(undefined)).toBe(false);
    expect(isSafeRedirectPath(123)).toBe(false);
  });
});
