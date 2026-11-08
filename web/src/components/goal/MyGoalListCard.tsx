// components/goal/MyGoalListCard.tsx — /me 다중 목표 목록의 개별 목표 카드
// 설계 §4.5: 카드 최소 구성 = 제목 · 남은 날짜 · 응원 인원수 · 링크 복사.
// 대표 링크(사람 허브)는 만들지 않는다 — 카드마다 링크 복사만 둔다.
// 주의: components/goal/GoalCard.tsx(친구 공개 페이지용, avatar+이유)와 다른
// 컴포넌트다. 이름이 비슷해 혼동하기 쉬우니 새로 만들 때 그 파일을 덮어쓰지 말 것.

import Link from "next/link";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { MyLinkCard } from "@/components/goal/MyLinkCard";
import { CheerSummaryBar } from "@/components/social/CheerSummaryBar";
import { GoalCover } from "@/components/social/GoalCover";
import type { MySocialGoal } from "@/lib/social/contracts";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-goal-mygoallistcard";

export interface MyGoalListCardData {
  id: number;
  slug: string;
  title: string; // " 해낼게" suffix 제거된 순수 제목
  reason?: string | null;
  due_date: string;
  status: "ACTIVE" | "CLOSED" | "DELETED";
  cheerSummary: Pick<MySocialGoal, "cheer_count" | "supporter_avatars" | "recent_cheer">;
  coverPresetKey: string;
}

export function MyGoalListCard({ goal }: { goal: MyGoalListCardData }) {
  return (
    <div
      className="mb-3 rounded-md border border-border bg-card p-4"
      data-testid="my-goal-list-card"
      data-goal-id={goal.id}
    >
      <GoalCover presetKey={goal.coverPresetKey} title={goal.title} size="banner" />
      <div className="mb-2 mt-3 flex flex-wrap gap-1.5">
        <DdayChip dueDate={goal.due_date} />
        <StatusChip status={goal.status} />
      </div>
      <div className="mb-2">
        <p className="min-w-0 truncate text-[15px] font-extrabold text-foreground">
          {goal.title}
          <span className="ml-1 font-normal text-muted-foreground">{PRODUCT_COPY.TEXT_001}</span>
        </p>
        {goal.reason && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{goal.reason}</p>}
      </div>

      <div className="grid grid-cols-2 items-center gap-2">
        <Link
          href={`/me/goal/${goal.id}`}
          className="flex min-h-11 items-center justify-center rounded-sm border border-primary px-3 text-[12.5px] font-bold text-accent-foreground"
          data-testid="my-goal-list-card-manage-link"
        >{PRODUCT_COPY.TEXT_002}</Link>
        <MyLinkCard slug={goal.slug} variant="button" />
      </div>

      <Link
        href={`/me/goal/${goal.id}`}
        className="mt-3 block rounded-sm bg-accent p-3 text-accent-foreground"
        data-testid="my-goal-list-card-detail-link"
      >
        {goal.cheerSummary.cheer_count > 0
          ? <CheerSummaryBar goal={goal.cheerSummary} />
          : <p className="social-muted" data-testid="cheer-summary-empty">{PRODUCT_COPY.TEXT_004}</p>}
      </Link>
    </div>
  );
}
