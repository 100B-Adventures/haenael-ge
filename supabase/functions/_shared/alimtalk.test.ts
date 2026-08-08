import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  createSolapiAuthorization,
  generateSolapiSignature,
} from "./alimtalk.ts";

const OFFICIAL_EXAMPLE_DATE = "2019-07-01T00:41:48Z";
const OFFICIAL_EXAMPLE_SALT = "jqsba2jxjnrjor";

Deno.test("Solapi 서명 — date+salt를 HMAC-SHA256 lowercase hex로 생성", async () => {
  const signature = await generateSolapiSignature(
    "test-secret",
    OFFICIAL_EXAMPLE_DATE,
    OFFICIAL_EXAMPLE_SALT,
  );

  assertEquals(
    signature,
    "24ec8a9aa1a9e5fe93c45654e888e652e61c9fe829cffb47c2b4566d63016f79",
  );
  assertMatch(signature, /^[0-9a-f]{64}$/);
});

Deno.test("Solapi Authorization — 공식 예시 date/salt와 ISO 8601 형식 유지", async () => {
  const authorization = await createSolapiAuthorization(
    "NCSAYU7YDBXYORXC",
    "test-secret",
    {
      date: OFFICIAL_EXAMPLE_DATE,
      salt: OFFICIAL_EXAMPLE_SALT,
    },
  );

  assertMatch(
    authorization,
    /^HMAC-SHA256 apiKey=NCSAYU7YDBXYORXC, date=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z, salt=jqsba2jxjnrjor, signature=[0-9a-f]{64}$/,
  );
  assertEquals(
    authorization,
    `HMAC-SHA256 apiKey=NCSAYU7YDBXYORXC, date=${OFFICIAL_EXAMPLE_DATE}, salt=${OFFICIAL_EXAMPLE_SALT}, signature=24ec8a9aa1a9e5fe93c45654e888e652e61c9fe829cffb47c2b4566d63016f79`,
  );
});
