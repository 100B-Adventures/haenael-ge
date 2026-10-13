import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  COVER_MAX_BYTES,
  detectImageMime,
  externalizeSignedStorageUrl,
  extensionForMime,
  parseCoverUploadInput,
  sha256Hex,
} from "./goal-cover.ts";

Deno.test("GC-UNIT-01 정상 경로: jpeg 업로드 메타데이터를 계약 형태로 파싱한다", () => {
  const input = parseCoverUploadInput({
    goal_id: 3,
    file_name: "cover.jpg",
    mime_type: "image/jpeg",
    byte_size: 1024,
    content_sha256: "a".repeat(64),
  });
  assertEquals(input.goalId, 3);
  assertEquals(extensionForMime(input.mimeType), "jpg");
});

Deno.test("GC-UNIT-04 정상 경로: 내부 kong signed URL을 브라우저 접근 origin으로 변환한다", () => {
  assertEquals(
    externalizeSignedStorageUrl(
      "http://kong:8000/storage/v1/object/upload/sign/bucket/path?token=opaque",
      "http://127.0.0.1:8081/goal-cover-sign-upload",
      new Headers({
        host: "127.0.0.1:54321",
        "x-forwarded-proto": "http",
      }),
    ),
    "http://127.0.0.1:54321/storage/v1/object/upload/sign/bucket/path?token=opaque",
  );
});

Deno.test("GC-UNIT-05 로컬 runtime port와 gateway port가 다르면 public base override를 우선한다", () => {
  assertEquals(
    externalizeSignedStorageUrl(
      "http://kong:8000/storage/v1/object/upload/sign/bucket/path?token=opaque",
      "http://127.0.0.1:8081/goal-cover-sign-upload",
      new Headers({ host: "127.0.0.1:8000" }),
      "http://127.0.0.1:54321",
    ),
    "http://127.0.0.1:54321/storage/v1/object/upload/sign/bucket/path?token=opaque",
  );
});

Deno.test("GC-UNIT-02 거절 경로: 5MB 초과 파일을 거부한다", () => {
  assertThrows(
    () =>
      parseCoverUploadInput({
        goal_id: 3,
        file_name: "cover.webp",
        mime_type: "image/webp",
        byte_size: COVER_MAX_BYTES + 1,
        content_sha256: "a".repeat(64),
      }),
    Error,
    "file_too_large",
  );
});

Deno.test("GC-UNIT-03 경계값: magic bytes와 SHA-256을 실제 바이트에서 계산한다", async () => {
  const png = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    1,
  ]);
  assertEquals(detectImageMime(png), "image/png");
  assertEquals(
    await sha256Hex(new TextEncoder().encode("haenael")),
    "8b45121eeb5327d99008253b5982712c9beea192e3797b6fef3e02d7c44992d1",
  );
});
