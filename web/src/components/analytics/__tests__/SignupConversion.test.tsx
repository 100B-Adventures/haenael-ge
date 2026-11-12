import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LOGIN_MARK_COOKIE, SIGNUP_MARK_COOKIE } from "@/lib/analytics/conversions";
import { SignupConversion } from "../SignupConversion";

const { consentState, pathnameState, trackLoginConversionMock, trackSignUpConversionMock } = vi.hoisted(() => ({
  consentState: { value: "granted" as "granted" | "denied" | null },
  pathnameState: { value: "/invite/private-token" },
  trackLoginConversionMock: vi.fn(),
  trackSignUpConversionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameState.value }));
vi.mock("@/lib/analytics/useAnalyticsConsent", () => ({
  useAnalyticsConsent: () => consentState.value,
}));
vi.mock("@/lib/analytics/conversions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/analytics/conversions")>();
  return {
    ...original,
    trackLoginConversion: trackLoginConversionMock,
    trackSignUpConversion: trackSignUpConversionMock,
  };
});

beforeEach(() => {
  pathnameState.value = "/invite/private-token";
  consentState.value = "granted";
  trackSignUpConversionMock.mockReset().mockResolvedValue(true);
  trackLoginConversionMock.mockReset().mockReturnValue(true);
  document.cookie = `${SIGNUP_MARK_COOKIE}=new-user; path=/; samesite=lax`;
});

afterEach(() => {
  document.cookie = `${SIGNUP_MARK_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${LOGIN_MARK_COOKIE}=; path=/; max-age=0; samesite=lax`;
});

it("초대 토큰 URL에서는 가입 표식을 보존하고 전환을 보내지 않는다", () => {
  render(<SignupConversion />);

  expect(document.cookie).toContain(`${SIGNUP_MARK_COOKIE}=new-user`);
  expect(trackSignUpConversionMock).not.toHaveBeenCalled();
});

it("안전한 URL로 이동하면 provider enqueue 성공 뒤 표식을 한 번 지운다", async () => {
  const view = render(<SignupConversion />);
  pathnameState.value = "/friends";
  view.rerender(<SignupConversion />);

  await waitFor(() => {
    expect(trackSignUpConversionMock).toHaveBeenCalledTimes(1);
    expect(document.cookie).not.toContain(`${SIGNUP_MARK_COOKIE}=`);
  });
  expect(trackSignUpConversionMock).toHaveBeenCalledWith("new-user");
});

it("동의 전에는 안전한 URL에서도 가입 표식을 보존한다", () => {
  pathnameState.value = "/friends";
  consentState.value = null;
  render(<SignupConversion />);

  expect(trackSignUpConversionMock).not.toHaveBeenCalled();
  expect(document.cookie).toContain(`${SIGNUP_MARK_COOKIE}=new-user`);
});

it("기존 회원 로그인 표식을 GA4 login 이벤트로 한 번 보내고 지운다", async () => {
  document.cookie = `${SIGNUP_MARK_COOKIE}=; path=/; max-age=0; samesite=lax`;
  document.cookie = `${LOGIN_MARK_COOKIE}=oauth; path=/; samesite=lax`;
  pathnameState.value = "/friends";

  render(<SignupConversion />);

  await waitFor(() => {
    expect(trackLoginConversionMock).toHaveBeenCalledWith("oauth");
    expect(document.cookie).not.toContain(`${LOGIN_MARK_COOKIE}=`);
  });
});
