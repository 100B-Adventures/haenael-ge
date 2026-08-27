"use client";

// LogoutButton.tsx — 로그아웃 진입 UI
// 회장 지적 갭 보완: MVP에 로그아웃 UI·경로가 없었음(2026-07-18).
//
// /auth/logout 을 POST 로 호출 → 세션 쿠키 제거 후 서버가 "/" 로 리다이렉트한
// 응답을 그대로 따라간다(fetch redirect: "follow" 이후 location으로 이동).
// DESIGN.md 톤 준수: 과하지 않게 — 텍스트 버튼, 헤더 아이콘 톤(--muted)과 통일.

import { useState } from "react";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        redirect: "follow",
      });
      // fetch 는 redirect: follow 라도 최종 URL로 재요청하지 않으므로
      // 브라우저 주소를 직접 이동시켜 랜딩("/")으로 보낸다.
      window.location.href = response.redirected ? response.url : "/";
    } catch (err) {
      console.error("[LogoutButton] logout failed:", err);
      // 실패해도 랜딩으로 보내 dead-end 방지 (세션은 서버 만료/재확인으로 정리됨)
      window.location.href = "/";
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="font-semibold disabled:opacity-50 [font-size:11px]! [color:var(--faint)]!"
      data-testid="logout-button"
      aria-label="로그아웃"
    >
      {pending ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
