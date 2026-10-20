import Link from "next/link";
import {
  BUSINESS_INFORMATION,
  type LegalExposureMode,
} from "@/lib/legal/exposure";

export function LegalLinkList() {
  return (
    <nav className="my-policy-links" aria-label="법적 고지">
      <Link href="/terms">이용약관</Link>
      <Link href="/privacy">개인정보처리방침</Link>
      <Link href="/my/legal">사업자 정보</Link>
    </nav>
  );
}

export function BusinessInfoBlock() {
  return (
    <dl className="business-info" data-testid="business-information">
      <div><dt>상호</dt><dd>{BUSINESS_INFORMATION.businessName}</dd></div>
      <div><dt>대표자</dt><dd>{BUSINESS_INFORMATION.representative}</dd></div>
      <div><dt>사업자등록번호</dt><dd>{BUSINESS_INFORMATION.registrationNumber}</dd></div>
      <div><dt>주소</dt><dd>{BUSINESS_INFORMATION.address}</dd></div>
      <div><dt>이메일</dt><dd>{BUSINESS_INFORMATION.email}</dd></div>
      <div><dt>개인정보보호책임자</dt><dd>{BUSINESS_INFORMATION.privacyOfficer}</dd></div>
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
