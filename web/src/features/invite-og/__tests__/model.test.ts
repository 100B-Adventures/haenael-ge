import { describe, expect, it } from "vitest";
import {
  clipInviteName,
  fitInviteTitle,
  inviteOgImagePath,
  toInviteOgModel,
} from "../model";

const preview = {
  inviter_nickname: "지민",
  goal_title: "토익 900점 넘기기",
  cover_preset_key: "c1" as const,
};

describe("초대 OG C1 모델", () => {
  it("INV-OG-01 정상: 유효 미리보기의 이름·목표·HTTPS 얼굴을 개인화한다", () => {
    expect(toInviteOgModel(preview, {
      ...preview,
      profile_image: "https://cdn.example.com/avatar.webp",
    })).toEqual({
      name: "지민",
      title: "토익 900점 넘기기",
      profileImage: "https://cdn.example.com/avatar.webp",
      personalized: true,
    });
  });

  it("INV-OG-02 거절: 무효 토큰·응답 없음은 C1 정적 기본판으로 떨어진다", () => {
    expect(toInviteOgModel(null)).toEqual({
      name: "친구",
      title: "서로의 목표를 함께 응원해요",
      profileImage: null,
      personalized: false,
    });
  });

  it("INV-OG-03 경계: 비HTTPS 얼굴은 쓰지 않고 긴 이름·목표를 안전하게 맞춘다", () => {
    const model = toInviteOgModel({
      ...preview,
      inviter_nickname: "바다를닮은서연이에요",
      goal_title: "퇴근하고 매일 30분씩 영어 원서 읽어서 올해 안에 다섯 권을 끝까지 다 읽어내기",
    }, { profile_image: "javascript:alert(1)" });
    expect(model.profileImage).toBeNull();
    expect(clipInviteName(model.name)).toBe("바다를닮은…");
    expect(fitInviteTitle(model.title).text).toMatch(/…$/);
  });

  it("INV-OG-04 경계: 토큰은 메타데이터 이미지 경로에서 URL 인코딩한다", () => {
    expect(inviteOgImagePath("a/b+c")).toBe(
      "/invite/a%2Fb%2Bc/opengraph-image",
    );
  });
});
