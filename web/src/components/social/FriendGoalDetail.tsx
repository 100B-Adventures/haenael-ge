"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import type {
  FriendGoalDetail as FriendGoalDetailData,
  SocialGoal,
} from "@/lib/social/contracts";
import { removeFriendAction } from "@/app/(receiver)/social-actions";
import { GoalCover } from "./GoalCover";

export function FriendGoalDetail(
  { friendId, nickname, profileImage, detail, friendGoals }: {
    friendId: string;
    nickname: string | null;
    profileImage?: string | null;
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
        caption={`${displayName}의 ${detail.title}`}
      />
      <section className="friend-detail-hero">
        <h1>{displayName}을 응원하는 사람으로서<br />열리는 것들</h1>
        <p>오래 함께한 응원자에게만 조용히 열리는 자리예요. 다시 왔을 때 여기에서 만나요.</p>
      </section>
      <div className="friend-detail-portrait">
        {profileImage
          ? <Image src={profileImage} alt={displayName} fill sizes="346px" unoptimized />
          : <span aria-hidden="true">{Array.from(displayName)[0]}</span>}
        <strong>{displayName} · {detail.title}</strong>
      </div>
      <section className="friend-together-card">
        <div className="friend-supporter-stack" aria-label={`${detail.cheer_count}명의 응원자`}>
          <span aria-hidden="true">응</span>
          <span aria-hidden="true">원</span>
          <span aria-hidden="true">+{Math.max(detail.cheer_count - 2, 0)}</span>
        </div>
        <div>
          <strong>{detail.cheer_count}명이 {displayName}을 조용히 응원하는 중이에요</strong>
        </div>
      </section>
      <section className="friend-private-news">
        <p>🔓 응원자에게만 보이는 근황</p>
        <div className="friend-private-news-body">
          <span className="friend-private-news-avatar" aria-hidden="true">
            {profileImage
              ? <Image src={profileImage} alt="" width={52} height={52} unoptimized />
              : Array.from(displayName)[0]}
          </span>
          <span>
            <strong>{detail.reason || "이 목표를 이어가는 중이에요."}</strong>
            <small>{displayName} · 응원자에게만 공개</small>
          </span>
        </div>
      </section>
      <Link href="/invite" className="friend-reinvite">
        <span><Plus aria-hidden="true" /></span>
        <div><strong>다른 친구도 이 자리에 부를까요?</strong><small>내가 고른 친구에게만 조용히 초대해요.</small></div>
        <b aria-hidden="true">›</b>
      </Link>
      <details className="social-card friend-wordmap-card">
        <summary className="social-card-heading">
          <h2>응원 워드맵</h2>
          <span>{detail.wordmap.length}개 단어</span>
        </summary>
        {detail.wordmap.length
          ? (
            <div className="social-wordmap">
              {detail.wordmap.map((item) => (
                <span key={item.word}>{item.word}</span>
              ))}
            </div>
          )
          : <p className="social-muted">첫 응원을 기다리고 있어요.</p>}
      </details>
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
