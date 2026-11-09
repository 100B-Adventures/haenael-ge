import { Clover } from "lucide-react";
import { Wordmap, type WordmapWord } from "@/components/goal/Wordmap";
import { GoalCover } from "@/components/social/GoalCover";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-payment-success-page";

type Props = {
  goalTitle: string;
  message: string | null;
  words: WordmapWord[];
  coverPresetKey: string | null;
  coverUrl: string | null;
};

export function DopamineGrowthOverlay({
  goalTitle,
  message,
  words,
  coverPresetKey,
  coverUrl,
}: Props) {
  const cleanTitle = goalTitle.replace(/\s*해낼게\s*$/, "").trim();
  const fullTitle = cleanTitle ? `${cleanTitle} 해낼게` : "친구의 목표";
  const wordCount = words.reduce((sum, word) => sum + Number(word.word_count), 0);

  return (
    <section
      className="wordmap-growth-overlay"
      data-testid="payment-dopamine-overlay"
      aria-labelledby="payment-growth-title"
    >
      <div className="wordmap-growth-top">
        <div className="wordmap-growth-kicker">
          <Clover size={18} strokeWidth={2.5} aria-hidden="true" />
          <span>친구 · {fullTitle}</span>
        </div>
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
        <span>지금까지</span>
        <span><strong>{wordCount}</strong>개의 응원 단어가 쌓였어요</span>
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

      <div className="wordmap-growth-feedback">
        <span aria-hidden="true">✨</span>
        <p>{PRODUCT_COPY.GROWTH_FEEDBACK}</p>
      </div>
    </section>
  );
}
