"use client";

// components/goal/ShareLinkCard.tsx — 내 링크 발급 후 공유 카드
// 슬라이스 #4: 목표 저장 완료 시 표시. 링크 복사 + 인스타 바이오 안내.
// DESIGN.md: Trustworthy + Discreet 톤. 과한 confetti 없음.

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-goal-sharelinkcard";

export interface ShareLinkCardProps {
  slug: string;
  goalTitle: string;
}

export function ShareLinkCard({ slug, goalTitle }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael.app");

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
        <p className="text-[15px] font-extrabold leading-snug mb-1 [color:var(--foreground)]! [letter-spacing:-0.3px]!">
          &ldquo;{goalTitle}{PRODUCT_COPY.TEXT_001}</p>
        <p className="text-[13px] leading-relaxed [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_002}</p>
      </div>

      {/* 웰컴 클로버 안내 — 목표 생성 시 시스템이 자동으로 웰컴 응원(클로버 3개)을 보냄 */}
      <div
        className="flex items-center gap-2.5 rounded-[12px] px-4 py-3 mb-4 [background-color:var(--accent)]!"
        data-testid="welcome-clover-banner"
      >
        <span className="text-[18px]" aria-hidden="true">
          🍀
        </span>
        <p className="text-[length:var(--text-input-label)]! leading-snug [color:var(--accent-foreground)]!">
          <strong>{PRODUCT_COPY.TEXT_003}</strong>
          <br />
          <span className="[color:var(--accent-foreground)]!">{PRODUCT_COPY.TEXT_004}</span>
        </p>
      </div>

      {/* 링크 카드 */}
      <div className="rounded-[14px] p-4 mb-4 [border:1px_solid_var(--border)]! [background-color:var(--card)]!">
        <p
          className="text-[13px] font-bold mb-3 break-all [color:var(--accent-foreground)]!"
          // --clover-ink
          data-testid="goal-link-url"
        >
          {fullUrl}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-2.5 rounded-[10px] text-[13px] font-bold transition-colors"
          style={{
            background: copied ? "var(--primary)" : "var(--accent)",
            color: copied ? "var(--card)" : "var(--accent-foreground)",
          }}
          data-testid="copy-link-button"
          aria-label="링크 복사"
        >
          {copied ? PRODUCT_COPY.TEXT_005 : PRODUCT_COPY.TEXT_006}
        </button>
      </div>

      {/* 인스타 바이오 안내 */}
      <div
        className="rounded-[12px] p-4 mb-5 [background-color:var(--muted)]!"
        // --warm
      >
        <p className="text-[12px] leading-relaxed [color:var(--muted-foreground)]!">
          <strong className="[color:var(--foreground)]!">{PRODUCT_COPY.TEXT_007}</strong>
          <br />{PRODUCT_COPY.TEXT_008}<br />{PRODUCT_COPY.TEXT_009}</p>
      </div>

      {/* 내 목표 바로가기 */}
      <Link
        href={`/g/${slug}`}
        className="block w-full py-3 rounded-[14px] text-center text-[14px] font-semibold transition-opacity active:opacity-75 [border:1px_solid_var(--border)]! [background-color:var(--card)]! [color:var(--muted-foreground)]!"
        data-testid="view-goal-link"
      >{PRODUCT_COPY.TEXT_010}</Link>
    </div>
  );
}
