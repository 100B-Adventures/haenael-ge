"use client";

import { useState } from "react";
import { setGoalVisibilityAction } from "@/app/(receiver)/social-actions";

const options = [
  {
    value: "PUBLIC",
    label: "전체 공개",
    help: "공유 링크를 가진 누구나 볼 수 있어요.",
  },
  { value: "FRIENDS", label: "친구 공개", help: "친구만 볼 수 있어요." },
  {
    value: "PRIVATE",
    label: "비공개",
    help: "나만 볼 수 있고 기존 미사용 초대는 취소돼요.",
  },
] as const;

export function GoalVisibilityControl(
  { goalId, initialVisibility }: { goalId: number; initialVisibility: string },
) {
  const [value, setValue] = useState(initialVisibility);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function change(next: string) {
    if (pending || next === value) return;
    setPending(true);
    setError(false);
    const result = await setGoalVisibilityAction(goalId, next);
    setPending(false);
    if (!result.ok) return setError(true);
    setValue(next);
  }
  return (
    <section className="social-card" aria-labelledby="goal-visibility-title">
      <div className="social-card-heading">
        <div>
          <p className="social-eyebrow">공개범위</p>
          <h2 id="goal-visibility-title">누가 볼 수 있나요?</h2>
        </div>
        <span>{pending ? "저장 중" : "저장됨"}</span>
      </div>
      <div className="social-segmented">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "is-selected" : undefined}
            disabled={pending}
            onClick={() => change(option.value)}
            aria-pressed={value === option.value}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="social-muted">
        {options.find((option) =>
          option.value === value
        )?.help}
      </p>
      {error && (
        <p role="alert" className="social-error">
          공개범위를 저장하지 못했어요.
        </p>
      )}
    </section>
  );
}
