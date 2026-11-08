import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GoalCoverPicker } from "../GoalCoverPicker";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  preset: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/app/(receiver)/social-actions", () => ({
  setGoalCoverPresetAction: (...args: unknown[]) => mocks.preset(...args),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ functions: { invoke: mocks.invoke } }),
}));
vi.mock("@/lib/goal-cover/client-crop", () => ({
  isValidGoalCoverInput: (file: File) => /^image\/(jpeg|png|webp)$/.test(file.type) && file.size <= 10 * 1024 * 1024,
  cropGoalCoverFile: async (file: File) => file,
}));

function picker() {
  return render(<GoalCoverPicker goalId={1} title="달리기" initialPreset="c1" />);
}

function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: "배너 바꾸기" }));
}

function imageFile(type = "image/png", size = 8) {
  const bytes = new Uint8Array(size);
  const file = new File([bytes], "cover.png", { type });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  return file;
}

function selectAndApply(container: HTMLElement, file = imageFile()) {
  fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "배너로 쓰기" }));
}

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.preset.mockReset().mockResolvedValue({ ok: true, data: undefined });
  mocks.refresh.mockReset();
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => new Uint8Array([1, 2]).buffer) } });
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:cover-preview") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GoalCoverPicker 단계별 실패", () => {
  it("GC-00 기본 상태는 현재 커버만 보이고 선택기는 버튼으로 연다", () => {
    picker();
    expect(screen.queryByTestId("goal-cover-options")).not.toBeInTheDocument();
    openPicker();
    expect(screen.getByTestId("goal-cover-options")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "선택 닫기" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("배너 고르기")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기기에서 사진 찾기" })).toBeInTheDocument();
    expect(screen.getByText("자동")).toBeInTheDocument();
  });

  it("CV-02 선택을 바꿔도 선택된 프리셋과 체크 글리프는 각각 하나다", async () => {
    const { container } = picker();
    openPicker();

    expect(container.querySelectorAll('.cover-preset-grid button[aria-pressed="true"]')).toHaveLength(1);
    expect(screen.getAllByTestId("selection-check")).toHaveLength(1);

    await userEvent.click(screen.getByText("운동·달리기").closest("button")!);

    await waitFor(() => {
      expect(container.querySelectorAll('.cover-preset-grid button[aria-pressed="true"]')).toHaveLength(1);
      expect(screen.getAllByTestId("selection-check")).toHaveLength(1);
    });
  });

  it("GC-01 형식 실패는 형식 문구와 format 로그를 남긴다", async () => {
    const { container } = picker();
    openPicker();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile("text/plain")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPG, PNG, WEBP 형식의 10MB 이하");
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("GC-02 서명 실패는 sign 문구·HTTP 상태·재시도를 남긴다", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { context: new Response("", { status: 503 }) } });
    const { container } = picker();
    openPicker();
    selectAndApply(container);
    expect(await screen.findByRole("alert")).toHaveTextContent("업로드를 시작하지 못했어요");
    expect(screen.getByRole("button", { name: "배너로 쓰기" })).toBeEnabled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"status":503'));
  });

  it("GC-03 PUT 실패는 전송 문구와 상태를 남긴다", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { upload_url: "https://storage.test/upload", asset_id: "asset" }, error: null });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 502 }));
    const { container } = picker();
    openPicker();
    selectAndApply(container);
    expect(await screen.findByRole("alert")).toHaveTextContent("사진 전송이 끊겼어요");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"stage":"put"'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"status":502'));
  });

  it("GC-04 finalize 실패는 검수 요청 문구와 상태를 남긴다", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { upload_url: "https://storage.test/upload", asset_id: "asset" }, error: null })
      .mockResolvedValueOnce({ data: null, error: { context: new Response("", { status: 409 }) } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const { container } = picker();
    openPicker();
    selectAndApply(container);
    expect(await screen.findByRole("alert")).toHaveTextContent("검수 요청을 마치지 못했어요");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"stage":"finalize"'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"status":409'));
  });

  it("GC-05 업로드 중 프리셋 선택을 막는다", async () => {
    let release!: (value: unknown) => void;
    mocks.invoke.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const { container } = picker();
    openPicker();
    selectAndApply(container);
    const presetButton = screen.getByText("운동·달리기").closest("button")!;
    await waitFor(() => expect(presetButton).toBeDisabled());
    await userEvent.click(presetButton);
    expect(mocks.preset).not.toHaveBeenCalled();
    release({ data: null, error: { context: new Response("", { status: 503 }) } });
    expect(await screen.findByRole("alert")).toHaveTextContent("업로드를 시작하지 못했어요");
  });

  it("GC-06 검수 요청 성공 뒤 성공 상태와 완료된 서버 단계를 표시한다", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { upload_url: "https://storage.test/upload", asset_id: "asset" }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const { container } = picker();
    openPicker();
    selectAndApply(container);

    expect(await screen.findByRole("status")).toHaveTextContent("검수 대기열에 보냈어요");
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });
});
