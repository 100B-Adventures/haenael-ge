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
    expect(items[0]).toHaveTextContent("버전 2.3.2");
    expect(items[1]).toHaveTextContent("버전 2.3.1");
    expect(items[2]).toHaveTextContent("버전 2.3.0");
    expect(screen.getByRole("heading", { name: "새로 달라진 점을 확인하세요" })).toBeInTheDocument();
  });

  it("좋아요는 우리 서버로 바로 전달하고, 분석 동의가 있을 때만 GA4 에도 보낸다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "granted");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<UpdatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "좋아요" }));

    expect(window.gtag).toHaveBeenCalledWith("event", "whats_new_feedback", { release: "2.3.0", rating: "like" });
    expect(await screen.findByRole("status")).toHaveTextContent("의견을 보냈어요");
    expect(fetchMock).toHaveBeenCalledWith("/api/feedback", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ rating: "like", release: "2.3.0" });
    expect(screen.getByRole("link", { name: "사진을 붙이거나 길게 쓰려면 이메일로 보내기" })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:haenaelge.official@gmail.com"),
    );
    vi.unstubAllGlobals();
  });

  it("분석 동의를 거부해도 의견은 우리 서버로 전달되고 GA4 로는 보내지 않는다", async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, "denied");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<UpdatesPage />);

    fireEvent.click(screen.getByRole("button", { name: "별로예요" }));

    expect(window.gtag).not.toHaveBeenCalled();
    expect(window.haenaelGtagPending).toBeUndefined();
    expect(await screen.findByRole("status")).toHaveTextContent("의견을 보냈어요");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ rating: "dislike" });
    vi.unstubAllGlobals();
  });

  it("한 줄 코멘트를 보내고, 전송에 실패하면 사실대로 이메일을 안내한다", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    render(<UpdatesPage />);

    const input = screen.getByRole("textbox", { name: "한마디 남기기" });
    fireEvent.change(input, { target: { value: "초대 링크에 사진이 떠서 좋아요" } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByRole("status")).toHaveTextContent("의견을 보냈어요");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ message: "초대 링크에 사진이 떠서 좋아요" });

    fireEvent.change(input, { target: { value: "두 번째 의견" } });
    fireEvent.click(screen.getByRole("button", { name: "보내기" }));
    expect(await screen.findByText("지금은 보내지 못했어요. 아래 이메일로 보내 주세요.")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
