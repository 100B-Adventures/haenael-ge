import Link from "next/link";
import {
  BUSINESS_INFORMATION,
  type LegalExposureMode,
} from "@/lib/legal/exposure";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-common-legalfooter";

export function LegalLinkList() {
  return (
    <nav className="my-policy-links" aria-label="법적 고지">
      <Link href="/terms">{PRODUCT_COPY.TEXT_001}</Link>
      <Link href="/privacy">{PRODUCT_COPY.TEXT_002}</Link>
      <Link href="/my/legal">{PRODUCT_COPY.TEXT_003}</Link>
    </nav>
  );
}

export function BusinessInfoBlock() {
  return (
    <dl className="business-info" data-testid="business-information">
      <div><dt>{PRODUCT_COPY.TEXT_004}</dt><dd>{BUSINESS_INFORMATION.businessName}</dd></div>
      <div><dt>{PRODUCT_COPY.TEXT_005}</dt><dd>{BUSINESS_INFORMATION.representative}</dd></div>
      <div><dt>{PRODUCT_COPY.TEXT_006}</dt><dd>{BUSINESS_INFORMATION.registrationNumber}</dd></div>
      <div><dt>{PRODUCT_COPY.TEXT_007}</dt><dd>{BUSINESS_INFORMATION.address}</dd></div>
      <div><dt>{PRODUCT_COPY.TEXT_008}</dt><dd>{BUSINESS_INFORMATION.email}</dd></div>
      <div><dt>{PRODUCT_COPY.TEXT_009}</dt><dd>{BUSINESS_INFORMATION.privacyOfficer}</dd></div>
    </dl>
  );
}

export function LegalFooter({ mode }: { mode: LegalExposureMode }) {
  if (mode === "none" || mode === "page") return null;
  return (
    <footer className="legal-footer" data-testid="legal-footer">
      {mode === "link" ? <LegalLinkList /> : <BusinessInfoBlock />}
    </footer>
  );
}
