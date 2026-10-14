"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { acceptFriendInviteAction } from "@/app/(receiver)/social-actions";
import type { InvitePreview } from "@/lib/social/contracts";
import { GoalCover } from "./GoalCover";

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
        <h1>이 초대를 사용할 수 없어요</h1>
        <p>{ERROR_COPY[errorCode] ?? "링크 상태를 확인하지 못했어요."}</p>
        <Link href="/" className="social-primary-action">해낼게 홈으로</Link>
      </section>
    );
  }
  return (
    <section
      className="invite-accept-card"
      data-testid="invite-accept-card"
    >
      <GoalCover
        presetKey={preview.cover_preset_key}
        title={preview.goal_title ?? "친구 초대"}
        size="banner"
      />
      <div className="invite-accept-person" aria-hidden="true">
        {Array.from(preview.inviter_nickname ?? "친구")[0]}
      </div>
      <p className="social-eyebrow">함께 응원할 친구 초대</p>
      <h1>{preview.inviter_nickname ?? "친구"}님이 함께 해내자고 초대했어요</h1>
      {preview.goal_title && (
        <p className="social-description">
          “{preview.goal_title}” 목표를 보고 서로 조용히 응원할 수 있어요.
        </p>
      )}
      {isAuthenticated
        ? (
          <button
            type="button"
            className="social-primary-action"
            onClick={accept}
            disabled={state === "loading"}
          >
            {state === "loading" ? "함께하는 중" : "초대 수락하고 함께하기"}
          </button>
        )
        : (
          <Link
            href={`/auth/kakao/start?redirect=${
              encodeURIComponent(`/invite/${token}`)
            }`}
            prefetch={false}
            className="social-primary-action"
          >
            로그인하고 초대 수락하기
          </Link>
        )}
    </section>
  );
}
