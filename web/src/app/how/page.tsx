// page.tsx — 어떻게 쓰는 건가요? (브랜딩 가이드 페이지)
// 6차 미니 라운드: 랜딩(page.tsx:221) "어떻게 쓰는 건가요?" 링크의 404 해소.
// 콘텐츠 신규 창작 없음 — 랜딩 hero/steps3 카피 + landing-final.html 캡션 +
// wiki/brand/voice-copy-bank.md P2-01·P3-01·P3-05·P4-05 [stable] 카피만 재사용.
// 톤·레이아웃은 랜딩(page.tsx) Tailwind 관례를 그대로 따른다.

import Link from "next/link";
import type { Metadata } from "next";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-how-page";

export const metadata: Metadata = {
  title: "어떻게 쓰는 건가요? — 해낼게",
  description:
    "해낼게는 어떻게 쓰나요. 선언하고, 친구가 클로버로 응원하고, 모이면 환전(오픈 예정)까지 3단계로 안내합니다.",
};

interface StepInfo {
  no: string;
  title: string;
  desc: string;
}

// 랜딩 steps3("선언 › 친구가 🍀로 응원 › 모이면 환전")
// + landing-final.html steps3 원문("모이면 환전") 그대로 3단계 확장
const STEPS: StepInfo[] = [
  {
    no: "1",
    title: "목표를 선언해요",
    desc: '"나 ○○ 해낼게" 한 줄이면 나만의 응원 링크가 생겨요.',
  },
  {
    no: "2",
    title: "친구가 🍀로 응원해요",
    desc: "링크를 받은 친구가 조용히 돈으로 응원을 보내요. 금액은 서로에게 보이지 않아요.",
  },
  {
    no: "3",
    title: "응원이 워드맵에 쌓여요",
    desc: "받은 응원이 워드맵에 단어로 쌓여요. 모인 클로버는 환전할 수 있어요.",
  },
];

export default function HowPage() {
  return (
    <main className="flex flex-col min-h-svh px-[22px] [background-color:var(--background)]! [background-image:radial-gradient(120%_60%_at_50%_6%,_rgba(31,158,90,.05),_transparent_60%)]!">
      <header className="social-detail-head mt-8">
        <Link href="/" aria-label="홈으로 돌아가기">‹</Link>
        <strong>어떻게 쓰나요</strong>
        <span aria-hidden="true" />
      </header>
      <h1 className="mt-8 text-2xl font-black text-foreground">해낼게, 이렇게 써요</h1>

      {/* 3단계 설명 */}
      <div className="flex-1 mb-8">
        {STEPS.map((step) => (
          <section key={step.no} className="mt-8">
            <h2 className="text-base font-extrabold text-foreground">{step.no}. {step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
          </section>
        ))}
      </div>

      {/* CTA */}
      <div className="pb-10 flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="block w-full text-center font-extrabold rounded-[15px] transition-opacity active:opacity-80 p-[16px]! [font-size:15.5px]! [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
          data-testid="how-cta"
        >{PRODUCT_COPY.TEXT_004}</Link>

      </div>
    </main>
  );
}
