"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FriendGoalDetail as FriendGoalDetailData } from "@/lib/social/contracts";
import { removeFriendAction } from "@/app/(receiver)/social-actions";
import { GoalCover } from "./GoalCover";

export function FriendGoalDetail(
  { friendId, nickname, detail }: {
    friendId: string;
    nickname: string | null;
    detail: FriendGoalDetailData;
  },
) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (
      !window.confirm(
        "친구 관계를 해제할까요? 다시 연결하려면 새 초대가 필요해요.",
      )
    ) return;
    setRemoving(true);
    const result = await removeFriendAction(friendId);
    setRemoving(false);
    if (!result.ok) return setError("친구 관계를 해제하지 못했어요.");
    router.push("/friends");
  }
  return (
    <article data-testid="friend-goal-detail">
      <GoalCover
        presetKey={detail.cover_preset_key}
        imageUrl={detail.cover_url}
        title={detail.title}
        size="hero"
      />
      <p className="social-eyebrow">{nickname ?? "친구"}의 해낼게</p>
      <h1 className="receiver-page-title">{detail.title}</h1>
      <p className="social-description">
        {detail.reason || "이 목표를 이어가는 중이에요."}
      </p>
      <section className="social-card">
        <div className="social-card-heading">
          <h2>응원 워드맵</h2>
          <span>{detail.cheer_count}명</span>
        </div>
        {detail.wordmap.length
          ? (
            <div className="social-wordmap">
              {detail.wordmap.map((item) => (
                <span key={item.word}>{item.word}</span>
              ))}
            </div>
          )
          : <p className="social-muted">첫 응원을 기다리고 있어요.</p>}
      </section>
      <button
        type="button"
        className="social-danger-action"
        onClick={remove}
        disabled={removing}
      >
        {removing ? "해제 중" : "친구 관계 해제"}
      </button>
      {error && <p className="social-error" role="alert">{error}</p>}
    </article>
  );
}
