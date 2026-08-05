import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { PhoneConsentNotice } from "../PhoneConsentNotice";

describe("PhoneConsentNotice", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("전화번호가 없으면 재동의 안내와 현재 경로 CTA를 보여준다", () => {
    render(<PhoneConsentNotice hasPhone={false} redirectPath="/me" context="me" />);

    expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
      "알림 받으려면 전화번호 동의가 필요해요",
    );
    expect(screen.getByTestId("phone-consent-cta")).toHaveAttribute(
      "href",
      "/auth/kakao/start?redirect=%2Fme",
    );
  });

  it("전화번호가 있으면 안내를 보여주지 않는다", () => {
    render(<PhoneConsentNotice hasPhone redirectPath="/me" context="me" />);

    expect(screen.queryByTestId("phone-consent-notice")).not.toBeInTheDocument();
  });

  it("재동의 뒤 전화번호가 채워졌으면 왕복 상태를 지우고 안내를 숨긴다", async () => {
    window.sessionStorage.setItem("haenael_phone_consent_pending", "/me");
    render(<PhoneConsentNotice hasPhone redirectPath="/me" context="me" />);

    expect(screen.queryByTestId("phone-consent-notice")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(window.sessionStorage.getItem("haenael_phone_consent_pending")).toBeNull();
    });
  });

  it("CTA를 누르면 카카오 왕복 상태를 현재 탭에 저장한다", () => {
    render(
      <PhoneConsentNotice hasPhone={false} redirectPath="/cashout" context="cashout" />,
    );

    const cta = screen.getByTestId("phone-consent-cta");
    cta.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(cta);

    expect(window.sessionStorage.getItem("haenael_phone_consent_pending")).toBe(
      "/cashout",
    );
  });

  it("재동의 후에도 번호가 없으면 반복 CTA 대신 직접 입력을 안내한다", async () => {
    window.sessionStorage.setItem("haenael_phone_consent_pending", "/cashout");
    const firstRender = render(
      <PhoneConsentNotice hasPhone={false} redirectPath="/cashout" context="cashout" />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
        "카카오에서 전화번호를 받지 못했어요",
      );
    });
    expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
      "아래에 전화번호를 직접 입력해 주세요.",
    );
    expect(screen.queryByTestId("phone-consent-cta")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("haenael_phone_consent_pending")).toBe(
      "/cashout",
    );

    firstRender.unmount();
    render(
      <PhoneConsentNotice hasPhone={false} redirectPath="/cashout" context="cashout" />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("phone-consent-notice")).toHaveTextContent(
        "카카오에서 전화번호를 받지 못했어요",
      );
    });
    expect(screen.queryByTestId("phone-consent-cta")).not.toBeInTheDocument();
  });
});
