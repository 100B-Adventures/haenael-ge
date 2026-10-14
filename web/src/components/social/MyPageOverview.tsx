import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, HeartHandshake, Target, Users } from "lucide-react";
import { GoalCover } from "./GoalCover";
import type { MySocialDashboard } from "@/lib/social/contracts";

const achievementCards = [
  {
    key: "completed_goal_count",
    label: "달성한 목표",
    description: "완료 상태로 확인된 목표",
    Icon: Target,
  },
  {
    key: "received_cheer_count",
    label: "받은 응원",
    description: "결제 확정된 응원",
    Icon: HeartHandshake,
  },
  {
    key: "connected_friend_count",
    label: "연결된 친구",
    description: "현재 연결된 친구",
    Icon: Users,
  },
] as const;

export function MyPageOverview({ dashboard }: { dashboard: MySocialDashboard }) {
  const activeGoalCount = dashboard.goals.filter((goal) =>
    goal.status === "ACTIVE"
  ).length;
  const nickname = dashboard.profile.nickname?.trim() || "해낼게 사용자";
  const initial = Array.from(nickname)[0] ?? "해";

  return (
    <div className="social-stack" data-testid="my-page-overview">
      <section className="social-card flex items-center gap-3" data-testid="my-profile-summary">
        <div className="relative flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-black text-accent-foreground">
          {dashboard.profile.profile_image
            ? (
              <Image
                src={dashboard.profile.profile_image}
                alt={`${nickname} 프로필`}
                fill
                sizes="52px"
                className="object-cover"
                unoptimized
              />
            )
            : <span aria-hidden="true">{initial}</span>}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-base font-black text-foreground">{nickname}</h1>
          <p className="mt-1 text-base text-muted-foreground">
            서로 응원하는 친구 {dashboard.friend_count}명 · 진행 중 목표 {activeGoalCount}개
          </p>
        </div>
      </section>

      <section aria-labelledby="my-goals-heading">
        <div className="social-card-heading mb-3">
          <h2 id="my-goals-heading">내 목표</h2>
          <span className="text-base!">{dashboard.goals.length}개</span>
        </div>
        {dashboard.goals.length === 0
          ? (
            <div className="social-empty">
              <h2>아직 등록한 목표가 없어요</h2>
              <Link className="social-primary-action" href="/onboarding">
                첫 목표 만들기
              </Link>
            </div>
          )
          : (
            <div className="social-stack" data-testid="my-goal-summary-list">
              {dashboard.goals.map((goal) => (
                <Link
                  key={goal.goal_id}
                  href={`/me/goal/${goal.goal_id}`}
                  className="social-card block no-underline transition-transform active:translate-y-px"
                  data-testid="my-goal-summary-card"
                >
                  <GoalCover
                    presetKey={goal.cover_preset_key}
                    title={goal.title}
                    size="banner"
                  />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="receiver-goal-title">{goal.title}</p>
                      <p className="mt-1 text-base text-muted-foreground">
                        {goal.status === "ACTIVE" ? "진행 중" : "달성 완료"} · {goal.due_date}
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-extrabold text-accent-foreground">
                      관리
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </section>

      <section aria-labelledby="achievements-heading" data-testid="achievement-section">
        <div className="social-card-heading mb-3">
          <h2 id="achievements-heading">업적</h2>
          <span className="text-base!">차곡차곡 쌓였어요</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {achievementCards.map(({ key, label, description, Icon }) => {
            const count = dashboard.achievements[key];
            return (
              <article
                key={key}
                className="social-card flex flex-col items-center px-2 text-center"
                data-testid={`achievement-${key}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon aria-hidden="true" size={20} />
                </span>
                <strong className="mt-2 text-lg font-black text-foreground">{count}</strong>
                <span className="mt-1 text-base font-extrabold text-foreground">{label}</span>
                <span className="mt-1 text-base leading-snug text-muted-foreground">{description}</span>
                {count > 0 && (
                  <span className="mt-2 inline-flex items-center gap-1 text-base font-bold text-accent-foreground">
                    <CheckCircle2 aria-hidden="true" size={14} /> 검증됨
                  </span>
                )}
              </article>
            );
          })}
        </div>
        <p className="social-muted mt-3 text-base!">
          목표와 응원 기록이 생길 때마다 자동으로 반영돼요.
        </p>
      </section>

      <section aria-labelledby="belonging-heading" data-testid="belonging-queue">
        <div className="social-card-heading mb-3">
          <h2 id="belonging-heading">아직 응원하지 않은 친구 목표</h2>
          <span className="text-base!">{dashboard.belonging_queue.length}개</span>
        </div>
        {dashboard.belonging_queue.length === 0
          ? (
            <div className="social-card">
              <p className="font-bold text-foreground">지금 확인할 친구 목표가 없어요.</p>
              <p className="social-description mt-1">새 목표가 생기면 여기에 조용히 모아둘게요.</p>
            </div>
          )
          : (
            <div className="social-stack">
              {dashboard.belonging_queue.map((item) => (
                <Link
                  key={item.goal_id}
                  href={`/friends/${item.friend_member_id}?goal=${item.goal_id}`}
                  className="social-card flex items-center gap-3 no-underline transition-transform active:translate-y-px"
                  data-testid="belonging-queue-item"
                >
                  <div className="min-w-0 flex-1">
                    <p className="social-eyebrow text-base!">{item.nickname ?? "친구"}의 해낼게</p>
                    <p className="mt-1 truncate font-extrabold text-foreground">{item.title}</p>
                  </div>
                  <span className="shrink-0 text-base font-extrabold text-accent-foreground">
                    응원하기
                  </span>
                </Link>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}
