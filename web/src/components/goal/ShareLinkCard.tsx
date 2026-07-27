"use client";

// components/goal/ShareLinkCard.tsx — 내 링크 발급 후 공유 카드
// 슬라이스 #4: 목표 저장 완료 시 표시. 링크 복사 + 인스타 바이오 안내.
// DESIGN.md: Trustworthy + Discreet 톤. 과한 confetti 없음.

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export interface ShareLinkCardProps {
  slug: string;
  goalTitle: string;
}

export function ShareLinkCard({ slug, goalTitle }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael.app";

  const fullUrl = `${appUrl}/g/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      trackEvent("share_link_copied", { source: "share_link_card" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 미지원 fallback
      const el = document.createElement("textarea");
      el.value = fullUrl;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      trackEvent("share_link_copied", { source: "share_link_card" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full" data-testid="share-link-card">
      {/* 제목 */}
      <div className="mb-5">
        <p
          className="text-[15px] font-extrabold leading-snug mb-1"
          style={{ color: "#16140F", letterSpacing: "-0.3px" }}
        >
          &ldquo;{goalTitle} 해낼게&rdquo; 준비됐어요 🍀
        </p>
        <p className="text-[13px] leading-relaxed" style={{ color: "#6F6A60" }}>
          이제 이 링크를 인스타 바이오에 걸면 끝이에요.
        </p>
      </div>

      {/* 웰컴 클로버 안내 — 목표 생성 시 시스템이 자동으로 웰컴 응원(클로버 3개)을 보냄 */}
      <div
        className="flex items-center gap-2.5 rounded-[12px] px-4 py-3 mb-4"
        style={{ background: "#E7F4EC" }}
        data-testid="welcome-clover-banner"
      >
        <span className="text-[18px]" aria-hidden="true">🍀</span>
        <p className="text-[12.5px] leading-snug" style={{ color: "#14613A" }}>
          <strong>해낼게 팀이 먼저 웰컴 클로버 3개를 보냈어요.</strong>
          <br />
          <span style={{ color: "#3d7a5a" }}>다음 응원은 곧 친구들 차례예요.</span>
        </p>
      </div>

      {/* 링크 카드 */}
      <div
        className="rounded-[14px] p-4 mb-4"
        style={{ border: "1px solid #E8E4DC", background: "#FFFFFF" }}
      >
        <p
          className="text-[13px] font-bold mb-3 break-all"
          style={{ color: "#14613A" }} // --clover-ink
          data-testid="goal-link-url"
        >
          {fullUrl}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-2.5 rounded-[10px] text-[13px] font-bold transition-colors"
          style={{
            background: copied ? "#1B8A4F" : "#E7F4EC",
            color: copied ? "#ffffff" : "#14613A",
          }}
          data-testid="copy-link-button"
          aria-label="링크 복사"
        >
          {copied ? "복사됐어요 ✓" : "링크 복사"}
        </button>
      </div>

      {/* 인스타 바이오 안내 */}
      <div
        className="rounded-[12px] p-4 mb-5"
        style={{ background: "#F4EFE6" }} // --warm
      >
        <p className="text-[12px] leading-relaxed" style={{ color: "#6F6A60" }}>
          <strong style={{ color: "#16140F" }}>다음 한 걸음</strong>
          <br />
          인스타 프로필 편집 → 웹사이트 칸에 붙여넣기.
          <br />
          친구가 눈팅하다 조용히 밀어줄 거예요.
        </p>
      </div>

      {/* 내 목표 바로가기 */}
      <Link
        href={`/g/${slug}`}
        className="block w-full py-3 rounded-[14px] text-center text-[14px] font-semibold transition-opacity active:opacity-75"
        style={{
          border: "1px solid #E8E4DC",
          background: "#FFFFFF",
          color: "#6F6A60",
        }}
        data-testid="view-goal-link"
      >
        내 목표 페이지 확인하기 →
      </Link>
    </div>
  );
}
