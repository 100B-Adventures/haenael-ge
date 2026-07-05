// components/goal/CheerCount.tsx — 응원 수 표시
// DESIGN.md §6 금액 3층 (a): 친구/공개 화면 = "N명"만. 금액·개수 비노출.
// 와이어프레임: goal-page.html .proof 섹션.

export interface CheerCountProps {
  count: number;
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
          className="rounded-full border-2"
          style={{
            width: 26,
            height: 26,
            marginLeft: i === 0 ? 0 : -8,
            background: i % 3 === 1 ? "#E4E0D8" : "#cfe0d6", // 일부 익명
            borderColor: "#FBFAF7", // --bg
            display: "inline-block",
          }}
        />
      ))}
    </div>
  );
}

export function CheerCount({ count }: CheerCountProps) {
  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-2.5 mb-3"
      data-testid="cheer-count"
    >
      <AvatarStack count={count} />
      <p
        className="text-[12.5px] font-semibold"
        style={{ color: "#6F6A60" }} // --muted
      >
        <strong style={{ color: "#16140F", fontWeight: 700 }}>
          {count.toLocaleString("ko-KR")}명
        </strong>
        이 조용히 응원했어요
      </p>
    </div>
  );
}
