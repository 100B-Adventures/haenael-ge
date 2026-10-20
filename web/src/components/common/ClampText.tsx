"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function ClampText({
  children,
  className = "",
  title,
  controlsId,
  toggleLabel = "내용",
}: {
  children: string;
  className?: string;
  title?: string;
  controlsId?: string;
  toggleLabel?: string;
}) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  // 측정 전에는 먼저 clamp를 적용한다. 전체 높이로 렌더한 뒤 overflow를
  // 측정하면 scrollHeight와 clientHeight가 같아지는 자기참조 데드락이 생긴다.
  const generatedId = useId();
  const contentId = controlsId ?? `clamp-${generatedId.replaceAll(":", "")}`;
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const measure = () => setOverflows(node.scrollHeight > node.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div data-collapsible={overflows ? "enabled" : "disabled"}>
      <p id={contentId} ref={measureRef} title={title} className={`${className}${expanded ? "" : " clamp-text"}`.trim()}>
        {children}
      </p>
      {overflows && (
        <button
          type="button"
          className={`collapse-chevron${expanded ? " is-expanded" : ""}`}
          aria-label={`${toggleLabel} ${expanded ? "접기" : "펼치기"}`}
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
