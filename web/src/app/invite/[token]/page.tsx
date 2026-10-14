import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { InviteAcceptCard } from "@/components/social/InviteAcceptCard";
import {
  ReceiverAppShell,
  ReceiverBrandMark,
} from "@/components/receiver/ReceiverShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asInvitePreview } from "@/lib/social/contracts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "친구 초대 · 해낼게",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

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
  return (
    <ReceiverAppShell locked={!user} currentPath={`/invite/${token}`}>
    <main className="min-h-[calc(100svh-var(--tabbar-height))] bg-background">
      <div className="receiver-page-frame">
        <header className="social-detail-head">
          <Link href="/" aria-label="해낼게 홈으로"><ChevronLeft aria-hidden="true" /></Link>
          <ReceiverBrandMark />
          <span aria-hidden="true" />
        </header>
        <div className="mx-auto max-w-[430px]">
          <InviteAcceptCard
            token={token}
            preview={asInvitePreview(previewData)}
            isAuthenticated={Boolean(user)}
            initialError={error ? inviteCode(error.message) : null}
          />
        </div>
      </div>
    </main>
    </ReceiverAppShell>
  );
}
