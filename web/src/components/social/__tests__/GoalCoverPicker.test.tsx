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

function picker() {
  return render(<GoalCoverPicker goalId={1} title="달리기" initialPreset="c1" />);
}

function imageFile(type = "image/png", size = 8) {
  const bytes = new Uint8Array(size);
  const file = new File([bytes], "cover.png", { type });
  Object.defineProperty(file, "arrayBuffer", { value: async () => bytes.buffer });
  return file;
}

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.preset.mockReset().mockResolvedValue({ ok: true, data: undefined });
  mocks.refresh.mockReset();
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn(async () => new Uint8Array([1, 2]).buffer) } });
  vi.stubGlobal("fetch", vi.fn());
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("GoalCoverPicker 단계별 실패", () => {
  it("GC-01 형식 실패는 형식 문구와 format 로그를 남긴다", async () => {
    const { container } = picker();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile("text/plain")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("JPG, PNG, WEBP 형식의 5MB 이하");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"stage":"format"'));
  });

  it("GC-02 서명 실패는 sign 문구·HTTP 상태·재시도를 남긴다", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: { context: new Response("", { status: 503 }) } });
    const { container } = picker();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("업로드를 시작하지 못했어요");
    expect(screen.getByRole("button", { name: "사진 다시 업로드" })).toBeEnabled();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"status":503'));
  });

  it("GC-03 PUT 실패는 전송 문구와 상태를 남긴다", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { upload_url: "https://storage.test/upload", asset_id: "asset" }, error: null });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 502 }));
    const { container } = picker();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile()] } });
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
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile()] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("검수 요청을 마치지 못했어요");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"stage":"finalize"'));
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"status":409'));
  });

  it("GC-05 업로드 중 프리셋 선택을 막는다", async () => {
    let release!: (value: unknown) => void;
    mocks.invoke.mockReturnValueOnce(new Promise((resolve) => { release = resolve; }));
    const { container } = picker();
    fireEvent.change(container.querySelector("input[type=file]")!, { target: { files: [imageFile()] } });
    const presetButton = screen.getByText("기본 2").closest("button")!;
    await waitFor(() => expect(presetButton).toBeDisabled());
    await userEvent.click(presetButton);
    expect(mocks.preset).not.toHaveBeenCalled();
    release({ data: null, error: { context: new Response("", { status: 503 }) } });
    expect(await screen.findByRole("alert")).toHaveTextContent("업로드를 시작하지 못했어요");
  });
});
