"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptFriendInviteAction } from "@/app/(receiver)/social-actions";
import type { InvitePreview } from "@/lib/social/contracts";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-inviteacceptcard";

const ERROR_COPY: Record<string, string> = {
  invite_expired: "이 초대는 더 이상 사용할 수 없어요.",
  invite_revoked: "초대자가 이 링크를 취소했어요.",
  invite_already_used: "이미 사용된 초대 링크예요.",
  self_invite: "내가 만든 초대 링크는 직접 수락할 수 없어요.",
  blocked_relationship: "이 초대로는 다시 연결할 수 없어요.",
  invite_not_found: "초대 링크를 찾을 수 없어요.",
};

export function InviteAcceptCard(
  { token, preview, isAuthenticated, initialError }: {
    token: string;
    preview: InvitePreview | null;
    isAuthenticated: boolean;
    initialError?: string | null;
  },
) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">(
    initialError ? "error" : "idle",
  );
  const [errorCode, setErrorCode] = useState(initialError ?? "");
  async function accept() {
    setState("loading");
    const result = await acceptFriendInviteAction(token);
    if (!result.ok) {
      setState("error");
      setErrorCode(result.code);
      return;
    }
    router.push("/friends");
  }
  if (!preview || state === "error") {
    return (
      <section className="social-empty" data-testid="invite-error">
        <h1>{PRODUCT_COPY.TEXT_001}</h1>
        <p>{ERROR_COPY[errorCode] ?? PRODUCT_COPY.TEXT_002}</p>
        <Link href="/" className="social-primary-action">{PRODUCT_COPY.TEXT_003}</Link>
      </section>
    );
  }
  return (
    <section
      className="invite-accept-card"
      data-testid="invite-accept-card"
    >
      <div className="invite-accept-cover" data-testid="invite-accept-cover" aria-hidden="true">
        <span>🍀</span>
      </div>
      <div className="invite-accept-person" aria-hidden="true">
        {Array.from(preview.inviter_nickname ?? PRODUCT_COPY.TEXT_004)[0]}
      </div>
      <p className="social-eyebrow">{PRODUCT_COPY.TEXT_005}</p>
      <h1>{preview.inviter_nickname ?? PRODUCT_COPY.TEXT_006}{PRODUCT_COPY.TEXT_007}</h1>
      {preview.goal_title && (
        <p className="social-description">
          {preview.inviter_nickname ?? PRODUCT_COPY.TEXT_008}{PRODUCT_COPY.TEXT_009}{preview.goal_title}{PRODUCT_COPY.TEXT_010}</p>
      )}
      {isAuthenticated
        ? (
          <button
            type="button"
            className="social-primary-action"
            onClick={accept}
            disabled={state === "loading"}
          >
            {state === "loading" ? PRODUCT_COPY.TEXT_011 : PRODUCT_COPY.TEXT_012}
          </button>
        )
        : (
          <Link
            href={`/auth/kakao/start?redirect=${
              encodeURIComponent(`/invite/${token}`)
            }`}
            prefetch={false}
            className="social-primary-action"
          >{PRODUCT_COPY.TEXT_013}</Link>
        )}
    </section>
  );
}
