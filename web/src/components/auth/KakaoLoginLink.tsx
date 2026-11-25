"use client";

import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { buildKakaoStartUrl, startKakaoLogin } from "@/lib/auth/kakao-navigation";

interface KakaoLoginLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  redirectPath: string;
  children: ReactNode;
  onBeforeNavigate?: () => void;
  resolveRedirectPath?: () => string;
}

export function KakaoLoginLink({
  redirectPath,
  children,
  onBeforeNavigate,
  resolveRedirectPath,
  ...anchorProps
}: KakaoLoginLinkProps) {
  const href = buildKakaoStartUrl(redirectPath);
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    onBeforeNavigate?.();
    if (event.defaultPrevented) return;
    event.preventDefault();
    startKakaoLogin(buildKakaoStartUrl(resolveRedirectPath?.() ?? redirectPath));
  };

  return (
    <a {...anchorProps} href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
