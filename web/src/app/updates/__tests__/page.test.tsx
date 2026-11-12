import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY } from "@/lib/analytics/consent";
import UpdatesPage from "../page";

beforeEach(() => {
  window.localStorage.clear();
  delete window.haenaelGtagPending;
  window.haenaelGtagMeasurementId = "G-TEST123";
  window.gtag = vi.fn();
});

describe("공개 업데이트 기록", () => {
  it("RELEASE.md에서 생성한 최신 3개를 최신순으로 렌더한다", () => {
    render(<UpdatesPage />);

    const items = within(screen.getByRole("list", { name: "최근 업데이트" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("버전 2.2.0");
    expect(items[1]).toHaveTextContent("버전 2.1.4");
    expect(items[2]).toHaveTextContent("버전 2.1.3");
    expect(screen.getByRole("heading", { name: "새로 달라진 점을 확인하세요" })).toBeInTheDocument();
  });

  it("도착 화면에서 좋아요·별로예요를 GA4 rating으로 전송하고 기존 이메일 문의 경로를 제공한다", () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    render(<UpdatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "좋아요" }));
    fireEvent.click(screen.getByRole("button", { name: "별로예요" }));

    expect(window.gtag).toHaveBeenNthCalledWith(1, "event", "whats_new_feedback", {
      release: "2.2.0",
      rating: "like",
    });
    expect(window.gtag).toHaveBeenNthCalledWith(2, "event", "whats_new_feedback", {
      release: "2.2.0",
      rating: "dislike",
    });
    expect(screen.getByRole("link", { name: "이메일로 자세한 의견 보내기" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:haenaelge.official@gmail.com"),
    );
  });

  it("분석 동의 거부 시 rating을 전송하거나 대기열에 넣지 않고 사실대로 안내한다", () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
    render(<UpdatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "좋아요" }));

    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.haenaelGtagPending).toBeUndefined();
    expect(screen.getByRole("status")).toHaveTextContent("분석 동의가 꺼져 있어 전송하지 않았어요");
  });
});
