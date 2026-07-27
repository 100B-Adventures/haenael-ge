"use client";

// components/goal/MyLinkCard.tsx — /me 재방문 시 "내 응원 링크 공유/복사" 재접근.
// user-flow.md §1.3 갭3(홈 링크 재접근, 2026-07-20): 온보딩 직후 ShareLinkCard 화면이
// 아니라도, 홈 재방문 언제든 링크를 복사할 수 있어야 한다. ShareLinkCard와 동일한
// 클립보드 복사 로직(fallback 포함)을 재사용하되, 웰컴배너 등 1회성 온보딩 UI는 제외.

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export interface MyLinkCardProps {
  slug: string;
}

export function MyLinkCard({ slug }: MyLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael.app";

  const fullUrl = `${appUrl}/g/${slug}`;

  const showCopySuccess = () => {
    setCopyFailed(false);
    setCopied(true);
    trackEvent("share_link_copied", { source: "home_my_link_card" });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyWithTextareaFallback = () => {
    const el = document.createElement("textarea");
    el.value = fullUrl;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(el);
    }
  };

  const handleCopy = async () => {
    setCopyFailed(false);

    try {
      await navigator.clipboard.writeText(fullUrl);
      showCopySuccess();
    } catch {
      try {
        if (!copyWithTextareaFallback()) {
          throw new Error("copy_command_failed");
        }
        showCopySuccess();
      } catch {
        setCopied(false);
        setCopyFailed(true);
      }
    }
  };

  const copyLabel = copied
    ? "내 응원 링크 복사됨"
    : copyFailed
      ? "내 응원 링크 복사 다시 시도"
      : "내 응원 링크 복사";

  return (
    <div
      className="rounded-[14px] p-4 mb-4"
      style={{ background: "#fff", border: "1px solid #E8E4DC" }}
      data-testid="my-link-card"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-1" style={{ fontSize: 10.5, color: "#9C968B" }}>
            내 응원 링크
          </p>
          <p
            className="font-bold truncate select-text"
            style={{ fontSize: 12.5, color: "#14613A" }}
            data-testid="my-link-url"
          >
            {fullUrl}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B8A4F] focus-visible:ring-offset-2"
          style={{
            background: copied
              ? "#1B8A4F"
              : copyFailed
                ? "#FBEAE7"
                : "#E7F4EC",
            color: copied
              ? "#ffffff"
              : copyFailed
                ? "#D9483B"
                : "#14613A",
          }}
          data-testid="my-link-copy-button"
          aria-label={copyLabel}
        >
          {copied ? (
            <Check size={18} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Copy size={18} strokeWidth={1.8} aria-hidden="true" />
          )}
          <span className="sr-only">{copyLabel}</span>
        </button>
      </div>
      {copyFailed && (
        <p
          className="mt-2"
          style={{ fontSize: 11, color: "#D9483B" }}
          role="status"
          data-testid="my-link-copy-error"
        >
          복사하지 못했어요. 링크를 길게 눌러 복사해 주세요.
        </p>
      )}
    </div>
  );
}
