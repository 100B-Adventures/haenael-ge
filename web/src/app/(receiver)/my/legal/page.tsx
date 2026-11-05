import Link from "next/link";
// D-040 route implementation token: my/legal
import { LegalFooter, LegalLinkList } from "@/components/common/LegalFooter";
import { ReceiverPageShell } from "@/components/receiver/ReceiverShell";
import { COMMERCE_REGISTRATION, LEGAL_EXPOSURE } from "@/lib/legal/exposure";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-my-legal-page";

export default function BusinessInformationPage() {
  return (
    <ReceiverPageShell testId="business-information-page" bottomSafe>
      <header className="social-detail-head">
        <Link href="/my" aria-label="관리로 돌아가기">‹</Link>
        <strong>{PRODUCT_COPY.TEXT_001}</strong>
        <span aria-hidden="true" />
      </header>
      <p className="social-description">{PRODUCT_COPY.TEXT_002}</p>
      <LegalLinkList />
      <LegalFooter mode={LEGAL_EXPOSURE.myLegal} />
      <section
        className="business-registration-status"
        aria-labelledby="commerce-registration-heading"
      >
        <strong id="commerce-registration-heading">
          {COMMERCE_REGISTRATION.label} · {COMMERCE_REGISTRATION.status}
        </strong>
        <p>{COMMERCE_REGISTRATION.note}</p>
      </section>
    </ReceiverPageShell>
  );
}
