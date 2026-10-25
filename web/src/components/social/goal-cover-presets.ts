export const GOAL_COVER_PRESETS = [
  { key: "study", label: "공부·시험", file: "cover-study.jpg", alt: "아침 햇살이 드는 책상 위의 공책과 클로버 화분", keywords: ["토익", "토플", "공부", "시험", "수능", "학점", "영어", "합격", "독서", "책"] },
  { key: "run", label: "운동·달리기", file: "cover-run.jpg", alt: "새벽 공원 길 위의 러닝화", keywords: ["러닝", "달리", "마라톤", "운동", "헬스", "등산", "수영", "근력"] },
  { key: "health", label: "건강·식단", file: "cover-health.jpg", alt: "아침 주방 선반 위의 물컵과 채소", keywords: ["다이어트", "체중", "식단", "건강", "감량", "금주", "채식"] },
  { key: "career", label: "자격증·취업", file: "cover-career.jpg", alt: "자격증 교재와 노트북이 놓인 책상", keywords: ["자격증", "취업", "이직", "포트폴리오", "면접", "코딩", "승진"] },
  { key: "money", label: "저축·돈 모으기", file: "cover-money.jpg", alt: "나무 식탁 위의 작은 저금통과 공책", keywords: ["저축", "적금", "돈", "모으", "가계부", "절약", "투자"] },
  { key: "writing", label: "글쓰기·기록", file: "cover-writing.jpg", alt: "린넨 천 위에 펼쳐진 공책과 만년필", keywords: ["글쓰기", "블로그", "일기", "기록", "그림", "작곡", "연주"] },
  { key: "habit", label: "습관·루틴", file: "cover-habit.jpg", alt: "해 뜰 무렵 침대 옆 탁자의 시계와 물컵", keywords: ["습관", "루틴", "기상", "미라클", "금연", "명상", "스트레칭"] },
  { key: "travel", label: "여행·도전", file: "cover-travel.jpg", alt: "나무 벤치에 놓인 작은 배낭과 종이 지도", keywords: ["여행", "도전", "버킷", "일주", "완주", "출장"] },
] as const;

export type GoalCoverPresetKey = typeof GOAL_COVER_PRESETS[number]["key"];

const LEGACY_ALIASES: Record<string, GoalCoverPresetKey> = {
  c1: "study",
  c2: "run",
  c3: "health",
  c4: "career",
  c5: "money",
  c6: "writing",
};

export function automaticGoalCoverKey(title: string): GoalCoverPresetKey {
  return GOAL_COVER_PRESETS.find((preset) =>
    preset.keywords.some((keyword) => title.includes(keyword))
  )?.key ?? "study";
}

export function resolveGoalCoverPreset(
  presetKey: string | null | undefined,
  title: string,
) {
  const semanticKey = presetKey && (LEGACY_ALIASES[presetKey] ?? presetKey);
  return GOAL_COVER_PRESETS.find((preset) => preset.key === semanticKey) ??
    GOAL_COVER_PRESETS.find((preset) => preset.key === automaticGoalCoverKey(title))!;
}

export function goalCoverAssetPath(file: string) {
  return `/images/v2-cover-presets/${file}`;
}
