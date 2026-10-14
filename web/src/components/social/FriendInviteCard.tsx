"use client";

import { useState } from "react";
import { createFriendInviteAction } from "@/app/(receiver)/social-actions";
import type { InviteCreated } from "@/lib/social/contracts";

export function FriendInviteCard(
  { goals }: {
    goals: Array<{ id: number; title: string; visibility: string }>;
  },
) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? 0);
  const [invite, setInvite] = useState<InviteCreated | null>(null);
  const [state, setState] = useState<
    "idle" | "loading" | "copied" | "error" | "rate"
  >("idle");
  async function create() {
    setState("loading");
    const result = await createFriendInviteAction(goalId);
    if (!result.ok) {
      return setState(result.code === "invite_rate_limited" ? "rate" : "error");
    }
    setInvite(result.data);
    setState("idle");
  }
  async function copy() {
    if (!invite) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}${invite.web_path}`,
    );
    setState("copied");
  }
  if (!goals.length) {
    return (
      <section className="social-empty">
        <h2>초대할 공개 목표가 없어요</h2>
        <p>친구에게 보여줄 목표를 공개 또는 친구 공개로 바꾼 뒤 다시 시도해 주세요.</p>
      </section>
    );
  }
  return (
    <section className="social-card" data-testid="friend-invite-card">
      <label className="social-field-label" htmlFor="invite-goal">
        함께 볼 목표
      </label>
      <select
        id="invite-goal"
        value={goalId}
        onChange={(event) => setGoalId(Number(event.target.value))}
        className="social-select"
      >
        {goals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title} · {goal.visibility === "PUBLIC" ? "공개" : "친구 공개"}
          </option>
        ))}
      </select>
      {!invite
        ? (
          <button
            type="button"
            className="social-primary-action"
            disabled={state === "loading"}
            onClick={create}
          >
            {state === "loading" ? "만드는 중" : "초대 링크 만들기"}
          </button>
        )
        : (
          <div className="social-invite-result">
            <p className="social-muted">
              링크가 준비됐어요. 함께 응원하고 싶은 친구에게 보내 주세요.
            </p>
            <button
              type="button"
              className="social-primary-action"
              onClick={copy}
            >
              {state === "copied" ? "복사했어요" : "링크 복사"}
            </button>
          </div>
        )}
      {state === "rate" && (
        <p role="alert" className="social-error">
          한 시간에 만들 수 있는 초대 링크 10개를 모두 사용했어요.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="social-error">
          초대 링크를 만들지 못했어요. 다시 시도해 주세요.
        </p>
      )}
    </section>
  );
}
