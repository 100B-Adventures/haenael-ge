import { describe, expect, it } from "vitest";
import {
  findLatestAnnouncedRelease,
  latestAnnouncedRelease,
  latestPublicRelease,
  type PublicReleaseNote,
} from "@/lib/release-notes";

const note = (version: string, notify: boolean): PublicReleaseNote => ({
  version,
  releaseTag: `${version}+t`,
  date: "2026-11-13",
  title: version,
  summary: version,
  notify,
  tryHref: "/updates",
  feedbackHref: "/updates#feedback",
});

describe("새로운 기능 카드가 가리키는 버전", () => {
  it("버그 수정판(notify:false)이 최신이어도 가장 최근 notify:true 버전을 고른다", () => {
    expect(findLatestAnnouncedRelease([note("2.2.1", false), note("2.2.0", true), note("2.1.4", false)])?.version).toBe("2.2.0");
  });
  it("최신이 notify:true 면 그 버전이다", () => {
    expect(findLatestAnnouncedRelease([note("2.3.0", true), note("2.2.1", false)])?.version).toBe("2.3.0");
  });
  it("안내할 버전이 없으면 null 이라 카드를 띄우지 않는다", () => {
    expect(findLatestAnnouncedRelease([note("2.2.1", false), note("2.1.4", false)])).toBeNull();
  });
  it("현재 생성물: 기록 최신은 2.2.1, 안내는 2.2.0", () => {
    expect(latestPublicRelease.version).toBe("2.2.1");
    expect(latestAnnouncedRelease?.version).toBe("2.2.0");
  });
});
