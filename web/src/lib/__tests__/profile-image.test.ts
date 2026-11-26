import { describe, expect, it } from "vitest";
import { normalizeProfileImageUrl } from "../profile-image";

describe("normalizeProfileImageUrl", () => {
  it("PROFILE-IMG-01 카카오 CDN의 http 주소만 https로 바꾼다", () => {
    expect(normalizeProfileImageUrl("http://k.kakaocdn.net/avatar.jpg"))
      .toBe("https://k.kakaocdn.net/avatar.jpg");
    expect(normalizeProfileImageUrl("https://k.kakaocdn.net/avatar.jpg"))
      .toBe("https://k.kakaocdn.net/avatar.jpg");
    expect(normalizeProfileImageUrl("/images/avatar.png"))
      .toBe("/images/avatar.png");
  });
});
