// Footer.tsx — 전 페이지 하단 사업자 정보 고지 (전자상거래법 표시 의무)
// DESIGN.md 톤: 조용함(Discreet) — 작게, 목소리 낮춰. 장식 없음.

import Link from "next/link";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-common-footer";

export function Footer() {
  return (
    <footer
      className="w-full px-[22px] py-8 border-t [border-color:var(--border)]! [background-color:var(--background)]!"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-md flex flex-col gap-2.5">
        <div className="flex items-center gap-3 text-sm font-semibold [color:var(--muted-foreground)]!">
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center underline underline-offset-2 transition-transform active:translate-y-px"
            data-testid="footer-terms-link"
          >{PRODUCT_COPY.TEXT_001}</Link>
          <span className="[color:var(--border)]!" aria-hidden="true">
            |
          </span>
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center underline underline-offset-2 transition-transform active:translate-y-px"
            data-testid="footer-privacy-link"
          >{PRODUCT_COPY.TEXT_002}</Link>
        </div>

        <ul className="flex flex-col gap-0.5 text-[13px] leading-relaxed [color:var(--muted-color)]!">
          <li>{PRODUCT_COPY.TEXT_003}</li>
          <li>{PRODUCT_COPY.TEXT_004}</li>
          <li>{PRODUCT_COPY.TEXT_005}</li>
          <li>{PRODUCT_COPY.TEXT_006}</li>
          <li>{PRODUCT_COPY.TEXT_007}</li>
        </ul>

        <p className="text-[13px] [color:var(--muted-color)]!">
          © {new Date().getFullYear()}{PRODUCT_COPY.TEXT_008}</p>
      </div>
    </footer>
  );
}
