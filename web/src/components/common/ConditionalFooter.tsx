"use client";

import { usePathname } from "next/navigation";
import { legalExposureForPath } from "@/lib/legal/exposure";
import { LegalFooter } from "./LegalFooter";

export function ConditionalFooter() {
  const pathname = usePathname() ?? "";
  const mode = legalExposureForPath(pathname);
  // D-040: /my의 링크와 /my/legal의 전문은 각 페이지 본문이 직접 소유한다.
  if (mode === "link" || mode === "biz") return null;
  return <LegalFooter mode={mode} />;
}
