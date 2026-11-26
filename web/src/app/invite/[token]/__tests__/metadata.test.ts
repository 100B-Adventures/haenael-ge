import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateMetadata } from "../page";

describe("초대 링크 OG metadata", () => {
  beforeEach(() => vi.mocked(createServerSupabaseClient).mockReset());

  it("INV-OG-05 정상: 유효 토큰의 C1 이미지 경로를 OpenGraph와 Twitter에 함께 쓴다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          inviter_nickname: "지민",
          goal_title: "토익 900점 넘기기",
          cover_preset_key: "c1",
        },
        error: null,
      }),
    } as never);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "valid-token" }),
    });

    const image = {
      url: "/invite/valid-token/opengraph-image",
      width: 1200,
      height: 630,
      alt: "해낼게 친구 초대 응원 입장권",
    };
    expect(metadata.openGraph).toMatchObject({
      title: "지민님이 해낼게에 초대했어요",
      images: [image],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: [image],
    });
  });

  it("INV-OG-06 거절: 무효 토큰도 같은 정적 기본판 이미지 라우트로 연결한다", async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "invite_not_found" },
      }),
    } as never);

    const metadata = await generateMetadata({
      params: Promise.resolve({ token: "invalid/token" }),
    });

    expect(metadata.openGraph).toMatchObject({
      title: "친구님이 해낼게에 초대했어요",
      images: [{ url: "/invite/invalid%2Ftoken/opengraph-image" }],
    });
  });
});
