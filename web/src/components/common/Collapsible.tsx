"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type CollapsePolicy = {
  auxiliary: boolean;
  exceedsLimit: boolean;
  hasCollapsedContext: boolean;
};

export function shouldCollapse(policy: CollapsePolicy) {
  return policy.auxiliary && policy.exceedsLimit && policy.hasCollapsedContext;
}

export function Collapsible({
  policy,
  children,
  className = "",
  warnWhenDisabled = false,
  controlsId,
  onExpandedChange,
}: {
  policy: CollapsePolicy;
  children: (expanded: boolean) => React.ReactNode;
  className?: string;
  warnWhenDisabled?: boolean;
  controlsId?: string;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const enabled = shouldCollapse(policy);
  const [expanded, setExpanded] = useState(false);
  if (warnWhenDisabled && !enabled && process.env.NODE_ENV !== "production") {
    console.warn("Collapsible ignored: all three collapse conditions are required.");
  }
  return (
    <div className={className} data-collapsible={enabled ? "enabled" : "disabled"}>
      {children(enabled ? expanded : true)}
      {enabled && (
        <button
          type="button"
          className={`collapse-chevron${expanded ? " is-expanded" : ""}`}
          aria-label={expanded ? "내용 접기" : "내용 펼치기"}
          aria-expanded={expanded}
          aria-controls={controlsId}
          onClick={() =>
            setExpanded((value) => {
              const next = !value;
              onExpandedChange?.(next);
              return next;
            })}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
