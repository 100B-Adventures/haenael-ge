"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import type {
  FriendGoalDetail as FriendGoalDetailData,
  SocialGoal,
} from "@/lib/social/contracts";
import { removeFriendAction } from "@/app/(receiver)/social-actions";
import { GoalCover } from "./GoalCover";

export function FriendGoalDetail(
  { friendId, nickname, detail, friendGoals }: {
    friendId: string;
    nickname: string | null;
    detail: FriendGoalDetailData;
    friendGoals: SocialGoal[];
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
  const displayName = nickname ?? "친구";
  const otherGoals = friendGoals.filter((goal) => goal.goal_id !== detail.goal_id);
  return (
    <article className="friend-detail" data-testid="friend-goal-detail">
      <GoalCover
        presetKey={detail.cover_preset_key}
        imageUrl={detail.cover_url}
        title={detail.title}
        size="hero"
      />
      <section className="friend-detail-hero">
        <div className="friend-detail-avatar" aria-hidden="true">{Array.from(displayName)[0]}</div>
        <p className="social-eyebrow">{displayName}의 해낼게</p>
        <h1 className="receiver-page-title">{detail.title}</h1>
        <p>{detail.reason || "이 목표를 이어가는 중이에요."}</p>
      </section>
      <section className="friend-together-card">
        <UsersRound aria-hidden="true" />
        <div>
          <strong>{detail.cheer_count}개의 응원이 {displayName}의 목표에 쌓였어요</strong>
          <p>금액이나 순위 없이, 응원한 마음만 보여요.</p>
        </div>
      </section>
      <section className="social-card friend-wordmap-card">
        <div className="social-card-heading">
          <h2>응원 워드맵</h2>
          <span>{detail.wordmap.length}개 단어</span>
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
      {otherGoals.length > 0 && (
        <section className="friend-other-goals">
          <h2>{displayName}의 다른 목표</h2>
          {otherGoals.map((goal) => (
            <Link key={goal.goal_id} href={`/friends/${friendId}?goal=${goal.goal_id}`}>
              <span>{goal.title}</span><small>응원 {goal.cheer_count}개</small>
            </Link>
          ))}
        </section>
      )}
      <Link href="/invite" className="friend-reinvite">
        <span><Plus aria-hidden="true" /></span>
        <div><strong>다른 친구도 이 자리에 부를까요?</strong><small>내가 고른 친구에게만 조용히 초대해요.</small></div>
        <b aria-hidden="true">›</b>
      </Link>
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
