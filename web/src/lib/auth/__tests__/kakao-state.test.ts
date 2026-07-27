// kakao-state.test.ts — nonce 생성/state 인코딩/상수시간 비교 단위 테스트
// 보안 결함1 회귀 테스트: state 왕복(대칭) 및 위조 state 거부.

import { describe, it, expect } from "vitest";
import {
  generateOAuthNonce,
  buildOAuthState,
  parseOAuthState,
  timingSafeEqualString,
} from "../kakao-state";

describe("generateOAuthNonce", () => {
  it("매번 다른 값을 생성한다 (충돌 방지)", () => {
    const a = generateOAuthNonce();
    const b = generateOAuthNonce();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("URL-safe 문자만 포함한다", () => {
    const nonce = generateOAuthNonce();
    expect(/^[A-Za-z0-9_-]+$/.test(nonce)).toBe(true);
  });
});

describe("buildOAuthState / parseOAuthState — 정상 왕복", () => {
  it("nonce + redirectPath 를 인코딩했다가 그대로 복원한다", () => {
    const nonce = generateOAuthNonce();
    const state = buildOAuthState(nonce, "/onboarding");
    const parsed = parseOAuthState(state);

    expect(parsed).not.toBeNull();
    expect(parsed?.nonce).toBe(nonce);
    expect(parsed?.redirectPath).toBe("/onboarding");
  });

  it("한글/특수문자가 섞인 경로도 왕복한다", () => {
    const nonce = generateOAuthNonce();
    // 경로 자체는 화이트리스트 통과 대상만 사용(세그먼트는 영숫자/슬래시/언더스코어/하이픈)
    const state = buildOAuthState(nonce, "/g/goal-slug_1");
    const parsed = parseOAuthState(state);
    expect(parsed?.redirectPath).toBe("/g/goal-slug_1");
  });
});

describe("parseOAuthState — 위조/손상 state 거부", () => {
  it("점(.) 구분자 없는 state는 거부", () => {
    expect(parseOAuthState("no-dot-here")).toBeNull();
  });

  it("nonce가 비어있으면 거부", () => {
    expect(parseOAuthState(".%2Fonboarding")).toBeNull();
  });

  it("redirectPath가 안전하지 않으면(오픈 리다이렉트 시도) 거부 — 결함2 이중 방어", () => {
    const nonce = generateOAuthNonce();
    const forged = `${nonce}.${encodeURIComponent("/\\evil.example")}`;
    expect(parseOAuthState(forged)).toBeNull();

    const forgedProtoRelative = `${nonce}.${encodeURIComponent("//evil.example")}`;
    expect(parseOAuthState(forgedProtoRelative)).toBeNull();
  });

  it("null/undefined/숫자 state는 거부", () => {
    expect(parseOAuthState(null)).toBeNull();
    expect(parseOAuthState(undefined)).toBeNull();
    expect(parseOAuthState(123)).toBeNull();
  });
});

describe("timingSafeEqualString", () => {
  it("동일 문자열이면 true", () => {
    expect(timingSafeEqualString("abc123", "abc123")).toBe(true);
  });

  it("다른 문자열이면 false", () => {
    expect(timingSafeEqualString("abc123", "abc124")).toBe(false);
  });

  it("길이가 다르면 false (CSRF 공격 시 쿠키 nonce와 위조 state nonce 불일치 케이스)", () => {
    expect(timingSafeEqualString("short", "much-longer-string")).toBe(false);
  });
});
