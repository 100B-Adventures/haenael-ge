"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clover, Plus } from "lucide-react";
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

function objectParticle(name: string) {
  const code = name.codePointAt(name.length - 1) ?? 0;
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
    ? "을"
    : "를";
}

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
  const supporterAvatars = detail.supporter_avatars ?? [];
  return (
    <article className="friend-detail" data-testid="friend-goal-detail">
      <GoalCover
        presetKey={detail.cover_preset_key}
        imageUrl={detail.cover_url}
        title={detail.title}
        size="hero"
        caption={detail.title}
      />
      <section className="friend-detail-hero">
        <h1>{displayName}의 <span>해낼게</span></h1>
        <FriendRelationshipBadge direction={relationshipDirection} />
        <p>{displayName}의 목표와 응원 워드맵을 함께 봐요.</p>
      </section>
      <div className="friend-detail-portrait">
        {profileImage
          ? <Image src={profileImage} alt={displayName} fill sizes="346px" unoptimized />
          : <span aria-hidden="true">{Array.from(displayName)[0]}</span>}
        <strong>{displayName}</strong>
      </div>
      <section className="friend-together-card">
        {detail.cheer_count > 0 && (
          <div className="friend-supporter-stack" aria-label={`${detail.cheer_count}명의 응원자`}>
            {Array.from({ length: Math.min(detail.cheer_count, 3) }, (_, index) => {
              const supporter = supporterAvatars[index];
              return (
                <span key={index} data-testid={supporter?.profile_image ? "supporter-avatar" : "neutral-supporter"}>
                  {supporter?.profile_image && !supporter.is_anonymous
                    ? <Image src={supporter.profile_image} alt="" width={32} height={32} unoptimized />
                    : <Clover aria-hidden="true" />}
                </span>
              );
            })}
            {detail.cheer_count > 3 && (
              <span aria-hidden="true" data-testid="supporter-overflow">+{detail.cheer_count - 3}</span>
            )}
          </div>
        )}
        <div>
          <strong>{detail.cheer_count}명이 {displayName}{objectParticle(displayName)} 응원하고 있어요</strong>
        </div>
      </section>
      <section className="friend-wordmap-card">
        <div className="friend-wordmap-heading">
          <h2>{displayName}이가 받은 응원</h2>
          <Link href={`/friends/${friendId}/wordmap?goal=${detail.goal_id}`}>전체 보기 ›</Link>
        </div>
        <Wordmap
          words={detail.wordmap.map((item) => ({
            word: item.word,
            word_count: item.weight,
          }))}
          ownerName={displayName}
          goalTitle={detail.title}
        />
        <p className="social-muted">같은 단어가 쌓일수록 크게 자라요.</p>
      </section>
      <Link href="/invite" className="friend-reinvite">
        <span><Plus aria-hidden="true" /></span>
        <div><strong>다른 친구도 초대할까요?</strong><small>초대한 친구가 들어오면 서로의 목표를 같이 응원해요.</small></div>
        <b aria-hidden="true">›</b>
      </Link>
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
