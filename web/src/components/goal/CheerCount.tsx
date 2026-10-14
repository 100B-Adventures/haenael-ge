// components/goal/CheerCount.tsx — 응원 수 표시
// DESIGN.md §6 금액 3층 (a): 친구/공개 화면 = "N명"만. 금액·개수 비노출.
// 와이어프레임: goal-page.html .proof 섹션.

export interface CheerCountProps {
  count: number;
  variant?: "default" | "public";
}

// 아바타 스택 (최대 4개 원형 원소)
function AvatarStack({ count }: { count: number }) {
  const visibleCount = Math.min(count, 4);
  if (visibleCount === 0) return null;

  return (
    <div className="flex" aria-hidden="true">
      {Array.from({ length: visibleCount }).map((_, i) => (
        <span
          key={i}
          className="rounded-full border-2 [width:26px]! [height:26px]! [border-color:var(--background)]! [display:inline-block]!"
          style={{
            marginLeft: i === 0 ? 0 : -8,
            background: i % 3 === 1 ? "#E4E0D8" : "#cfe0d6",
          }}
        />
      ))}
    </div>
  );
}

export function CheerCount({ count, variant = "default" }: CheerCountProps) {
  if (count === 0) return null;

  if (variant === "public") {
    return (
      <p className="public-cheer-count" data-testid="cheer-count">
        지금까지 <strong>{count.toLocaleString("ko-KR")}</strong>명이 응원했어요
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2.5 mb-3" data-testid="cheer-count">
      <AvatarStack count={count} />
      <p
        className="font-semibold [font-size:var(--text-wordmark)]! [color:var(--muted-foreground)]!"
        // --muted
      >
        <strong className="[color:var(--foreground)]! [font-weight:700]!">
          {count.toLocaleString("ko-KR")}명
        </strong>
        이 조용히 응원했어요
      </p>
    </div>
  );
}
