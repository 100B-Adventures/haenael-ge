import Image from "next/image";
import Link from "next/link";
import { MessageCircle, UserPlus } from "lucide-react";
import { ClampText } from "@/components/common/ClampText";
import type { SocialFriend } from "@/lib/social/contracts";
import { FriendRelationshipBadge } from "./FriendRelationshipBadge";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-friendgoallist";

export function FriendGoalList({ friends }: { friends: SocialFriend[] }) {
  if (friends.length === 0) {
    return (
      <section className="friends-cold-start" data-testid="friends-empty">
        <span className="friends-cold-icon" aria-hidden="true">
          🍀
        </span>
        <h2>{PRODUCT_COPY.TEXT_001}</h2>
        <p>{PRODUCT_COPY.TEXT_002}</p>
        <ol className="friends-cold-steps">
          <li>
            <span>1</span>
            <div>
              <strong>{PRODUCT_COPY.TEXT_003}</strong>
              <small>{PRODUCT_COPY.TEXT_004}</small>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>{PRODUCT_COPY.TEXT_005}</strong>
              <small>{PRODUCT_COPY.TEXT_006}</small>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>{PRODUCT_COPY.TEXT_007}</strong>
              <small>{PRODUCT_COPY.TEXT_008}</small>
            </div>
          </li>
        </ol>
        <Link href="/invite" className="social-primary-action">{PRODUCT_COPY.TEXT_009}</Link>
      </section>
    );
  }
  return (
    <section data-testid="friend-goal-list">
      <p className="friends-count">
        <span>{PRODUCT_COPY.TEXT_010}</span>
        <strong>{friends.length}{PRODUCT_COPY.TEXT_011}</strong>
      </p>
      <div className="friends-list-card">
        {friends.map((friend) => {
          const [primaryGoal] = friend.goals;
          const recentMessage = friend.recent_message;
          const nickname = friend.nickname ?? PRODUCT_COPY.TEXT_012;
          const progress = primaryGoal
            ? primaryGoal.cheer_count >= 10
              ? "high"
              : primaryGoal.cheer_count >= 5
                ? "mid"
                : "low"
            : "low";
          return (
            <article
              key={friend.friend_member_id}
              className="friend-list-item"
              data-testid="friend-card"
            >
              {primaryGoal ? (
                <>
                  <Link
                    href={`/friends/${friend.friend_member_id}?goal=${primaryGoal.goal_id}`}
                    className="friend-list-main friend-list-main--with-news"
                    data-testid="friend-goal-link"
                  >
                    <span className="friend-list-avatar">
                      {friend.profile_image ? (
                        <Image
                          src={friend.profile_image}
                          alt={`${nickname} 프로필`}
                          fill
                          sizes="48px"
                          unoptimized
                        />
                      ) : (
                        <span aria-hidden="true">
                          {Array.from(nickname)[0]}
                        </span>
                      )}
                    </span>
                    <span className="friend-list-copy">
                      <span className="friend-list-name" title={nickname}>
                        {nickname}
                      </span>
                      <strong>{primaryGoal.title}</strong>
                      <span
                        className={`friend-list-progress is-${progress}`}
                        aria-hidden="true"
                      >
                        <i />
                      </span>
                    </span>
                    <span className="friend-list-relation">
                      <FriendRelationshipBadge
                        direction={friend.relationship_direction}
                      />
                      <span className="friend-list-open" aria-hidden="true">
                        ›
                      </span>
                    </span>
                  </Link>
                  <div className="friend-list-news">
                    <MessageCircle aria-hidden="true" />
                    <ClampText
                      className="friend-list-news-message"
                      toggleLabel={`${nickname}의 최근 응원 내용`}
                    >
                      {recentMessage || PRODUCT_COPY.TEXT_013}
                    </ClampText>
                  </div>
                </>
              ) : (
                <div className="friend-list-main">
                  <span className="friend-list-avatar" aria-hidden="true">
                    {Array.from(nickname)[0]}
                  </span>
                  <span className="friend-list-copy">
                    <span className="friend-list-name" title={nickname}>
                      {nickname}
                    </span>
                    <strong>{PRODUCT_COPY.TEXT_014}</strong>
                  </span>
                  <span className="friend-list-relation">
                    <FriendRelationshipBadge
                      direction={friend.relationship_direction}
                    />
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {friends.length === 1 && (
        <aside
          className="friends-sparse-next"
          data-testid="friends-sparse-next-step"
        >
          <span className="friends-sparse-icon" aria-hidden="true">
            <UserPlus />
          </span>
          <div>
            <strong>{PRODUCT_COPY.TEXT_015}</strong>
            <p>{PRODUCT_COPY.TEXT_016}</p>
          </div>
          <Link href="/invite" className="social-primary-action">{PRODUCT_COPY.TEXT_017}</Link>
        </aside>
      )}
    </section>
  );
}
