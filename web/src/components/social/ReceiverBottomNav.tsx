"use client";

import Link from "next/link";
import { Home, UserPlus, UserRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GuestTeaserSheet } from "./GuestTeaserSheet";

const tabs = [
  { href: "/me", label: "홈", Icon: Home },
  { href: "/friends", label: "친구", Icon: Users },
  { href: "/invite", label: "초대", Icon: UserPlus },
  { href: "/my", label: "마이", Icon: UserRound },
] as const;

export function shouldShowBottomNav(pathname: string) {
  const usesReceiverShell = pathname === "/" ||
    pathname.startsWith("/g/") ||
    pathname === "/me" || pathname.startsWith("/me/") ||
    pathname === "/my" || pathname.startsWith("/my/") ||
    pathname === "/friends" || pathname.startsWith("/friends/") ||
    pathname === "/invite" || pathname.startsWith("/invite/") ||
    pathname === "/wordmap" || pathname.startsWith("/wordmap/") ||
    pathname === "/cashout" || pathname.startsWith("/cashout/") ||
    pathname === "/onboarding";

  if (!usesReceiverShell) return false;
  return !(
    pathname === "/cashout" ||
    pathname.startsWith("/cashout/") ||
    pathname.startsWith("/invite/") ||
    pathname === "/payment/success" ||
    pathname === "/payment/fail" ||
    pathname === "/onboarding"
  );
}

export function ReceiverBottomNav({ locked = false }: { locked?: boolean }) {
  const pathname = usePathname();
  return <ReceiverBottomNavView locked={locked} pathname={pathname ?? ""} />;
}

export function ReceiverBottomNavView({
  locked = false,
  pathname,
}: {
  locked?: boolean;
  pathname: string;
}) {
  const [teaserOpen, setTeaserOpen] = useState(false);
  if (!shouldShowBottomNav(pathname)) return null;

  return (
    <>
      <nav className="receiver-tabbar" aria-label="주요 메뉴" data-testid="receiver-bottom-nav">
      {tabs.map(({ href, label, Icon }, index) => {
        const active = label === "홈"
          ? pathname === "/" || pathname === "/me" || pathname.startsWith("/me/")
          : pathname === href || pathname.startsWith(`${href}/`);
        return locked && index > 0 ? (
          <button
            type="button"
            key={`${label}-${index}`}
            className="transition-transform active:translate-y-px"
            onClick={() => setTeaserOpen(true)}
          >
            <span className="receiver-tabbar-icon"><Icon aria-hidden="true" /></span>
            <span>{label}</span>
          </button>
        ) : (
          <Link
            key={`${label}-${index}`}
            href={locked ? "/" : href}
            className={`${active ? "is-active " : ""}transition-transform active:translate-y-px`}
            aria-current={active ? "page" : undefined}
          >
            <span className="receiver-tabbar-icon">
              <Icon aria-hidden="true" />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
      </nav>
      <GuestTeaserSheet open={teaserOpen} onClose={() => setTeaserOpen(false)} />
    </>
  );
}
