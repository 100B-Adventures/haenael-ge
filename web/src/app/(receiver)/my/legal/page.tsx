import Link from "next/link";
// D-040 route implementation token: my/legal
import { BusinessInfoBlock } from "@/components/common/LegalFooter";
import { ReceiverPageShell } from "@/components/receiver/ReceiverShell";
import { COMMERCE_REGISTRATION } from "@/lib/legal/exposure";

export default function BusinessInformationPage() {
  return (
    <ReceiverPageShell testId="business-information-page">
      <header className="social-detail-head">
        <Link href="/my" aria-label="관리로 돌아가기">‹</Link>
        <strong>사업자 정보</strong>
        <span aria-hidden="true" />
      </header>
      <p className="social-description">
        해낼게를 운영하는 사업자의 정보를 확인할 수 있어요.
      </p>
      <BusinessInfoBlock />
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
