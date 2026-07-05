// components/goal/GoalCard.tsx — 목표 카드 (② 친구 페이지 핵심 컴포넌트)
// DESIGN.md: avatar·이름·"○○ 해낼게"·D-day·왜. 금액 절대 비노출.
// 와이어프레임: goal-page.html #default 상태.

import { DdayChip, StatusChip } from "./DdayChip";

export interface GoalCardProps {
  title: string;          // "나 편입 평점 4.0"
  reason: string | null;  // 왜(이유)
  dueDate: string;        // ISO date
  status: "ACTIVE" | "CLOSED" | "DELETED";
  /** 닉네임 (있으면 표시, 없으면 "익명") */
  nickname?: string | null;
}

// 아바타 자리 (프로필 이미지 없는 MVP: 이니셜 원형)
function AvatarPlaceholder({ nickname }: { nickname?: string | null }) {
  const initial = nickname?.[0] ?? "?";
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full text-base font-bold"
      style={{
        width: 56,
        height: 56,
        background: "linear-gradient(135deg, #cfe9da, #a9d8bf)",
        boxShadow: "0 0 0 3px #fff, 0 0 0 4px #E7F4EC",
        color: "#14613A", // --clover-ink
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function GoalCard({ title, reason, dueDate, status, nickname }: GoalCardProps) {
  const displayName = nickname ?? "익명";

  return (
    <article className="w-full" data-testid="goal-card">
      {/* 헤더: 아바타 + 이름 */}
      <div className="flex items-center gap-3 mb-4">
        <AvatarPlaceholder nickname={nickname} />
        <div>
          <p
            className="text-[15px] font-extrabold leading-snug"
            style={{ color: "#16140F" }} // --ink
          >
            {displayName}
          </p>
          <p
            className="text-[12.5px] mt-0.5"
            style={{ color: "#9C968B" }} // --faint
          >
            해낼게 목표
          </p>
        </div>
      </div>

      {/* 목표 제목 */}
      <h1
        className="font-black leading-tight mb-3"
        style={{
          fontSize: 27,
          letterSpacing: "-0.8px",
          lineHeight: 1.28,
          color: "#16140F",
        }}
        data-testid="goal-title"
      >
        {title}{" "}
        <span style={{ color: "#1F9E5A" }}>해낼게</span>
      </h1>

      {/* 칩 */}
      <div className="flex gap-1.5 mb-4">
        {status === "ACTIVE" && <DdayChip dueDate={dueDate} />}
        <StatusChip status={status} />
      </div>

      {/* 왜 */}
      {reason && (
        <div
          className="rounded-[15px] p-4 mb-5"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E8E4DC",
          }}
        >
          <p
            className="text-[11px] font-extrabold mb-1.5 tracking-wide"
            style={{ color: "#14613A" }} // --clover-ink
          >
            WHY
          </p>
          <p
            className="text-[14px] leading-relaxed"
            style={{ color: "#4a4640" }}
          >
            {reason}
          </p>
        </div>
      )}
    </article>
  );
}
