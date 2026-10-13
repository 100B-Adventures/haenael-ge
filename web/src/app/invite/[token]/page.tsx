import type { Metadata } from "next";
import { InviteAcceptCard } from "@/components/social/InviteAcceptCard";
import { ReceiverBrandMark } from "@/components/receiver/ReceiverShell";
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
    <main className="min-h-svh bg-background">
      <div className="receiver-page-frame">
        <ReceiverBrandMark />
        <div className="mx-auto mt-8 max-w-[430px]">
          <InviteAcceptCard
            token={token}
            preview={asInvitePreview(previewData)}
            isAuthenticated={Boolean(user)}
            initialError={error ? inviteCode(error.message) : null}
          />
        </div>
      </div>
    </main>
  );
}
