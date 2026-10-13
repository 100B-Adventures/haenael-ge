"use client";

import Link from "next/link";
import { Home, Link2, LockKeyhole, UserRound, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/me", label: "홈", Icon: Home },
  { href: "/friends", label: "친구", Icon: Users },
  { href: "/invite", label: "초대", Icon: Link2 },
  { href: "/me", label: "마이", Icon: UserRound },
] as const;

export function ReceiverBottomNav({ locked = false }: { locked?: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      className="receiver-tabbar"
      aria-label="주요 메뉴"
      data-testid="receiver-bottom-nav"
    >
      {tabs.map(({ href, label, Icon }, index) => {
        const active = label === "홈"
          ? pathname === "/me"
          : label === "마이"
          ? false
          : pathname.startsWith(href);
        return (
          <Link
            key={`${label}-${index}`}
            href={locked ? "/" : href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span className="receiver-tabbar-icon">
              <Icon aria-hidden="true" />
            </span>
            <span>{label}</span>
            {locked && index > 0 && (
              <span className="receiver-tabbar-lock">
                <LockKeyhole aria-hidden="true" />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
