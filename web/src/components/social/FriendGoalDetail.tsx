"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useState } from "react";
import type {
  FriendGoalDetail as FriendGoalDetailData,
  RelationshipDirection,
  SocialGoal,
} from "@/lib/social/contracts";
import { removeFriendAction } from "@/app/(receiver)/social-actions";
import { GoalCover } from "./GoalCover";
import { Wordmap } from "@/components/goal/Wordmap";
import { FriendRelationshipBadge } from "./FriendRelationshipBadge";
import { Collapsible } from "@/components/common/Collapsible";

export function FriendGoalDetail(
  { friendId, nickname, profileImage, relationshipDirection, detail, friendGoals }: {
    friendId: string;
    nickname: string | null;
    profileImage?: string | null;
    relationshipDirection: RelationshipDirection;
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
        <h1>{displayName}의 해낼게</h1>
        <FriendRelationshipBadge direction={relationshipDirection} />
        <p>{displayName}의 목표와 응원 워드맵을 함께 봐요.</p>
      </section>
      <div className="friend-detail-portrait">
        {profileImage
          ? <Image src={profileImage} alt={displayName} fill sizes="346px" unoptimized />
          : <span aria-hidden="true">{Array.from(displayName)[0]}</span>}
        <strong>{displayName} · {detail.title}</strong>
      </div>
      <section className="friend-together-card">
        <div className="friend-supporter-stack" aria-label={`${detail.cheer_count}명의 응원자`}>
          <span aria-hidden="true"><Image src="/images/social-viral/seoyeon.png" alt="" width={32} height={32} /></span>
          <span aria-hidden="true"><Image src="/images/social-viral/jimin.png" alt="" width={32} height={32} /></span>
          <span aria-hidden="true"><Image src={profileImage ?? "/images/social-viral/dogyeong.png"} alt="" width={32} height={32} unoptimized={Boolean(profileImage)} /></span>
          <span aria-hidden="true">+{Math.max(detail.cheer_count - 3, 0)}</span>
        </div>
        <div>
          <strong>{detail.cheer_count}명이 {displayName}을 조용히 응원하는 중이에요</strong>
        </div>
      </section>
      <Link href="/invite" className="friend-reinvite">
        <span><Plus aria-hidden="true" /></span>
        <div><strong>다른 친구도 이 자리에 부를까요?</strong><small>내가 고른 친구에게만 조용히 초대해요.</small></div>
        <b aria-hidden="true">›</b>
      </Link>
      <Collapsible
        className="social-card friend-wordmap-card"
        policy={{ auxiliary: true, exceedsLimit: detail.wordmap.length > 8, hasCollapsedContext: true }}
      >
        {(expanded) => <>
        <div className="social-card-heading">
          <h2>응원 워드맵</h2>
          <span>{detail.wordmap.length}개 단어</span>
        </div>
        {expanded && <Wordmap
          words={detail.wordmap.map((item) => ({
            word: item.word,
            word_count: item.weight,
          }))}
          ownerName={displayName}
        />}
        </>}
      </Collapsible>
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
