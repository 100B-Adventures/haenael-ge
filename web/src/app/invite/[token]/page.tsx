import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InviteAcceptCard } from "@/components/social/InviteAcceptCard";
import {
  ReceiverAppShell,
  ReceiverBrandMark,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { observeInvitePreview } from "@/lib/social/contracts";
import { INVITE_OG_ALT, INVITE_OG_SIZE, inviteOgImagePath } from "@/features/invite-og/model";

export const dynamic = "force-dynamic";
// 카카오톡·메신저 미리보기: 누가 어떤 목표로 초대했는지 제목·설명·C1 입장권에 싣는다.
export async function generateMetadata(
  { params }: { params: Promise<{ token: string }> },
): Promise<Metadata> {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("friend_invite_preview", { token });
  const preview = error ? null : observeInvitePreview(data);
  const inviter = preview?.inviter_nickname?.trim() || "친구";
  const title = `${inviter}님이 해낼게에 초대했어요`;
  const description = preview?.goal_title
    ? `“${preview.goal_title}” 서로의 목표를 같이 응원해요. 들어가서 내 목표도 써 보세요.`
    : "서로의 목표를 같이 응원해요. 들어가서 내 목표도 써 보세요.";
  const image = {
    url: inviteOgImagePath(token),
    ...INVITE_OG_SIZE,
    alt: INVITE_OG_ALT,
  };
  return {
    title: `${title} · 해낼게`,
    description,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: { title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function inviteCode(message: string | undefined) {
  return [
    "invite_expired",
    "invite_revoked",
    "invite_already_used",
    "invite_not_found",
  ].find((code) => message?.includes(code)) ?? "invite_not_found";
}

export default async function InviteTokenPage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const [{ data: previewData, error }, { data: { user } }] = await Promise.all([
    supabase.rpc("friend_invite_preview", { token }),
    supabase.auth.getUser(),
  ]);
  const preview = error ? null : observeInvitePreview(previewData);
  return (
    <ReceiverAppShell locked={!user} currentPath={`/invite/${token}`}>
    <main className="invite-token-page min-h-[calc(100svh-var(--tabbar-height))] bg-background">
      <div className="receiver-page-frame">
        <header className="social-detail-head">
          <Link href="/" aria-label="해낼게 홈으로"><ChevronLeft aria-hidden="true" /></Link>
          <ReceiverBrandMark />
          <span aria-hidden="true" />
        </header>
        <div className="mx-auto max-w-[430px]">
          <InviteAcceptCard
            token={token}
            preview={preview}
            isAuthenticated={Boolean(user)}
            initialError={error ? inviteCode(error.message) : null}
          />
        </div>
      </div>
    </main>
    </ReceiverAppShell>
  );
}
