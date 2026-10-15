export interface WordmapKeywordSource {
  word: string;
  word_count: number;
}

export interface WordmapKeyword extends WordmapKeywordSource {
  firstIndex: number;
}

const MIN_KEYWORD_LENGTH = 2;
const MAX_KEYWORD_LENGTH = 12;

const SINGLE_CHARACTER_KEYWORDS = new Set(["꿈", "힘", "빛"]);
const EMOJI_KEYWORDS = new Set(["❤", "❤️", "💚", "👏", "🔥", "💪", "🍀", "✨"]);

const STOPWORDS = new Set([
  "거", "것", "게", "수", "중", "저", "제", "나", "너", "네", "우리", "저희",
  "여러분", "누구", "누군가", "사람", "친구", "님", "오늘", "내일", "어제", "지금",
  "정말", "너무", "진짜로", "그냥", "조금", "다시", "계속", "이번", "다음", "차례",
  "클로버", "해낼게", "메시지", "응원메시지", "목표", "마음", "말", "건네", "보내",
  "전해", "드려", "주세", "바라", "있", "없", "되", "하", "해", "했", "한다",
]);

const PARTICLE_SUFFIXES = [
  "에게서", "한테서", "으로부터", "이라고", "이라는", "이라도", "이랑", "처럼", "보다",
  "까지", "부터", "에게", "한테", "께서", "으로", "에서", "이든", "든지", "라도",
  "하고", "이며", "이면", "은", "는", "이", "가", "을", "를", "의", "에", "께",
  "로", "와", "과", "랑", "도", "만", "마다", "조차", "밖에",
].sort((a, b) => b.length - a.length);

const PREDICATE_ENDINGS = [
  "할게요", "할께요", "할게", "할께", "합니다", "했어요", "했어", "하는데", "하면",
  "해서", "하고", "한다", "해요", "해", "입니다", "이에요", "예요", "이야", "일게요",
  "될게요", "될게", "돼요", "되요", "된다", "되자", "있어요", "있어", "없어요", "없어",
  "을게요", "ㄹ게요", "을게", "ㄹ게", "네요", "군요", "지요", "죠", "어요", "아요",
  "는다", "ㄴ다", "자", "고", "며", "면",
].sort((a, b) => b.length - a.length);

const CANONICAL_EXPRESSIONS: Array<[RegExp, string]> = [
  [/화이팅|파이팅/gu, "화이팅"],
  [/해낼\s*수\s*있|할\s*수\s*있/gu, "할 수 있어"],
  [/잘\s*하고\s*있/gu, "잘하고 있어"],
  [/끝까지/gu, "끝까지"],
  [/힘내/gu, "힘내"],
  [/최고/gu, "최고"],
  [/응원/gu, "응원"],
  [/꾸준/gu, "꾸준함"],
  [/멋지/gu, "멋지다"],
  [/대단/gu, "대단하다"],
  [/자랑스/gu, "자랑스러워"],
  [/잘했|잘한다/gu, "잘했어"],
  [/축하/gu, "축하"],
  [/기대/gu, "기대"],
  [/믿어|믿는다|믿고/gu, "믿어"],
  [/함께/gu, "함께"],
];

const NON_KEYWORD_PREDICATES = /(?:건네|전해|보내|드려|바라|기다려|가져|할게|될게|있어|없어|이에요|예요)/u;

function segmentWords(input: string): string[] {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("ko", { granularity: "word" });
    return Array.from(segmenter.segment(input))
      .filter((part) => part.isWordLike)
      .map((part) => part.segment);
  }
  return input.match(/[\p{L}\p{N}]+/gu) ?? [];
}

function stripParticle(token: string): string {
  for (const suffix of PARTICLE_SUFFIXES) {
    const candidate = token.slice(0, -suffix.length);
    if (
      token.endsWith(suffix) &&
      (candidate.length >= MIN_KEYWORD_LENGTH || SINGLE_CHARACTER_KEYWORDS.has(candidate))
    ) {
      return candidate;
    }
  }
  return token;
}

function stripPredicateEnding(token: string): { stem: string; stripped: boolean } {
  for (const ending of PREDICATE_ENDINGS) {
    if (token.endsWith(ending) && token.length - ending.length >= MIN_KEYWORD_LENGTH) {
      return { stem: token.slice(0, -ending.length), stripped: true };
    }
  }
  return { stem: token, stripped: false };
}

function isAllowedLength(token: string): boolean {
  const length = Array.from(token).length;
  return SINGLE_CHARACTER_KEYWORDS.has(token) ||
    (length >= MIN_KEYWORD_LENGTH && length <= MAX_KEYWORD_LENGTH);
}

export function extractWordmapKeywords(input: string): string[] {
  const normalized = input.normalize("NFC").replace(/\s+/gu, " ").trim();
  if (!normalized) return [];

  const keywords = new Set<string>();
  for (const [pattern, keyword] of CANONICAL_EXPRESSIONS) {
    pattern.lastIndex = 0;
    if (pattern.test(normalized)) keywords.add(keyword);
  }

  for (const emoji of normalized.match(/\p{Extended_Pictographic}\uFE0F?/gu) ?? []) {
    const canonical = emoji.startsWith("❤") ? "❤️" : emoji;
    if (EMOJI_KEYWORDS.has(canonical)) keywords.add(canonical);
  }

  for (const rawToken of segmentWords(normalized)) {
    const cleanToken = rawToken.replace(/[^\p{L}\p{N}]/gu, "");
    if (!cleanToken || /\d/u.test(cleanToken) || cleanToken.endsWith("님")) continue;
    if (CANONICAL_EXPRESSIONS.some(([pattern]) => {
      pattern.lastIndex = 0;
      return pattern.test(cleanToken);
    })) continue;

    const particleStripped = stripParticle(cleanToken);
    if (STOPWORDS.has(cleanToken) || STOPWORDS.has(particleStripped)) continue;

    const { stem, stripped } = stripPredicateEnding(particleStripped);
    if (STOPWORDS.has(stem) || NON_KEYWORD_PREDICATES.test(particleStripped)) continue;
    if (stripped) continue;
    if (!isAllowedLength(stem)) continue;

    keywords.add(stem);
  }

  return [...keywords];
}

export function normalizeWordmapKeywords(
  sources: WordmapKeywordSource[],
): WordmapKeyword[] {
  const merged = new Map<string, WordmapKeyword>();
  let firstIndex = 0;

  sources.forEach((source) => {
    const count = Number.isFinite(source.word_count) ? Math.max(0, source.word_count) : 0;
    for (const keyword of extractWordmapKeywords(source.word)) {
      const existing = merged.get(keyword);
      if (existing) {
        existing.word_count += count;
      } else {
        merged.set(keyword, { word: keyword, word_count: count, firstIndex });
        firstIndex += 1;
      }
    }
  });

  return Array.from(merged.values()).sort(
    (a, b) => b.word_count - a.word_count || a.firstIndex - b.firstIndex,
  );
}
