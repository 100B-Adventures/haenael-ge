import { describe, expect, it, vi } from "vitest";
import {
  KAKAO_EXTERNAL_BROWSER_FALLBACK_MS,
  buildKakaoOpenExternalUrl,
  buildKakaoStartUrl,
  startKakaoLogin,
} from "../kakao-navigation";

function navigationEnvironment(userAgent: string) {
  let fallback: (() => void) | null = null;
  let exit: (() => void) | null = null;
  const assign = vi.fn();
  const notify = vi.fn();
  const clearFallback = vi.fn();
  return {
    assign,
    notify,
    clearFallback,
    runFallback: () => fallback?.(),
    leavePage: () => exit?.(),
    environment: {
      userAgent,
      origin: "https://haenael.ge",
      isVisible: () => true,
      notify,
      assign,
      setFallback: (callback: () => void, delayMs: number) => {
        expect(delayMs).toBe(KAKAO_EXTERNAL_BROWSER_FALLBACK_MS);
        fallback = callback;
        return 17;
      },
      clearFallback,
      onPageExit: (callback: () => void) => {
        exit = callback;
        return vi.fn();
      },
    },
  };
}

describe("kakao navigation", () => {
  it("KAKAO-NAV-01: 일반 브라우저는 기존 OAuth 시작 URL로 이동한다", () => {
    const harness = navigationEnvironment("Mobile Safari");
    const startUrl = buildKakaoStartUrl("/onboarding");

    startKakaoLogin(startUrl, { environment: harness.environment });

    expect(harness.assign).toHaveBeenCalledOnce();
    expect(harness.assign).toHaveBeenCalledWith(startUrl);
    expect(harness.notify).not.toHaveBeenCalled();
  });

  it("KAKAO-NAV-02: 카카오톡 UA는 안내 후 인코딩된 외부 브라우저 스킴을 연다", () => {
    const harness = navigationEnvironment("KAKAOTALK 11.4.2 iOS");
    const startUrl = buildKakaoStartUrl("/onboarding");

    startKakaoLogin(startUrl, { environment: harness.environment });

    expect(harness.notify).toHaveBeenCalledOnce();
    expect(harness.assign).toHaveBeenCalledWith(
      buildKakaoOpenExternalUrl("https://haenael.ge", startUrl),
    );
  });

  it("KAKAO-NAV-NEG-01: 비공식 스킴이 페이지를 떠나지 못하면 기존 흐름으로 fallback한다", () => {
    const harness = navigationEnvironment("KAKAOTALK 11.4.2 iOS");
    const startUrl = buildKakaoStartUrl("/onboarding");

    startKakaoLogin(startUrl, { environment: harness.environment });
    harness.runFallback();

    expect(harness.assign).toHaveBeenLastCalledWith(
      "https://haenael.ge/auth/kakao/start?redirect=%2Fonboarding&external_browser=1",
    );
  });

  it("KAKAO-NAV-03: 외부 전환이 시작되면 fallback을 취소한다", () => {
    const harness = navigationEnvironment("KAKAOTALK 11.4.2 iOS");

    startKakaoLogin(buildKakaoStartUrl("/me"), {
      environment: harness.environment,
    });
    harness.leavePage();

    expect(harness.clearFallback).toHaveBeenCalledOnce();
  });
});
