import { assertEquals } from "jsr:@std/assert@1";
import {
  classifyRemovalResults,
  groupCleanupClaims,
  removeCleanupClaims,
  returnedObjectPaths,
  splitStoragePath,
} from "./storage-cleanup.ts";

Deno.test("CV-11 삭제 반환은 object_path 전체 문자열로만 대조한다", () => {
  assertEquals(
    [...returnedObjectPaths([{ name: "owner/1/same.webp" }])],
    ["owner/1/same.webp"],
  );
  assertEquals(
    returnedObjectPaths([{ name: "owner/1/same.webp" }]).has("same.webp"),
    false,
  );
});

Deno.test("CV-13 같은 path라도 bucket_id가 다르면 다른 배치다", () => {
  const grouped = groupCleanupClaims([
    { id: 1, bucket_id: "a", object_path: "same/path", lock_token: "x" },
    { id: 2, bucket_id: "b", object_path: "same/path", lock_token: "y" },
  ]);
  assertEquals(grouped.size, 2);
  assertEquals(grouped.get("a")?.[0].id, 1);
  assertEquals(grouped.get("b")?.[0].id, 2);
});

Deno.test("CV-11 객체 부재 재조회용 경로를 folder와 name으로 분리한다", () => {
  assertEquals(splitStoragePath("owner/goal/file.webp"), {
    folder: "owner/goal",
    name: "file.webp",
  });
  assertEquals(splitStoragePath("file.webp"), { folder: "", name: "file.webp" });
});

Deno.test("CV-11 부분 성공은 반환 2건만 성공이고 남은 존재 객체는 실패다", async () => {
  const claims = [
    { id: 1, bucket_id: "quarantine", object_path: "a.webp", lock_token: "x" },
    { id: 2, bucket_id: "quarantine", object_path: "b.webp", lock_token: "x" },
    { id: 3, bucket_id: "quarantine", object_path: "c.webp", lock_token: "x" },
  ];
  const outcomes = await classifyRemovalResults(
    claims,
    new Set(["a.webp", "b.webp"]),
    async (claim) => claim.object_path !== "c.webp",
  );
  assertEquals([...outcomes.entries()], [[1, true], [2, true], [3, false]]);
});

Deno.test("CV-11 포이즌 1건이 배치 오류를 내도 정상 객체는 개별 삭제된다", async () => {
  const claims = [
    { id: 1, bucket_id: "quarantine", object_path: "good-a.webp", lock_token: "x" },
    { id: 2, bucket_id: "quarantine", object_path: "poison.webp", lock_token: "x" },
    { id: 3, bucket_id: "quarantine", object_path: "good-b.webp", lock_token: "x" },
  ];
  const calls: string[][] = [];
  const outcomes = await removeCleanupClaims(
    claims,
    async (paths) => {
      calls.push(paths);
      if (paths.length > 1 || paths[0] === "poison.webp") return { data: null, error: new Error("poison") };
      return { data: [{ name: paths[0] }], error: null };
    },
    async (claim) => claim.object_path !== "poison.webp",
  );
  assertEquals(calls, [["good-a.webp", "poison.webp", "good-b.webp"], ["good-a.webp"], ["poison.webp"], ["good-b.webp"]]);
  assertEquals([...outcomes.entries()], [[1, true], [2, false], [3, true]]);
});
