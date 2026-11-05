import { LEGAL_EXPOSURE } from "@/lib/legal/exposure";
import { LegalFooter } from "./LegalFooter";

export function Footer() {
  return <LegalFooter mode={LEGAL_EXPOSURE.landing} />;
}
