import { redirect } from "next/navigation";
import Image from "next/image";
import { Flag, HandHeart, UsersRound } from "lucide-react";
import {
  BackHomeLink,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { asMySocialDashboard } from "@/lib/social/contracts";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-me-achievements-page";

export const dynamic = "force-dynamic";

type AchievementCounts = {
  completed_goal_count: number;
  received_cheer_count: number;
  connected_friend_count: number;
};

const MEDALS = [
  { title: "첫 목표 완료", detail: "완료 목표 1개", count: "completed_goal_count", target: 1 },
  { title: "두 목표 완료", detail: "완료 목표 2개", count: "completed_goal_count", target: 2 },
  { title: "세 친구 연결", detail: "친구 3명", count: "connected_friend_count", target: 3 },
  { title: "응원 열 개", detail: "확정 응원 10개", count: "received_cheer_count", target: 10 },
  { title: "세 목표 완료", detail: "완료 목표 3개", count: "completed_goal_count", target: 3 },
  { title: "응원 스무 개", detail: "확정 응원 20개", count: "received_cheer_count", target: 20 },
] as const satisfies ReadonlyArray<{
  title: string;
  detail: string;
  count: keyof AchievementCounts;
  target: number;
}>;

export default async function AchievementsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data, error } = await supabase.rpc("my_social_dashboard");
  const dashboard = asMySocialDashboard(data);
  if (error || !dashboard) throw new Error("업적을 불러오지 못했습니다.");

  const items = [
    ["달성한 목표", dashboard.achievements.completed_goal_count, "끝까지 마친 목표", Flag],
    ["받은 응원", dashboard.achievements.received_cheer_count, "친구가 보낸 확정 응원", HandHeart],
    ["친구", dashboard.achievements.connected_friend_count, "응원을 주고받은 사람", UsersRound],
  ] as const;
  const counts = dashboard.achievements;
  const collectedCount = MEDALS.filter(
    (medal) => counts[medal.count] >= medal.target,
  ).length;
  const nextMedal = MEDALS.find(
    (medal) => counts[medal.count] < medal.target,
  ) ?? null;

  return (
    <ReceiverPageShell testId="achievements-page" bottomSafe>
      <ReceiverTopBar variant="detail" />
      <div className="achievement-hero">
        <div className="achievement-visual">
          <Image
            src="/images/social-viral/achievement-higgsfield-v1.png"
            alt="초록 클로버 모양의 세라믹 업적 트로피"
            fill
            sizes="346px"
            priority
          />
        </div>
        <div className="achievement-hero-copy">
          <p>모은 업적 {collectedCount}개</p>
          <h1>
            {collectedCount > 0
              ? `${collectedCount}번째 메달을 받았어요`
              : "첫 메달을 향해 가고 있어요"}
          </h1>
        </div>
      </div>
      <div className="achievement-stats" data-testid="achievement-stats">
        {items.map(([label, count, description, Icon]) => (
          <article key={label}>
            <span className="achievement-icon"><Icon aria-hidden="true" /></span>
            <strong>{count}</strong>
            <div><h2>{label}</h2><p>{description}</p></div>
          </article>
        ))}
      </div>
      {nextMedal ? (
        <section className="achievement-next" data-testid="achievement-next-medal">
          <div>
            <span>다음 메달 <strong>{nextMedal.title}</strong></span>
            <span>{counts[nextMedal.count]} / {nextMedal.target}</span>
          </div>
          <progress max={nextMedal.target} value={counts[nextMedal.count]}>
            {counts[nextMedal.count]} / {nextMedal.target}
          </progress>
          <p>업적은 완료 목표, 받은 확정 응원, 친구 수로 계산해요.</p>
        </section>
      ) : (
        <p className="achievement-complete" role="status">현재 메달을 모두 모았어요.</p>
      )}
      <section className="achievement-shelf" data-testid="achievement-medal-shelf">
        <div className="achievement-shelf-heading">
          <h2>모은 메달</h2>
          <span>{collectedCount} / {MEDALS.length}</span>
        </div>
        <div className="achievement-medal-grid">
          {MEDALS.map((medal) => {
            const earned = counts[medal.count] >= medal.target;
            const remaining = Math.max(0, medal.target - counts[medal.count]);
            return (
              <article key={medal.title} className={earned ? undefined : "is-locked"}>
                <div className="achievement-medal-image">
                  <Image
                    src="/images/social-viral/achievement-higgsfield-v1.png"
                    alt=""
                    fill
                    sizes="96px"
                  />
                  {!earned && <span aria-label="잠김">🔒</span>}
                </div>
                <h3>{medal.title}</h3>
                <p>{earned ? medal.detail : `${remaining}개 더 필요`}</p>
              </article>
            );
          })}
        </div>
      </section>
      <p className="my-quiet-note">{PRODUCT_COPY.TEXT_003}</p>
      <BackHomeLink label={PRODUCT_COPY.TEXT_004} href="/my" />
    </ReceiverPageShell>
  );
}
