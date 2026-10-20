"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Collapsible } from "./Collapsible";

export function ClampText({ children, className = "" }: { children: string; className?: string }) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
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
    <Collapsible policy={{ auxiliary: true, exceedsLimit: overflows, hasCollapsedContext: true }}>
      {(expanded) => (
        <p ref={measureRef} className={`${className}${expanded ? "" : " clamp-text"}`.trim()}>
          {children}
        </p>
      )}
    </Collapsible>
  );
}
