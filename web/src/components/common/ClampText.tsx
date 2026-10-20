"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Collapsible } from "./Collapsible";

export function ClampText({ children, className = "", title }: { children: string; className?: string; title?: string }) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  // 측정 전에는 먼저 clamp를 적용한다. 전체 높이로 렌더한 뒤 overflow를
  // 측정하면 scrollHeight와 clientHeight가 같아지는 자기참조 데드락이 생긴다.
  const [overflows, setOverflows] = useState<boolean | null>(null);
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
    <Collapsible policy={{ auxiliary: true, exceedsLimit: overflows !== false, hasCollapsedContext: true }}>
      {(expanded) => (
        <p ref={measureRef} title={title} className={`${className}${expanded ? "" : " clamp-text"}`.trim()}>
          {children}
        </p>
      )}
    </Collapsible>
  );
}
