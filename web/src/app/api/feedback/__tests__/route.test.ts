import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } })),
}));

import { POST } from "../route";

const post = (body: unknown) => POST(new Request("https://x/api/feedback", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/feedback (한 줄 의견 → 슬랙)", () => {
  const slack = vi.fn();
  beforeEach(() => {
    process.env.SLACK_FEEDBACK_WEBHOOK_URL = "https://hooks.slack.test/x";
    slack.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", slack);
  });
  afterEach(() => {
    delete process.env.SLACK_FEEDBACK_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  it("웹훅이 없으면 503 으로 알려 화면이 이메일로 대체하게 한다", async () => {
    delete process.env.SLACK_FEEDBACK_WEBHOOK_URL;
    expect((await post({ rating: "like" })).status).toBe(503);
    expect(slack).not.toHaveBeenCalled();
  });

  it("별점만 보내도 슬랙에 회원 여부·버전·경로와 함께 전달한다", async () => {
    const res = await post({ rating: "like", release: "2.2.0", path: "/updates" });
    expect(res.status).toBe(200);
    const text = JSON.parse(slack.mock.calls[0][1].body).text as string;
    expect(text).toBe("[해낼게 의견] 좋아요 · 2.2.0 · 회원 · /updates");
  });

  it("코멘트는 공백을 정리해 300자까지 싣는다", async () => {
    await post({ message: "  초대   링크가\n좋아요 ", release: "2.2.0", path: "/updates" });
    expect(JSON.parse(slack.mock.calls[0][1].body).text).toContain("\n> 초대 링크가 좋아요");
  });

  it("별점 없이 한 글자만 오면 거부한다", async () => {
    expect((await post({ message: "a" })).status).toBe(400);
    expect(slack).not.toHaveBeenCalled();
  });

  it("봇 차단용 숨은 칸이 채워지면 보내지 않고 성공처럼 답한다", async () => {
    expect((await post({ message: "광고합니다", website: "spam" })).status).toBe(200);
    expect(slack).not.toHaveBeenCalled();
  });

  it("슬랙이 실패하면 502 를 돌려준다", async () => {
    slack.mockResolvedValueOnce({ ok: false });
    expect((await post({ rating: "dislike" })).status).toBe(502);
  });
});
