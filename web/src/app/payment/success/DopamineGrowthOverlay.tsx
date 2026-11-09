"use client";

import Link from "next/link";
import { ChevronLeft, Clover } from "lucide-react";
import { useState } from "react";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { ReceiverBottomNavView } from "@/components/social/ReceiverBottomNav";
import { GoalCover } from "@/components/social/GoalCover";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-payment-success-page";

export type DopamineGrowthProps = {
  goalId: number;
  goalSlug: string;
  goalTitle: string;
  message: string | null;
  words: WordmapWord[];
  coverPresetKey: string | null;
  coverUrl: string | null;
  viewerAuthenticated: boolean;
  backHref: string;
};

type PaymentSuccessFlowProps = {
  confirmedGoalTitle: string;
  backHref: string;
  backLabel: string;
  homeLabel: string;
  growth: DopamineGrowthProps;
};

export function PaymentSuccessFlow({
  confirmedGoalTitle,
  backHref,
  backLabel,
  homeLabel,
  growth,
}: PaymentSuccessFlowProps) {
  const [stage, setStage] = useState<"success" | "growth">("success");

  if (stage === "growth") {
    return <DopamineGrowthOverlay {...growth} />;
  }

  return (
    <section
      className="payment-success-card"
      data-status="success"
      data-testid="payment-success-state"
    >
      <div className="payment-success-icon" aria-hidden="true">
        <Clover size={28} strokeWidth={2.5} />
      </div>
      <h1>{PRODUCT_COPY.SUCCESS_TITLE}</h1>
      <p className="payment-success-message">
        <span>&quot;{confirmedGoalTitle}&quot; 목표에 응원을 보냈어요.</span>
        <span>{PRODUCT_COPY.SUCCESS_WORDMAP}</span>
      </p>
      <div className="payment-success-actions">
        <Link
          href={backHref}
          className="payment-success-primary"
          data-testid="payment-success-back"
          onClick={(event) => {
            event.preventDefault();
            setStage("growth");
          }}
        >
          {backLabel}
        </Link>
        <Link href="/" className="payment-success-secondary">
          {homeLabel}
        </Link>
      </div>
    </section>
  );
}

export function DopamineGrowthOverlay({
  goalId,
  goalSlug,
  goalTitle,
  message,
  words,
  coverPresetKey,
  coverUrl,
  viewerAuthenticated,
  backHref,
}: DopamineGrowthProps) {
  const cleanTitle = goalTitle.replace(/\s*해낼게\s*$/, "").trim();
  const fullTitle = cleanTitle ? `${cleanTitle} 해낼게` : "친구의 목표";
  const wordCount = words.reduce((sum, word) => sum + Number(word.word_count), 0);

  return (
    <section
      className="wordmap-growth-overlay"
      data-testid="payment-dopamine-overlay"
      data-goal-id={goalId}
      aria-labelledby="payment-growth-title"
    >
      <header className="social-detail-head wordmap-growth-head">
        <Link href={backHref} aria-label="친구 목표로 돌아가기">
          <ChevronLeft aria-hidden="true" />
        </Link>
        <strong>친구의 해낼게</strong>
        <span aria-hidden="true" />
      </header>

      <div className="wordmap-growth-top">
        <div className="wordmap-growth-kicker">친구 · {fullTitle}</div>
        <h2 id="payment-growth-title">
          {PRODUCT_COPY.GROWTH_TITLE_LINE_1}
          <br />
          {PRODUCT_COPY.GROWTH_TITLE_LINE_2}
        </h2>
        <p className="wordmap-growth-description">{PRODUCT_COPY.GROWTH_DESCRIPTION}</p>
      </div>

      <GoalCover
        presetKey={coverPresetKey}
        imageUrl={coverUrl}
        title={fullTitle}
        size="hero"
        caption="친구가 지금 이 목표를 향해 가는 중"
      />

      <div className="wordmap-growth-visual" data-testid="payment-growth-wordmap">
        <Wordmap words={words} goalTitle={cleanTitle} />
      </div>

      <p className="wordmap-growth-count" data-testid="payment-growth-count">
        지금까지 <strong>{wordCount}개</strong>의 응원 단어가 쌓였어요
      </p>

      <Link
        href={`/g/${goalSlug}#cheer`}
        className="wordmap-growth-cheer"
        data-testid="payment-growth-cheer-link"
      >
        🍀 조용히 응원하기
      </Link>

      <div className="wordmap-growth-feedback" data-testid="payment-growth-feedback">
        <span aria-hidden="true">✨</span>
        <p>
          {message && (
            <span data-testid="payment-growth-message" role="status">
              이번에 보낸 말 <strong>{message}</strong>
            </span>
          )}
          <span>{PRODUCT_COPY.GROWTH_FEEDBACK}</span>
        </p>
      </div>

      <ReceiverBottomNavView locked={!viewerAuthenticated} pathname={backHref} />
    </section>
  );
}
