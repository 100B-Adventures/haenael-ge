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
  collapsedContent,
  expandedContent,
  className = "",
  warnWhenDisabled = false,
  controlsId,
  toggleLabel = "내용",
  onExpandedChange,
}: {
  policy: CollapsePolicy;
  children?: (expanded: boolean) => React.ReactNode;
  collapsedContent?: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  warnWhenDisabled?: boolean;
  controlsId?: string;
  toggleLabel?: string;
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const enabled = shouldCollapse(policy);
  const [expanded, setExpanded] = useState(false);
  if (warnWhenDisabled && !enabled && process.env.NODE_ENV !== "production") {
    console.warn("Collapsible ignored: all three collapse conditions are required.");
  }
  const content = children
    ? children(enabled ? expanded : true)
    : enabled && !expanded
      ? collapsedContent
      : (expandedContent ?? collapsedContent);
  return (
    <div className={className} data-collapsible={enabled ? "enabled" : "disabled"}>
      {content}
      {enabled && (
        <button
          type="button"
          className={`collapse-chevron${expanded ? " is-expanded" : ""}`}
          aria-label={`${toggleLabel} ${expanded ? "접기" : "펼치기"}`}
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
