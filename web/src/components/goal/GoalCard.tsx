"use client";

// components/goal/GoalCard.tsx — 목표 카드 (② 친구 페이지 핵심 컴포넌트)
// DESIGN.md: avatar·이름·"○○ 해낼게"·D-day·왜. 금액 절대 비노출.
// 와이어프레임: goal-page.html #default 상태.

import { useState } from "react";
import { Clover } from "lucide-react";
import { DdayChip, StatusChip } from "./DdayChip";

export interface GoalCardProps {
  title: string; // "나 편입 평점 4.0"
  reason: string | null; // 왜(이유)
  dueDate: string; // ISO date
  status: "ACTIVE" | "CLOSED" | "DELETED";
  /** 목표 소유자 닉네임 */
  nickname?: string | null;
  /** 목표 소유자 프로필 이미지. 공개 조회 계약이 연결되기 전에는 클로버/이니셜 폴백. */
  profileImageUrl?: string | null;
  /** 승인 공개목표 시안의 압축 카드 표현. */
  variant?: "default" | "public";
}

function OwnerAvatar({
  nickname,
  profileImageUrl,
}: {
  nickname: string | null;
  profileImageUrl?: string | null;
}) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const showImage = Boolean(
    profileImageUrl && failedImageUrl !== profileImageUrl,
  );
  const initial = nickname ? Array.from(nickname)[0] : null;

  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full text-base font-bold [width:56px]! [height:56px]! [background-color:var(--accent)]! [box-shadow:0_0_0_3px_var(--card),_0_0_0_4px_var(--accent)]! [color:var(--accent-foreground)]! [overflow:hidden]!"
      aria-hidden="true"
      data-testid="goal-owner-avatar"
    >
      {showImage ? (
        <img
          src={profileImageUrl ?? undefined}
          alt=""
          width={56}
          height={56}
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(profileImageUrl ?? null)}
          data-testid="goal-owner-avatar-image"
        />
      ) : initial ? (
        initial
      ) : (
        <Clover
          size={24}
          strokeWidth={1.8}
          data-testid="goal-owner-avatar-clover"
        />
      )}
    </div>
  );
}

export function GoalCard({
  title,
  reason,
  dueDate,
  status,
  nickname,
  profileImageUrl,
  variant = "default",
}: GoalCardProps) {
  const normalizedNickname = nickname?.trim() || null;
  const displayName = normalizedNickname ?? "해낼게 사용자";
  const trimmedTitle = title.trim();
  const needsHaenaelSuffix = !/게[.!?]?$/u.test(trimmedTitle);
  const [reasonExpanded, setReasonExpanded] = useState(false);

  if (variant === "public") {
    return (
      <article className="public-goal-card" data-testid="goal-card">
        <div className="public-goal-chips">
          {status === "ACTIVE" && <DdayChip dueDate={dueDate} tone="warm" />}
          <StatusChip status={status} tone="public" />
        </div>
        <h1 data-testid="goal-title">
          {trimmedTitle}{needsHaenaelSuffix ? " 해낼게" : ""}
        </h1>
        {reason && <p data-testid="goal-reason">{reason}</p>}
      </article>
    );
  }

  return (
    <article className="w-full" data-testid="goal-card">
      {/* 헤더: 아바타 + 이름 */}
      <div className="flex items-center gap-3 mb-4">
        <OwnerAvatar
          nickname={normalizedNickname}
          profileImageUrl={profileImageUrl}
        />
        <div>
          <p
            className="text-[15px] font-extrabold leading-snug [color:var(--foreground)]!"
            // --ink
          >
            {displayName}
          </p>
          <p
            className="mt-0.5 [font-size:var(--text-wordmark)]! [color:var(--faint)]!"
            // --faint
          >
            해낼게 목표
          </p>
        </div>
      </div>

      {/* 목표 제목 */}
      {/* 긴 제목이 카드를 밀어내 아래 칩과 왜 블록을 화면 밖으로 보내던 것을 막는다.
          DESIGN.md §6.1 이 제목 2줄을 요구한다. */}
      <h1
        className="font-black leading-tight mb-3 line-clamp-2 [font-size:27px]! [letter-spacing:-0.8px]! [line-height:1.28]! [color:var(--foreground)]!"
        data-testid="goal-title"
      >
        {trimmedTitle}{needsHaenaelSuffix && (
          <> <span className="[color:var(--clover-bright)]!">해낼게</span></>
        )}
      </h1>

      {/* 칩 */}
      <div className="flex gap-1.5 mb-4">
        {status === "ACTIVE" && <DdayChip dueDate={dueDate} />}
        <StatusChip status={status} />
      </div>

      {/* 왜 */}
      {reason && (
        <div className="rounded-[15px] p-4 mb-5 [background-color:var(--card)]! [border:1px_solid_var(--border)]!">
          <p
            className="font-extrabold mb-1.5 tracking-wide [font-size:var(--text-wordmark)]! [color:var(--accent-foreground)]!"
            // --clover-ink
          >
            WHY
          </p>
          {/* 왜는 3줄까지 보이고 나머지는 펼쳐 본다. 길다고 잘라 버리면 목표를
              세운 이유가 사라지고, 다 펼쳐 두면 응원 버튼이 화면 밖으로 밀린다.
              design-token-lint-allow: 기존 본문 색상 유지(토큰화는 별도 작업). */}
          <p
            className={`text-[14px] leading-relaxed [color:#4a4640]! ${reasonExpanded ? "" : "line-clamp-3"}`}
            data-testid="goal-reason"
          >
            {reason}
          </p>
          <button
            type="button"
            className="mt-2 inline-flex min-h-[var(--tap-min-size)] min-w-[var(--tap-min-size)] items-center justify-center font-bold transition-opacity active:opacity-70 [font-size:var(--text-wordmark)]! [color:var(--accent-foreground)]!"
            aria-expanded={reasonExpanded}
            data-testid="goal-reason-toggle"
            onClick={() => setReasonExpanded((prev) => !prev)}
          >
            {reasonExpanded ? "접기" : "더 보기"}
          </button>
        </div>
      )}
    </article>
  );
}
