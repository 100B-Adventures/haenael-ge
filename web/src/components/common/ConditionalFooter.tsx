"use client";

import { usePathname } from "next/navigation";
import { legalExposureForPath } from "@/lib/legal/exposure";
import { LegalFooter } from "./LegalFooter";

export function ConditionalFooter() {
  const pathname = usePathname() ?? "";
  return <LegalFooter mode={legalExposureForPath(pathname)} />;
}
