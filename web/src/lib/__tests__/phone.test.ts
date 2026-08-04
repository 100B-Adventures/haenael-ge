import { describe, expect, it } from "vitest";
import { normalizeKoreanMobilePhone } from "../phone";

describe("normalizeKoreanMobilePhone", () => {
  it("국내 표기와 카카오 +82 표기를 숫자 전용 010 표기로 정규화한다", () => {
    expect(normalizeKoreanMobilePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizeKoreanMobilePhone("+82 10-1234-5678")).toBe("01012345678");
    expect(normalizeKoreanMobilePhone("0082 (10) 9876-5432")).toBe("01098765432");
  });

  it("빈 값·유선·국외·문자가 섞인 번호를 거부한다", () => {
    expect(normalizeKoreanMobilePhone("")).toBeNull();
    expect(normalizeKoreanMobilePhone("02-1234-5678")).toBeNull();
    expect(normalizeKoreanMobilePhone("+1 202-555-0199")).toBeNull();
    expect(normalizeKoreanMobilePhone("phone:010-1234-5678")).toBeNull();
  });
});
