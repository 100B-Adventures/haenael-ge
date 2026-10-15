// components/goal/Wordmap.tsx — 응원 메시지 워드맵 (read-model)
// 데이터: get_wordmap RPC → { word, word_count }[]
// DESIGN.md §5-5: gradient 예외(clover 계열 옅은 radial 허용). 단색+사이즈/opacity로 다정함.
// 서버 컴포넌트에서도 사용 가능 (no useState).

export interface WordmapWord {
  word: string;
  word_count: number;
}

export interface WordmapProps {
  words: WordmapWord[];
  /** empty 상태용 이름 (목표 주인공) */
  ownerName?: string;
  /** 하위 호환용. D-025-F 이후에는 값과 무관하게 전체를 보여준다. */
  showOverflowDisclosure?: boolean;
}

type SizeTier = "s1" | "s2" | "s3";

interface NormalizedWordmapWord extends WordmapWord {
  firstIndex: number;
}

function normalizeWords(words: WordmapWord[]): NormalizedWordmapWord[] {
  const merged = new Map<string, NormalizedWordmapWord>();

  words.forEach((item, index) => {
    const word = item.word.normalize("NFC").trim().replace(/\s+/gu, " ");
    if (!word) return;

    const count = Number.isFinite(item.word_count) ? item.word_count : 0;
    const existing = merged.get(word);
    if (existing) {
      existing.word_count += count;
      return;
    }

    merged.set(word, { word, word_count: count, firstIndex: index });
  });

  return Array.from(merged.values()).sort(
    (a, b) => b.word_count - a.word_count || a.firstIndex - b.firstIndex,
  );
}

function getSizeTier(
  count: number,
  minCount: number,
  maxCount: number,
  wordCount: number,
): SizeTier {
  if (wordCount === 1) return "s3";
  if (maxCount === minCount) return "s2";

  const ratio = (count - minCount) / (maxCount - minCount);
  if (ratio >= 0.67) return "s3";
  if (ratio >= 0.34) return "s2";
  return "s1";
}

// ─── Empty 상태 ───────────────────────────────────────────────────────────────

function EmptyWordmap({ ownerName }: { ownerName?: string }) {
  const name = ownerName ?? "이 목표";
  return (
    <div className="wordmap-empty" data-testid="wordmap-empty">
      <span className="wordmap-empty-icon" aria-hidden="true">♥</span>
      <p>아직 응원 메시지가 없어요</p>
      <small><strong>{name}</strong>에게 첫 응원을 남겨보세요.</small>
    </div>
  );
}

// ─── 워드맵 본체 ──────────────────────────────────────────────────────────────

export function Wordmap({
  words,
  ownerName,
  showOverflowDisclosure: _showOverflowDisclosure = true,
}: WordmapProps) {
  const normalizedWords = normalizeWords(words);

  if (normalizedWords.length === 0) {
    return <EmptyWordmap ownerName={ownerName} />;
  }

  const counts = normalizedWords.map((item) => item.word_count);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  return (
    <div
      className="wordmap-cloud"
      data-testid="wordmap"
      role="group"
      aria-label={`응원 메시지 워드맵, 전체 ${normalizedWords.length}개 표시`}
    >
      <span className="wordmap-heart wordmap-heart--left" aria-hidden="true">♥</span>
      <span className="wordmap-heart wordmap-heart--right" aria-hidden="true">♥</span>
      {normalizedWords.map((item) => {
        const tier = getSizeTier(
          item.word_count,
          minCount,
          maxCount,
          normalizedWords.length,
        );

        return (
          <span
            key={item.word}
            className={`wordmap-cloud-item wordmap-tier-${tier}`}
            data-wordmap-tier={tier}
            data-wordmap-item
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
}
