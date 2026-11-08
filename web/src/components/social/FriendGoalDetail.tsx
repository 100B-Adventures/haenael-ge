"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clover, Plus } from "lucide-react";
import { useState } from "react";
import type {
  FriendCheerHistoryItem,
  FriendGoalDetail as FriendGoalDetailData,
  RelationshipDirection,
  SocialGoal,
} from "@/lib/social/contracts";
import { removeFriendAction } from "@/app/(receiver)/social-actions";
import { GoalCover } from "./GoalCover";
import { Wordmap } from "@/components/goal/Wordmap";
import { FriendRelationshipBadge } from "./FriendRelationshipBadge";
import { ClampText } from "@/components/common/ClampText";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-friendgoaldetail";
import { formatDate } from "@/lib/utils/format";

function objectParticle(name: string) {
  const code = name.codePointAt(name.length - 1) ?? 0;
  return code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0
    ? "을"
    : "를";
}

export function FriendGoalDetail(
  { friendId, nickname, profileImage, relationshipDirection, recentMessage, detail, friendGoals, cheerHistory = [] }: {
    friendId: string;
    nickname: string | null;
    profileImage?: string | null;
    relationshipDirection: RelationshipDirection;
    recentMessage?: string | null;
    detail: FriendGoalDetailData;
    friendGoals: SocialGoal[];
    cheerHistory?: FriendCheerHistoryItem[];
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
        <h1>{displayName}{PRODUCT_COPY.TEXT_001}<span>{PRODUCT_COPY.TEXT_002}</span></h1>
        <FriendRelationshipBadge direction={relationshipDirection} />
        <p>{displayName}{PRODUCT_COPY.TEXT_003}</p>
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
          <strong>{detail.cheer_count}{PRODUCT_COPY.TEXT_004}{displayName}{objectParticle(displayName)}{PRODUCT_COPY.TEXT_005}</strong>
        </div>
      </section>
      <section className="friend-wordmap-card">
        <div className="friend-wordmap-heading">
          <h2>{displayName}{PRODUCT_COPY.TEXT_007}</h2>
          <Link href={`/friends/${friendId}/wordmap?goal=${detail.goal_id}`}>{PRODUCT_COPY.TEXT_008}</Link>
        </div>
        <Wordmap
          words={detail.wordmap.map((item) => ({
            word: item.word,
            word_count: item.weight,
          }))}
          ownerName={displayName}
          goalTitle={detail.title}
        />
        <p className="social-muted">{PRODUCT_COPY.TEXT_009}</p>
      </section>
      {recentMessage && (
        <section className="friend-recent-cheer" aria-label={PRODUCT_COPY.TEXT_006}>
          <ClampText toggleLabel={`${displayName}의 최근 응원 내용`}>
            {recentMessage}
          </ClampText>
        </section>
      )}
      {cheerHistory.length > 0 && (
        <section className="friend-cheer-history" data-testid="friend-cheer-history">
          <h2 className="my-section-title">{PRODUCT_COPY.TEXT_017}</h2>
          <div className="my-cheer-list">
            {cheerHistory.map((cheer) => {
              const sent = cheer.direction === "SENT";
              return (
                <article
                  key={cheer.cheer_id}
                  data-direction={cheer.direction}
                  data-testid="friend-cheer-history-item"
                >
                  <span className="my-cheer-avatar" aria-hidden="true">
                    {sent ? "↑" : "↓"}
                  </span>
                  <div>
                    <strong>
                      {sent
                        ? `${displayName}${PRODUCT_COPY.TEXT_018}`
                        : `${displayName}${PRODUCT_COPY.TEXT_019}`}
                    </strong>
                    <ClampText className="my-cheer-message">
                      {`💬 ${cheer.message || PRODUCT_COPY.TEXT_020}`}
                    </ClampText>
                  </div>
                  <div className="my-cheer-status">
                    <strong>{sent ? PRODUCT_COPY.TEXT_021 : PRODUCT_COPY.TEXT_022}</strong>
                    <small>{formatDate(cheer.created_at)}</small>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      <Link href="/invite" className="friend-reinvite">
        <span><Plus aria-hidden="true" /></span>
        <div><strong>{PRODUCT_COPY.TEXT_010}</strong><small>{PRODUCT_COPY.TEXT_011}</small></div>
        <b aria-hidden="true">›</b>
      </Link>
      {otherGoals.length > 0 && (
        <section className="friend-other-goals">
          <h2>{displayName}{PRODUCT_COPY.TEXT_012}</h2>
          {otherGoals.map((goal) => (
            <Link key={goal.goal_id} href={`/friends/${friendId}?goal=${goal.goal_id}`}>
              <span>{goal.title}</span><small>{PRODUCT_COPY.TEXT_013}{goal.cheer_count}{PRODUCT_COPY.TEXT_014}</small>
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
        {removing ? PRODUCT_COPY.TEXT_015 : PRODUCT_COPY.TEXT_016}
      </button>
      {error && <p className="social-error" role="alert">{error}</p>}
    </article>
  );
}
