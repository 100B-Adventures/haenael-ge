import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { CoverPicker } from "./components/CoverPicker";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const open = (path: string) => {
  window.history.replaceState({}, "", path);
  return render(<App />);
};

describe("앱인토스 v0 계약", () => {
  it("TC-AIT-001 토스 로그인 정상 경로는 친구 목표까지 이어진다", async () => {
    const user = userEvent.setup();
    open("/login?demo=1&next=/friends");
    await user.click(screen.getByTestId("toss-login-button"));
    expect(await screen.findAllByTestId("friend-goal-card")).toHaveLength(3);
    expect(sessionStorage.getItem("haenael-member")).toBe("demo-member");
  });

  it("TC-AIT-002 연결 설정이 없는 로그인은 세션을 만들지 않고 거절한다", async () => {
    const user = userEvent.setup();
    open("/login");
    await user.click(screen.getByTestId("toss-login-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("앱 연결 설정");
    expect(sessionStorage.getItem("haenael-member")).toBeNull();
  });

  it("TC-AIT-003 친구 목표 조회와 응원 상세 정상 경로를 렌더한다", async () => {
    const user = userEvent.setup();
    open("/friends?demo=1");
    const cards = await screen.findAllByTestId("friend-goal-card");
    await user.click(cards[0].querySelector("button")!);
    expect(await screen.findByTestId("support-flow")).toBeInTheDocument();
    expect(screen.getByText(/명이 조용히 함께/)).toBeInTheDocument();
  });

  it("TC-AIT-004 존재하지 않는 친구 목표는 안정 문구로 거절한다", async () => {
    open("/goals/not-found?demo=1");
    expect(await screen.findByRole("alert")).toHaveTextContent("목표를 찾지 못했어요");
  });

  it("TC-AIT-005 선호 설정은 명시적인 마케팅 동의를 저장한다", async () => {
    const user = userEvent.setup();
    open("/my?demo=1");
    const marketing = screen.getByRole("checkbox", { name: /새로운 소식/ });
    expect(marketing).not.toBeChecked();
    await user.click(marketing);
    await waitFor(() => expect(screen.getByText("알림 설정을 저장했어요.")).toBeInTheDocument());
    expect(marketing).toBeChecked();
  });

  it("TC-AIT-006 커버 선택은 승인된 여섯 프리셋 안에서만 바뀐다", async () => {
    const user = userEvent.setup();
    let selected = "c1";
    const view = render(<CoverPicker value="c1" onChange={(value) => { selected = value; }} />);
    await user.click(screen.getByRole("button", { name: "커버 6" }));
    expect(selected).toBe("c6");
    expect(view.container.querySelectorAll(".cover-choice")).toHaveLength(6);
  });

  it("TC-AIT-007 초대 정상 경로는 외부 웹 주소 없이 토스 공유 상태를 만든다", async () => {
    const user = userEvent.setup();
    open("/invite?demo=1");
    await user.click(screen.getByRole("button", { name: "토스로 친구 초대하기" }));
    expect(await screen.findByRole("status")).toHaveTextContent("초대 링크를 만들었어요");
  });
});
