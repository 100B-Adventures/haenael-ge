import Image from "next/image";
import Link from "next/link";
import { MessageCircle, UsersRound } from "lucide-react";
import type { SocialFriend } from "@/lib/social/contracts";

export function FriendGoalList({ friends }: { friends: SocialFriend[] }) {
  if (friends.length === 0) {
    return (
      <section className="friends-cold-start" data-testid="friends-empty">
        <span className="friends-cold-icon" aria-hidden="true">🍀</span>
        <h2>아직 친구가 없어요</h2>
        <p>가짜 친구로 채우지 않아요. 진짜 아는 사람을 초대하면 서로의 목표가 여기 나란히 쌓여요.</p>
        <ol className="friends-cold-steps">
          <li><span>1</span><div><strong>친구를 초대해요</strong><small>내가 아는 사람에게 카카오톡이나 링크로 보내요.</small></div></li>
          <li><span>2</span><div><strong>친구가 목표를 써요</strong><small>“나 ○○ 해낼게” 한 줄이면 시작할 수 있어요.</small></div></li>
          <li><span>3</span><div><strong>서로 조용히 응원해요</strong><small>친구의 목표와 응원이 차곡차곡 쌓여요.</small></div></li>
        </ol>
        <Link href="/invite" className="social-primary-action">
          친구 초대하기
        </Link>
      </section>
    );
  }
  return (
    <section data-testid="friend-goal-list">
      <p className="friends-count">서로 응원하는 친구 <strong>{friends.length}명</strong></p>
      <div className="friends-list-card">
        {friends.map((friend) => {
          const [primaryGoal, ...otherGoals] = friend.goals;
          const nickname = friend.nickname ?? "친구";
          const progress = primaryGoal
            ? primaryGoal.cheer_count >= 10 ? "high" : primaryGoal.cheer_count >= 5 ? "mid" : "low"
            : "low";
          return (
            <article key={friend.friend_member_id} className="friend-list-item" data-testid="friend-card">
              {primaryGoal
                ? (
                  <Link
                    href={`/friends/${friend.friend_member_id}?goal=${primaryGoal.goal_id}`}
                    className="friend-list-main"
                    data-testid="friend-goal-link"
                  >
                    <span className="friend-list-avatar">
                      {friend.profile_image
                        ? <Image src={friend.profile_image} alt={`${nickname} 프로필`} fill sizes="48px" unoptimized />
                        : <span aria-hidden="true">{Array.from(nickname)[0]}</span>}
                    </span>
                    <span className="friend-list-copy">
                      <span className="friend-list-name">{nickname}<small>서로 응원</small></span>
                      <strong>{primaryGoal.title}</strong>
                      <span className={`friend-list-progress is-${progress}`} aria-hidden="true"><i /></span>
                      <span className="friend-list-news"><MessageCircle aria-hidden="true" /> 응원 {primaryGoal.cheer_count}개가 쌓였어요</span>
                    </span>
                    <span className="friend-list-relation"><span>연결된 친구</span><small>서로 응원</small></span>
                  </Link>
                )
                : (
                  <div className="friend-list-main">
                    <span className="friend-list-avatar" aria-hidden="true">{Array.from(nickname)[0]}</span>
                    <span className="friend-list-copy">
                      <span className="friend-list-name">{nickname}<small>서로 응원</small></span>
                      <strong>지금 공개한 목표가 없어요.</strong>
                    </span>
                  </div>
                )}
              {otherGoals.length > 0 && (
                <div className="friend-extra-goals" aria-label={`${nickname}의 다른 목표`}>
                  {otherGoals.map((goal) => (
                    <Link
                      key={goal.goal_id}
                      href={`/friends/${friend.friend_member_id}?goal=${goal.goal_id}`}
                    >
                      {goal.title}
                    </Link>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
      <p className="friends-quiet-note"><UsersRound aria-hidden="true" /> 명시적으로 연결된 친구만 보여요. 금액도 순위도 없어요.</p>
    </section>
  );
}
