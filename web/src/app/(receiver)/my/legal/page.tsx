import Link from "next/link";
// D-040 route implementation token: my/legal
import { ReceiverPageShell } from "@/components/receiver/ReceiverShell";

export default function BusinessInformationPage() {
  return (
    <ReceiverPageShell testId="business-information-page">
      <header className="social-detail-head">
        <Link href="/my" aria-label="관리로 돌아가기">‹</Link>
        <strong>사업자 정보</strong>
        <span aria-hidden="true" />
      </header>
    </ReceiverPageShell>
  );
}
