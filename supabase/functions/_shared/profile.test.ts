import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  avatarObjectPath,
  parseProfileRequest,
  PROFILE_AVATAR_MAX_BYTES,
} from "./profile.ts";

Deno.test("PROFILE-UNIT-01 정상 경로: 소개와 프리셋 사진을 저장 계약으로 정규화한다", () => {
  assertEquals(
    parseProfileRequest({
      action: "save",
      nickname: " 서연 ",
      bio: " 한 걸음씩, 끝까지 함께해요 ",
      profile_image: "/images/social-viral/seoyeon.png",
    }),
    {
      action: "save",
      nickname: "서연",
      bio: "한 걸음씩, 끝까지 함께해요",
      profileImage: "/images/social-viral/seoyeon.png",
    },
  );
});

Deno.test("PROFILE-UNIT-02 거절 경로: 80자를 넘는 소개를 거부한다", () => {
  assertThrows(
    () =>
      parseProfileRequest({
        action: "save",
        nickname: "서연",
        bio: "가".repeat(81),
        profile_image: null,
      }),
    Error,
    "invalid_bio",
  );
});

Deno.test("PROFILE-UNIT-03 거절 경로: 5MiB 초과 아바타를 거부한다", () => {
  assertThrows(
    () =>
      parseProfileRequest({
        action: "sign_avatar",
        file_name: "avatar.webp",
        mime_type: "image/webp",
        byte_size: PROFILE_AVATAR_MAX_BYTES + 1,
        content_sha256: "a".repeat(64),
      }),
    Error,
    "file_too_large",
  );
});

Deno.test("PROFILE-UNIT-04 정상 경로: 업로드 경로는 사용자 소유 폴더와 asset id로 고정한다", () => {
  assertEquals(
    avatarObjectPath(
      "57000000-0000-0000-0000-000000000001",
      "57000000-0000-4000-8000-000000000002",
      "image/png",
    ),
    "57000000-0000-0000-0000-000000000001/57000000-0000-4000-8000-000000000002.png",
  );
});

Deno.test("PROFILE-UNIT-05 거절 경로: finalize는 UUID와 SHA-256을 함께 요구한다", () => {
  assertThrows(
    () =>
      parseProfileRequest({
        action: "finalize_avatar",
        asset_id: "not-an-id",
        content_sha256: "a".repeat(64),
      }),
    Error,
    "invalid_request",
  );
});

