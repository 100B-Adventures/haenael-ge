import Image from "next/image";
import Link from "next/link";
import { MessageCircle, UserPlus } from "lucide-react";
import type { SocialFriend } from "@/lib/social/contracts";

export function FriendGoalList({ friends }: { friends: SocialFriend[] }) {
  if (friends.length === 0) {
    return (
      <section className="friends-cold-start" data-testid="friends-empty">
        <span className="friends-cold-icon" aria-hidden="true">🍀</span>
        <h2>아직 친구가 없어요</h2>
        <p>아는 사람을 초대하거나 서로 응원하면 친구가 돼요. 친구의 목표는 여기에 쌓여요.</p>
        <ol className="friends-cold-steps">
          <li><span>1</span><div><strong>친구를 초대해요</strong><small>내가 아는 사람에게 카카오톡이나 링크로 보내요.</small></div></li>
          <li><span>2</span><div><strong>친구가 목표를 써요</strong><small>“나 ○○ 해낼게” 한 줄이면 시작할 수 있어요.</small></div></li>
          <li><span>3</span><div><strong>응원이 도착해요</strong><small>응원을 주고받으면 친구 목록에 바로 보여요.</small></div></li>
        </ol>
        <Link href="/invite" className="social-primary-action">
          친구 초대하기
        </Link>
      </section>
    );
  }
  return (
    <section data-testid="friend-goal-list">
      <p className="friends-count">친구 <strong>{friends.length}명</strong></p>
      <div className="friends-list-card">
        {friends.map((friend) => {
          const [primaryGoal] = friend.goals;
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
                      <span className="friend-list-name" title={nickname}>{nickname}</span>
                      <strong>{primaryGoal.title}</strong>
                      <span className={`friend-list-progress is-${progress}`} aria-hidden="true"><i /></span>
                      <span className="friend-list-news"><MessageCircle aria-hidden="true" /> 응원 {primaryGoal.cheer_count}개가 쌓였어요</span>
                    </span>
                    <span className="friend-list-open" aria-hidden="true">›</span>
                  </Link>
                )
                : (
                  <div className="friend-list-main">
                    <span className="friend-list-avatar" aria-hidden="true">{Array.from(nickname)[0]}</span>
                    <span className="friend-list-copy">
                      <span className="friend-list-name" title={nickname}>{nickname}</span>
                      <strong>지금 공개한 목표가 없어요.</strong>
                    </span>
                  </div>
                )}
            </article>
          );
        })}
      </div>
      {friends.length === 1 && (
        <aside className="friends-sparse-next" data-testid="friends-sparse-next-step">
          <span className="friends-sparse-icon" aria-hidden="true"><UserPlus /></span>
          <div>
            <strong>한 명 더 함께 응원해볼까요?</strong>
            <p>친구를 초대하거나 응원을 주고받으면 이 목록에 바로 이어져요.</p>
          </div>
          <Link href="/invite" className="social-primary-action">친구 초대하기</Link>
        </aside>
      )}
    </section>
  );
}
