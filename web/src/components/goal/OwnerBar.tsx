"use client";

// components/goal/OwnerBar.tsx — /g/[slug] 본인 열람 시 상단 owner bar.
// user-flow.md §1.3 (b) / DESIGN.md v1.7.0. 프로토: WIREFRAMES/haenael-receiver-manage-v1-fable.html .ownerbar
//
// ★ 렌더 조건은 page.tsx(서버)가 이미 소유자 판정 후에만 이 컴포넌트를 마운트한다.
//   (RLS goal_select_own 스코프로 조회한 결과가 있을 때만 렌더 — 타인/비로그인엔 이 컴포넌트 자체가 트리에 없음.)
// "새 응원 N개"는 서버가 넘긴 cheer.created_at 배열을 localStorage 마지막 /me 방문시각과
// 클라이언트에서 비교해 계산한다(서버 스키마 변경 없음, HomeSeenTracker가 /me 마운트 시 시각 갱신).

import Link from "next/link";
import { useEffect, useState } from "react";
import { HOME_LAST_SEEN_KEY } from "@/lib/home-seen";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-goal-ownerbar";

export function OwnerBar({ cheerCreatedAts }: { cheerCreatedAts: string[] }) {
  const [newCount, setNewCount] = useState<number | null>(null);

  useEffect(() => {
    let lastSeen = 0;
    try {
      const raw = window.localStorage.getItem(HOME_LAST_SEEN_KEY);
      lastSeen = raw ? Number(raw) : 0;
    } catch {
      lastSeen = 0;
    }
    const count = cheerCreatedAts.filter(
      (iso) => new Date(iso).getTime() > lastSeen,
    ).length;
    setNewCount(count);
  }, [cheerCreatedAts]);

  const isEmpty = newCount === 0;

  return (
    <div
      className="rounded-[11px] px-3 py-2.5 mb-3 flex items-center justify-between [background-color:var(--muted)]! [border:1px_solid_var(--border)]!"
      data-testid="owner-bar"
    >
      <p className="[font-size:var(--text-meta-micro)]! text-muted-foreground [line-height:1.4]!">
        <b className="[color:var(--accent-foreground)]! [font-size:var(--text-meta-micro)]!">{PRODUCT_COPY.TEXT_001}</b>
        {" · "}
        <span data-testid="owner-bar-status">
          {newCount === null
            ? PRODUCT_COPY.TEXT_002
            : isEmpty
              ? PRODUCT_COPY.TEXT_003
              : `새 응원 ${newCount}개`}
        </span>
      </p>
      <Link
        href="/me"
        className="text-white font-bold rounded-[8px] text-center [font-size:var(--text-meta-micro)]! [background-color:var(--primary)]! p-[6px_10px]! [flex:0_0_auto]! [min-width:var(--tap-min-size)]! [min-height:var(--tap-min-size)]! [display:inline-flex]! [align-items:center]! [justify-content:center]!"
        data-testid="owner-bar-cta"
      >{PRODUCT_COPY.TEXT_004}</Link>
    </div>
  );
}
