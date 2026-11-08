import { Clover } from "lucide-react";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";

type Props = {
  goalTitle: string;
  cheerCount: number;
  message: string | null;
  words: WordmapWord[];
};

export function DopamineGrowthOverlay({
  goalTitle,
  cheerCount,
  message,
  words,
}: Props) {
  const cleanTitle = goalTitle.replace(/\s*해낼게\s*$/, "").trim();

  return (
    <section
      className="wordmap-growth-overlay"
      data-testid="payment-dopamine-overlay"
      aria-labelledby="payment-growth-title"
    >
      <div className="wordmap-growth-kicker">
        <Clover size={18} strokeWidth={2.5} aria-hidden="true" />
        <span>{cleanTitle || "친구의 목표"} 해낼게</span>
      </div>
      <h2 id="payment-growth-title">
        {message ? (
          <>
            내가 보낸 응원이
            <br />
            워드맵에 바로 쌓였어요
          </>
        ) : (
          <>
            내 응원으로
            <br />
            응원 인원이 한 명 늘었어요
          </>
        )}
      </h2>
      <p className="wordmap-growth-description">
        {message
          ? "같은 말이 쌓일수록 더 크게 자라요."
          : "응원하는 마음은 목표에 그대로 전달됐어요."}
      </p>

      <div className="wordmap-growth-visual" data-testid="payment-growth-wordmap">
        <Wordmap words={words} goalTitle={cleanTitle} />
      </div>

      <p className="wordmap-growth-count" data-testid="payment-growth-count">
        지금까지 <strong>{cheerCount}</strong>명이 이 목표를 응원했어요
      </p>

      {message && (
        <div className="wordmap-growth-message" data-testid="payment-growth-message" role="status">
          <span aria-hidden="true">✨</span>
          <p>
            이번에 보낸 말
            <strong>{message}</strong>
          </p>
        </div>
      )}
    </section>
  );
}
