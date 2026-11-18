import { assertEquals } from "jsr:@std/assert@1";
import { decryptSecret, encryptSecret } from "./secret-box.ts";

Deno.test("TC-APP-02-13 외부 거래 토큰은 AES-GCM 암호문에서만 복원한다", async () => {
  const key = btoa("k".repeat(32));
  const encrypted = await encryptSecret("google-external-token", key);
  assertEquals(await decryptSecret(encrypted, key), "google-external-token");
});
