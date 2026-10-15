import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationBadge } from "@/components/common/NotificationBadge";
import {
  ReceiverBottomNav,
  ReceiverBottomNavView,
} from "@/components/social/ReceiverBottomNav";

export function ReceiverAppShell({
  children,
  locked = false,
  currentPath,
}: {
  children: React.ReactNode;
  locked?: boolean;
  currentPath?: string;
}) {
  return (
    <div className="receiver-app-shell min-h-svh bg-background pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom,0px))]">
      {children}
      {currentPath === undefined
        ? <ReceiverBottomNav locked={locked} />
        : <ReceiverBottomNavView locked={locked} pathname={currentPath} />}
    </div>
  );
}

type ReceiverPageShellProps = {
  children: React.ReactNode;
  testId: string;
  bottomSafe?: boolean;
  className?: string;
};

export function ReceiverPageShell({
  children,
  testId,
  bottomSafe = false,
  className = "",
}: ReceiverPageShellProps) {
  return (
    <div
      className={`receiver-page-frame${bottomSafe ? " receiver-page-frame--bottom-safe" : ""} ${className}`.trim()}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

export function ReceiverBrandMark() {
  return (
    <p className="receiver-wordmark">
      해낼게<span className="text-[var(--clover-bright)]">.</span>
    </p>
  );
}

type ReceiverTopBarProps = {
  variant: "home" | "detail";
};

export function ReceiverTopBar({ variant }: ReceiverTopBarProps) {
  if (variant === "detail") {
    return (
      <header data-testid="receiver-top-bar-detail">
        <ReceiverBrandMark />
      </header>
    );
  }

  return (
    <header className="mb-5 flex items-center justify-between" data-testid="receiver-top-bar-home">
      <ReceiverBrandMark />
      <div className="flex items-center gap-3">
        <NotificationBadge />
        <LogoutButton />
      </div>
    </header>
  );
}

export function BackHomeLink({
  label = "홈으로 돌아가기",
  href = "/me",
}: {
  label?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="mt-6 block text-center text-xs font-semibold text-[var(--faint)]"
    >
      {label}
    </Link>
  );
}
