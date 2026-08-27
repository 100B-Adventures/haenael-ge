// Footer.tsx — 전 페이지 하단 사업자 정보 고지 (전자상거래법 표시 의무)
// DESIGN.md 톤: 조용함(Discreet) — 작게, 목소리 낮춰. 장식 없음.

import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="w-full px-[22px] py-8 border-t [border-color:var(--border)]! [background-color:var(--background)]!"
      data-testid="site-footer"
    >
      <div className="mx-auto max-w-md flex flex-col gap-2.5">
        <div className="flex items-center gap-3 text-xs font-semibold [color:var(--muted-foreground)]!">
          <Link
            href="/terms"
            className="underline underline-offset-2"
            data-testid="footer-terms-link"
          >
            이용약관
          </Link>
          <span className="[color:var(--border)]!" aria-hidden="true">
            |
          </span>
          <Link
            href="/privacy"
            className="underline underline-offset-2"
            data-testid="footer-privacy-link"
          >
            개인정보처리방침
          </Link>
        </div>

        <ul className="flex flex-col gap-0.5 text-[11px] leading-relaxed [color:var(--faint)]!">
          <li>상호: 정성컴퍼니 · 대표: 조성진</li>
          <li>사업자등록번호: 798-31-01774</li>
          <li>주소: 서울시 강남구 역삼동 620-17 203호</li>
          <li>이메일: haenaelge.official@gmail.com</li>
          <li>개인정보보호책임자: 윤동주</li>
        </ul>

        <p className="text-[11px] [color:var(--faint)]!">
          © {new Date().getFullYear()} 정성컴퍼니. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
