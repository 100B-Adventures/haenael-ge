// page.tsx — 어떻게 쓰는 건가요? (브랜딩 가이드 페이지)
// 6차 미니 라운드: 랜딩(page.tsx:221) "어떻게 쓰는 건가요?" 링크의 404 해소.
// 콘텐츠 신규 창작 없음 — 랜딩 hero/steps3 카피 + landing-final.html 캡션 +
// wiki/brand/voice-copy-bank.md P2-01·P3-01·P3-05·P4-05 [stable] 카피만 재사용.
// 톤·레이아웃은 랜딩(page.tsx) Tailwind 관례를 그대로 따른다.

import Link from "next/link";
import type { Metadata } from "next";

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
    title: "선언",
    desc: "말하면 시작된다. 해낼게. — 이루고 싶은 목표를 한 문장으로 선언해요.",
  },
  {
    no: "2",
    title: "친구가 🍀로 응원",
    desc: "기프티콘은 답장을 요구한다. 클로버는 아무것도 요구하지 않는다. 이름도 금액도, 친구에게 보이지 않게 전해드릴게요.",
  },
  {
    no: "3",
    title: "모이면 환전",
    desc: "해내면 네 것. 못 해내도, 잃는 사람은 없다. (환전은 오픈 예정입니다)",
  },
];

export default function HowPage() {
  return (
    <main className="flex flex-col min-h-svh px-[22px] [background-color:var(--background)]! [background-image:radial-gradient(120%_60%_at_50%_6%,_rgba(31,158,90,.05),_transparent_60%)]!">
      {/* BrandMark */}
      <div className="pt-14 pb-0">
        <p className="font-extrabold [font-size:13px]! [letter-spacing:-0.2px]! [color:var(--foreground)]!">
          해낼게
          <span className="[color:var(--clover-bright)]!">.</span>
        </p>
      </div>

      {/* Hero */}
      <div className="text-center mt-7 mb-10 flex flex-col items-center gap-3.5">
        <h1 className="font-black [font-size:28px]! [letter-spacing:-1px]! [line-height:1.2]! [color:var(--foreground)]!">
          어떻게 쓰는 건가요?
        </h1>
        <p className="font-medium leading-snug [font-size:15.5px]! [color:var(--muted-foreground)]!">
          응원은 돈으로 하는 겁니다.
        </p>
      </div>

      {/* 3단계 설명 */}
      <div className="flex-1 flex flex-col gap-4 mb-8">
        {STEPS.map((step) => (
          <div
            key={step.no}
            className="flex gap-4 rounded-[18px] p-5 [background-color:var(--card)]! [box-shadow:0_2px_10px_rgba(22,20,15,.05)]!"
          >
            <div
              className="flex items-center justify-center shrink-0 font-extrabold rounded-full [width:30px]! [height:30px]! [font-size:14px]! [color:var(--card)]! [background-color:var(--primary)]!"
              aria-hidden="true"
            >
              {step.no}
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-bold [font-size:15px]! [color:var(--foreground)]!">
                {step.title}
              </p>
              <p className="leading-relaxed [font-size:13.5px]! [color:var(--muted-foreground)]!">
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="pb-10 flex flex-col gap-3">
        <Link
          href="/onboarding"
          className="block w-full text-center font-extrabold rounded-[15px] transition-opacity active:opacity-80 p-[16px]! [font-size:15.5px]! [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
          data-testid="how-cta"
        >
          시작하기
        </Link>

        <Link
          href="/"
          className="block w-full text-center font-semibold transition-opacity active:opacity-70 [font-size:13px]! [color:var(--muted-foreground)]! p-[12px]! [min-height:44px]! [display:flex]! [align-items:center]! [justify-content:center]!"
          data-testid="how-home-link"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
