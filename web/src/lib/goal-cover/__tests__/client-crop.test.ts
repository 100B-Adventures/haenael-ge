import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cropGoalCoverFile,
  isValidGoalCoverInput,
} from "../client-crop";

describe("goal cover client crop", () => {
  beforeEach(() => {
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 1200, height: 1600, close: vi.fn() })));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob([new Uint8Array(1024)], { type: "image/jpeg" }));
    });
  });

  it("GC-CROP-01 명시 선택한 10MB 이하 사진을 허용하고 16:9 JPEG로 만든다", async () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "portrait.png", { type: "image/png" });
    expect(isValidGoalCoverInput(file)).toBe(true);
    const result = await cropGoalCoverFile(file, 80);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("portrait-banner.jpg");
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeNull();
  });

  it("GC-CROP-02 10MB 초과와 이미지가 아닌 파일을 거부한다", () => {
    expect(isValidGoalCoverInput(new File(["x"], "note.txt", { type: "text/plain" }))).toBe(false);
    expect(isValidGoalCoverInput(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" }))).toBe(false);
  });
});
