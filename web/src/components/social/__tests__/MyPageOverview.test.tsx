import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MyPageOverview } from "../MyPageOverview";
import type { MySocialDashboard } from "@/lib/social/contracts";

const updatePreferences = vi.fn(
  async (_notifyCheer: boolean, _notifyMarketing: boolean) => ({
    ok: true as const,
    data: undefined,
  }),
);
const profileInvoke = vi.fn(async (): Promise<{ data: any; error: any }> => ({ data: { profile_image: "/images/social-viral/dogyeong.png" }, error: null }));
vi.mock("@/app/(receiver)/social-actions", () => ({
  updateMemberPreferencesAction: (notifyCheer: boolean, notifyMarketing: boolean) =>
    updatePreferences(notifyCheer, notifyMarketing),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    functions: { invoke: profileInvoke },
  }),
}));

const dashboard: MySocialDashboard = {
  profile: { nickname: "서연", bio: "한 걸음씩, 끝까지 함께해요", profile_image: null },
  goals: [{
    goal_id: 1,
    slug: "run",
    title: "매주 세 번 달리기",
    due_date: "2026-12-01",
    status: "ACTIVE" as const,
    cover_preset_key: "c1",
    cheer_count: 1,
    supporter_avatars: [{ profile_image: null, is_anonymous: true }],
    recent_cheer: {
      supporter_name: null,
      profile_image: null,
      message: "끝까지 응원해요.",
      created_at: "2026-10-20T00:00:00Z",
      is_anonymous: true,
    },
  }],
  friend_count: 3,
  achievements: {
    completed_goal_count: 2,
    received_cheer_count: 7,
    connected_friend_count: 3,
  },
  belonging_queue: [],
  received_cheers: [],
  sent_cheers: [],
};

const preferences = { notifyCheer: true, notifyMarketing: false };

describe("MyPageOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileInvoke.mockResolvedValue({ data: { profile_image: "/images/social-viral/dogyeong.png" }, error: null });
    vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => new Uint8Array([1, 2]).buffer) } });
    vi.stubGlobal("fetch", vi.fn());
  });

  it("MY-UI-01 마이페이지는 중복 목표 목록 없이 활동, 응원, 알림, 계정 순서로 렌더한다", () => {
    render(
      <MyPageOverview
        dashboard={dashboard}
        initialPreferences={preferences}
      />,
    );
    const text = screen.getByTestId("my-page-overview").textContent ?? "";
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent(
      "서연",
    );
    expect(screen.getByTestId("my-profile-summary")).toHaveTextContent(
      "진행 중 목표 1개",
    );
    expect(screen.queryByText("내 해낼게")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^공유하기$/ })).not
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: /업적/ })).toHaveAttribute(
      "href",
      "/me/achievements",
    );
    expect(screen.getByRole("link", { name: /업적/ })).toHaveTextContent(
      "완료 목표 2개 · 받은 응원 7개 · 친구 3명",
    );
    expect(screen.getByRole("link", { name: /환전 내역/ })).toHaveAttribute(
      "href",
      "/cashout/history",
    );
    expect(text.indexOf("나의 활동")).toBeLessThan(text.indexOf("응원 내역"));
    expect(text.indexOf("응원 내역")).toBeLessThan(text.indexOf("알림"));
    expect(text.indexOf("알림")).toBeLessThan(text.indexOf("계정"));
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "사업자 정보" })).toHaveAttribute("href", "/my/legal");
    expect(text).not.toMatch(/\d[\d,]*원|₩/);
  });

  it("MY-UI-02 받은 응원과 보낸 응원 탭을 전환한다", async () => {
    render(
      <MyPageOverview dashboard={{ ...dashboard, sent_cheers: [{
        id: 21,
        target_name: "민서",
        profile_image: "/images/social-viral/jimin.png",
        message: "오늘도 한 걸음, 꾸준히 가자",
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }] }} initialPreferences={preferences} />,
    );
    expect(screen.getByTestId("received-cheers-empty")).toHaveTextContent("첫 응원을 받아볼까요?");
    expect(screen.getByRole("link", { name: "응원 링크 공유하기" })).toHaveAttribute("href", "/me");
    await userEvent.click(screen.getByRole("tab", { name: "보낸 응원" }));
    expect(screen.getByText("민서에게")).toBeInTheDocument();
    expect(screen.getByText(/오늘도 한 걸음, 꾸준히 가자/)).toBeInTheDocument();
    expect(screen.getByText("응원 보냄")).toBeInTheDocument();
  });

  it("MY-UI-05 목표 0개여도 중복 목표 목록 없이 응원 빈 상태의 다음 행동만 보여준다", () => {
    render(
      <MyPageOverview
        dashboard={{ ...dashboard, goals: [] }}
        initialPreferences={preferences}
      />,
    );

    expect(screen.queryByTestId("my-goals-empty")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "해낼게 만들기" }))
      .toHaveAttribute("href", "/onboarding");
  });

  it("MY-UI-03 알림 설정은 실제 RPC 액션에 연결된다", async () => {
    render(
      <MyPageOverview dashboard={dashboard} initialPreferences={preferences} />,
    );
    await userEvent.click(screen.getByRole("switch", { name: "응원 도착 알림" }));
    expect(updatePreferences).toHaveBeenCalledWith(false, false);
  });

  it("CL-02 해낼게 관리의 받은 응원은 ClampText의 2줄 정책을 쓴다", () => {
    render(
      <MyPageOverview
        dashboard={dashboard}
        receivedCheers={[{
          id: 10,
          displayName: "도경",
          profileImage: "/images/social-viral/dogyeong.png",
          message: "이번 주도 해낼 수 있어요.",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        }]}
        initialPreferences={preferences}
      />,
    );

    expect(screen.getByText("도경")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "도경 프로필" })).toBeInTheDocument();
    expect(screen.getByText(/이번 주도 해낼 수 있어요/)).toBeInTheDocument();
    expect(
      screen.getByText(/이번 주도 해낼 수 있어요/).closest("[data-collapsible]"),
    ).toBeInTheDocument();
    expect(screen.getByText("2시간 전")).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("🍀 1번");
  });

  it("MY-UI-06 이름은 현재 로그인 회원 행만 저장하고 즉시 반영한다", async () => {
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);

    await userEvent.click(screen.getByRole("button", { name: /서연/ }));
    const input = screen.getByRole("textbox", { name: "이름" });
    await userEvent.clear(input);
    await userEvent.type(input, "새서연");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(profileInvoke).toHaveBeenCalledWith("profile-update", { body: {
      action: "save",
      nickname: "새서연",
      bio: "한 걸음씩, 끝까지 함께해요",
      profile_image: null,
    } });
    expect(await screen.findByRole("button", { name: /새서연/ })).toBeInTheDocument();
  });

  it("MY-UI-07 빈 이름은 member UPDATE 전에 거부한다", async () => {
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);

    await userEvent.click(screen.getByRole("button", { name: /서연/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "이름" }));
    await userEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(screen.getByRole("alert")).toHaveTextContent("이름을 입력해 주세요.");
    expect(profileInvoke).not.toHaveBeenCalled();
  });

  it("MY-UI-08 승인 프리셋 사진은 profile_image 한 필드만 저장한다", async () => {
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);

    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 바꾸기" }));
    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 2" }));

    expect(profileInvoke).toHaveBeenCalledWith("profile-update", { body: {
      action: "save",
      nickname: "서연",
      bio: "한 걸음씩, 끝까지 함께해요",
      profile_image: "/images/social-viral/dogyeong.png",
    } });
    expect(await screen.findByRole("img", { name: "서연 프로필" })).toHaveAttribute(
      "src",
      expect.stringContaining("dogyeong.png"),
    );
  });

  it("MY-UI-09 이름 저장 실패는 기존값을 보존하고 오류 뒤 재시도할 수 있다", async () => {
    profileInvoke.mockResolvedValueOnce({ data: null, error: { message: "failed" } });
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);

    await userEvent.click(screen.getByRole("button", { name: /서연/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "이름" }));
    await userEvent.type(screen.getByRole("textbox", { name: "이름" }), "새서연");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이름을 저장하지 못했어요");

    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.getByRole("button", { name: /서연/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /서연/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "이름" }));
    await userEvent.type(screen.getByRole("textbox", { name: "이름" }), "새서연");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("button", { name: /새서연/ })).toBeInTheDocument();
  });

  it("MY-UI-10 사진 저장 실패는 기존값을 보존하고 같은 프리셋을 재시도할 수 있다", async () => {
    profileInvoke.mockResolvedValueOnce({ data: null, error: { message: "failed" } });
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);

    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 바꾸기" }));
    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 2" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("프로필 사진을 저장하지 못했어요");
    expect(screen.queryByRole("img", { name: "서연 프로필" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 2" }));
    expect(await screen.findByRole("img", { name: "서연 프로필" })).toHaveAttribute(
      "src",
      expect.stringContaining("dogyeong.png"),
    );
  });

  it("MY-UI-11 한 줄 소개는 프로필 함수에 저장하고 화면에 반영한다", async () => {
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: /한 걸음씩/ }));
    const input = screen.getByRole("textbox", { name: "한 줄 소개" });
    await userEvent.clear(input);
    await userEvent.type(input, "매일 조금씩 오래 가요");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(profileInvoke).toHaveBeenCalledWith("profile-update", { body: {
      action: "save",
      nickname: "서연",
      bio: "매일 조금씩 오래 가요",
      profile_image: null,
    } });
    expect(await screen.findByRole("button", { name: /매일 조금씩 오래 가요/ })).toBeInTheDocument();
  });

  it("MY-UI-12 직접 사진은 서명, PUT, finalize 순서로 저장한다", async () => {
    profileInvoke
      .mockResolvedValueOnce({ data: { upload_url: "https://storage.test/avatar", asset_id: "asset-1" }, error: null })
      .mockResolvedValueOnce({ data: { profile_image: "https://cdn.test/avatar.webp" }, error: null });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const { container } = render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 바꾸기" }));
    const bytes = new Uint8Array([1, 2, 3]);
    const file = new File([bytes], "avatar.webp", { type: "image/webp" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(await screen.findByRole("img", { name: "서연 프로필" })).toHaveAttribute("src", expect.stringContaining("cdn.test"));
    expect(profileInvoke).toHaveBeenNthCalledWith(1, "profile-update", { body: expect.objectContaining({ action: "sign_avatar", mime_type: "image/webp" }) });
    expect(profileInvoke).toHaveBeenNthCalledWith(2, "profile-update", { body: expect.objectContaining({ action: "finalize_avatar", asset_id: "asset-1" }) });
  });

  it("MY-UI-13 지원하지 않는 사진 형식은 업로드 전에 거부한다", async () => {
    const { container } = render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 바꾸기" }));
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [new File(["x"], "avatar.gif", { type: "image/gif" })] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPG, PNG, WEBP 형식의 5MB 이하");
    expect(profileInvoke).not.toHaveBeenCalled();
  });

  it("MY-UI-14 프로필 함수가 reject되어도 저장 상태를 풀고 같은 이름을 재시도한다", async () => {
    profileInvoke.mockRejectedValueOnce(new Error("network down"));
    render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: /서연/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "이름" }));
    await userEvent.type(screen.getByRole("textbox", { name: "이름" }), "재시도서연");
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("이름을 저장하지 못했어요");
    expect(screen.getByRole("button", { name: "저장" })).not.toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("button", { name: /재시도서연/ })).toBeInTheDocument();
  });

  it("MY-UI-15 사진 PUT이 reject되어도 저장 상태를 풀고 재시도 안내를 보인다", async () => {
    profileInvoke.mockResolvedValueOnce({ data: { upload_url: "https://storage.test/avatar", asset_id: "asset-1" }, error: null });
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    const { container } = render(<MyPageOverview dashboard={dashboard} initialPreferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: "프로필 사진 바꾸기" }));
    const bytes = new Uint8Array([1, 2, 3]);
    const file = new File([bytes], "avatar.webp", { type: "image/webp" });
    Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("프로필 사진을 저장하지 못했어요");
    expect(screen.getByRole("button", { name: "프로필 사진 1" })).not.toBeDisabled();
  });
});
