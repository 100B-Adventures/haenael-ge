import type { GoalSummary } from "../domain";

interface GoalCardProps {
  goal: GoalSummary;
  onOpen: (goal: GoalSummary) => void;
}

export function GoalCard({ goal, onOpen }: GoalCardProps) {
  return (
    <article className={`goal-card cover-${goal.coverPreset}`} data-testid="friend-goal-card">
      <button className="goal-card__button" type="button" onClick={() => onOpen(goal)}>
        <div className="goal-card__cover">
          {goal.coverUrl ? <img src={goal.coverUrl} alt="" /> : <span aria-hidden="true">♣</span>}
        </div>
        <div className="goal-card__body">
          <div className="goal-card__owner">{goal.ownerName}의 목표</div>
          <h2>{goal.title}</h2>
          <p>{goal.dueLabel}</p>
          <div className="goal-card__meta">
            <span>♣ {goal.cheerCount}명이 함께해요</span>
            <span aria-hidden="true">›</span>
          </div>
        </div>
      </button>
    </article>
  );
}

interface GoalListProps {
  goals: GoalSummary[];
  loading?: boolean;
  error?: string | null;
  onOpen: (goal: GoalSummary) => void;
}

export function GoalList({ goals, loading = false, error = null, onOpen }: GoalListProps) {
  if (loading) return <div className="state-card" role="status">친구들의 목표를 불러오는 중이에요.</div>;
  if (error) return <div className="state-card state-card--error" role="alert">{error}</div>;
  if (goals.length === 0) return <div className="state-card">친구를 초대하면 서로의 목표를 볼 수 있어요.</div>;
  return <div className="goal-list">{goals.map((goal) => <GoalCard key={goal.goalId} goal={goal} onOpen={onOpen} />)}</div>;
}
