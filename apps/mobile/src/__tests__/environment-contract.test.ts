import { describe, expect, it } from "vitest";
import environmentExample from "../../.env.example?raw";

function exampleEnvironment() {
  return Object.fromEntries(
    environmentExample
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

describe("모바일 운영 URL 계약", () => {
  it("TC-APP-02-16 Vercel 운영 별칭의 체크아웃과 버전 API를 사용한다", () => {
    const env = exampleEnvironment();
    expect(env.EXPO_PUBLIC_TOSS_CHECKOUT_URL).toBe(
      "https://haenael-ge.vercel.app/api/mobile/toss-checkout",
    );
    expect(env.EXPO_PUBLIC_MINIMUM_VERSION_URL).toBe(
      "https://haenael-ge.vercel.app/api/mobile/minimum-version",
    );
  });
});
