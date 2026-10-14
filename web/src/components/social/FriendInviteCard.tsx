"use client";

import { Link2, MessageCircle, ShieldCheck, UserRoundPlus } from "lucide-react";
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
    "idle" | "loading" | "copied" | "shared" | "error" | "rate"
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

  function invitationUrl() {
    return invite ? `${window.location.origin}${invite.web_path}` : "";
  }

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invitationUrl());
      setState("copied");
    } catch {
      setState("error");
    }
  }

  async function share() {
    if (!invite) return;
    const selectedGoal = goals.find((goal) => goal.id === goalId);
    if (!navigator.share) return copy();
    try {
      await navigator.share({
        title: "해낼게 친구 초대",
        text: `같이 응원할래? ${selectedGoal?.title ?? "내 목표"}`,
        url: invitationUrl(),
      });
      setState("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    }
  }

  return (
    <div className="invite-flow" data-testid="friend-invite-card">
      <section className="invite-hero-card">
        <p className="social-eyebrow">함께 응원할 친구 부르기</p>
        <h1>혼자 응원하지 말고,<br />친구랑 같이 밀어줘요</h1>
        <p>친구가 들어오면 서로의 목표를 보고 조용히 응원할 수 있어요.</p>
        <div className="invite-people" aria-hidden="true">
          <span>서</span><span>도</span><span>민</span><UserRoundPlus />
        </div>
      </section>

      <section className="invite-preview" aria-label="카카오톡 초대 미리보기">
        <p>카카오톡으로 이렇게 전해져요</p>
        <div>
          <span className="invite-preview-avatar">서</span>
          <h2>서연님이 해낼게에 초대했어요</h2>
          <p>“네 목표도 내가 조용히 응원할게. 같이 해낼래?”</p>
          <strong>들어가서 내 목표 쓰기 →</strong>
        </div>
      </section>

      {goals.length === 0
        ? (
          <section className="social-empty">
            <h2>초대할 목표가 없어요</h2>
            <p>친구에게 보여줄 목표를 공개 또는 친구 공개로 바꾼 뒤 다시 시도해 주세요.</p>
          </section>
        )
        : (
          <section className="invite-actions">
            <label className="social-field-label" htmlFor="invite-goal">
              함께 볼 목표
            </label>
            <select
              id="invite-goal"
              value={goalId}
              onChange={(event) => setGoalId(Number(event.target.value))}
              className="social-select"
              disabled={Boolean(invite)}
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
                  className="social-primary-action w-full"
                  disabled={state === "loading"}
                  onClick={create}
                >
                  {state === "loading" ? "만드는 중" : "초대 링크 만들기"}
                </button>
              )
              : (
                <>
                  <p className="social-muted">링크가 준비됐어요. 함께 응원하고 싶은 친구에게 보내 주세요.</p>
                  <div className="invite-share-row">
                    <button type="button" className="is-kakao" onClick={() => void share()}>
                      <MessageCircle aria-hidden="true" /><span>카카오톡 초대</span>
                    </button>
                    <button type="button" onClick={() => void copy()}>
                      <Link2 aria-hidden="true" /><span>초대 링크 복사</span>
                    </button>
                  </div>
                </>
              )}
            {state === "copied" && <p role="status" className="social-success">초대 링크를 복사했어요.</p>}
            {state === "shared" && <p role="status" className="social-success">친구에게 초대를 보냈어요.</p>}
            {state === "rate" && <p role="alert" className="social-error">잠시 뒤에 새 초대 링크를 만들어 주세요.</p>}
            {state === "error" && <p role="alert" className="social-error">초대 링크를 만들지 못했어요. 다시 시도해 주세요.</p>}
          </section>
        )}

      <p className="invite-safe-note">
        <ShieldCheck aria-hidden="true" />
        연락처를 통째로 읽지 않아요. 내가 직접 고른 친구에게만 초대를 보내요.
      </p>
    </div>
  );
}
