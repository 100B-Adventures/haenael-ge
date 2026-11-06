import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SIGNUP_MARK_COOKIE } from "@/lib/analytics/conversions";
import { SignupConversion } from "../SignupConversion";

const { consentState, pathnameState, trackSignUpConversionMock } = vi.hoisted(() => ({
  consentState: { value: "granted" as "granted" | "denied" | null },
  pathnameState: { value: "/invite/private-token" },
  trackSignUpConversionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => pathnameState.value }));
vi.mock("@/lib/analytics/useAnalyticsConsent", () => ({
  useAnalyticsConsent: () => consentState.value,
}));
vi.mock("@/lib/analytics/conversions", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/analytics/conversions")>();
  return { ...original, trackSignUpConversion: trackSignUpConversionMock };
});

beforeEach(() => {
  pathnameState.value = "/invite/private-token";
  consentState.value = "granted";
  trackSignUpConversionMock.mockReset().mockResolvedValue(true);
  document.cookie = `${SIGNUP_MARK_COOKIE}=new-user; path=/; samesite=lax`;
});

afterEach(() => {
  document.cookie = `${SIGNUP_MARK_COOKIE}=; path=/; max-age=0; samesite=lax`;
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
