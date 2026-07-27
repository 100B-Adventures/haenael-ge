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
      className="rounded-[11px] px-3 py-2.5 mb-3 flex items-center justify-between"
      style={{ background: "#F4EFE6", border: "1px solid #E8E4DC" }}
      data-testid="owner-bar"
    >
      <p style={{ fontSize: 10.5, color: "#7a7363", lineHeight: 1.4 }}>
        <b style={{ color: "#14613A", fontSize: 11 }}>내 목표예요</b>
        {" · "}
        <span data-testid="owner-bar-status">
          {newCount === null
            ? "확인 중…"
            : isEmpty
              ? "받은 응원을 여기서 관리해요"
              : `새 응원 ${newCount}개`}
        </span>
      </p>
      <Link
        href="/me"
        className="text-white font-bold rounded-[8px] text-center"
        style={{
          fontSize: 10.5,
          background: "#1B8A4F",
          padding: "6px 10px",
          flex: "0 0 auto",
        }}
        data-testid="owner-bar-cta"
      >
        내 해낼게 관리
      </Link>
    </div>
  );
}
