import Link from "next/link";
import type { SocialFriend } from "@/lib/social/contracts";
import { GoalCover } from "./GoalCover";

export function FriendGoalList({ friends }: { friends: SocialFriend[] }) {
  if (friends.length === 0) {
    return (
      <section className="social-empty" data-testid="friends-empty">
        <h2>아직 연결된 친구가 없어요</h2>
        <p>초대 링크를 보내고 서로의 해낼게를 응원해 보세요.</p>
        <Link href="/invite" className="social-primary-action">
          친구 초대하기
        </Link>
      </section>
    );
  }
  return (
    <div className="social-stack" data-testid="friend-goal-list">
      {friends.map((friend) => (
        <section
          key={friend.friend_member_id}
          className="social-card"
          data-testid="friend-card"
        >
          <div className="social-card-heading">
            <div>
              <p className="social-eyebrow">친구</p>
              <h2>{friend.nickname ?? "이름 없는 친구"}</h2>
            </div>
            <span>{friend.goals.length}개 목표</span>
          </div>
          {friend.goals.length === 0
            ? <p className="social-muted">지금 공개한 목표가 없어요.</p>
            : friend.goals.map((goal) => (
              <Link
                key={goal.goal_id}
                href={`/friends/${friend.friend_member_id}?goal=${goal.goal_id}`}
                className="friend-goal-row"
                data-testid="friend-goal-link"
              >
                <GoalCover
                  presetKey={goal.cover_preset_key}
                  imageUrl={goal.cover_url}
                  title={goal.title}
                />
                <span className="friend-goal-copy">
                  <strong>{goal.title}</strong>
                  <small>{goal.cheer_count}명이 응원 중</small>
                </span>
                <span aria-hidden="true">›</span>
              </Link>
            ))}
        </section>
      ))}
    </div>
  );
}
