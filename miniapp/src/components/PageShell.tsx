import type { ReactNode } from "react";

export interface TabItem {
  label: string;
  path: string;
  icon: string;
}

interface PageShellProps {
  children: ReactNode;
  activePath?: string;
  title?: string;
  subtitle?: string;
  withTabs?: boolean;
  onNavigate?: (path: string) => void;
}

const tabs: TabItem[] = [
  { label: "홈", path: "/", icon: "⌂" },
  { label: "친구", path: "/friends", icon: "♧" },
  { label: "초대", path: "/invite", icon: "+" },
  { label: "내 설정", path: "/my", icon: "●" },
];

export function PageShell({ children, activePath = "/", title, subtitle, withTabs = true, onNavigate }: PageShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="wordmark" type="button" onClick={() => onNavigate?.("/")} aria-label="해낼게 홈">
          해낼게 <span aria-hidden="true">♣</span>
        </button>
      </header>
      <main className={withTabs ? "page page--tabbed" : "page"}>
        {title ? (
          <div className="page-heading">
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </main>
      {withTabs ? (
        <nav className="bottom-tabs" aria-label="주요 메뉴">
          {tabs.map((tab) => {
            const active = tab.path === "/" ? activePath === "/" : activePath.startsWith(tab.path);
            return (
              <button
                className={active ? "bottom-tab bottom-tab--active" : "bottom-tab"}
                type="button"
                key={tab.path}
                onClick={() => onNavigate?.(tab.path)}
                aria-current={active ? "page" : undefined}
              >
                <span className="bottom-tab__icon" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
