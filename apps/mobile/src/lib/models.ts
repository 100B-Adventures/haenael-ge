export type Goal = {
  id: number;
  slug: string;
  title: string;
  reason: string | null;
  due_date: string;
  status: string;
  cheer_count?: number;
};

export type Word = { word: string; word_count: number };

export const demoGoals: Goal[] = [
  {
    id: 101,
    slug: "run-a-half-marathon",
    title: "봄에 하프 마라톤 완주하기",
    reason: "매주 한 걸음씩, 오래 달리는 사람이 되고 싶어요.",
    due_date: "2027-04-18",
    status: "ACTIVE",
    cheer_count: 12
  },
  {
    id: 102,
    slug: "publish-my-first-book",
    title: "첫 전자책 출간하기",
    reason: "쌓아 둔 기록을 누군가에게 도움이 되는 책으로 만들게요.",
    due_date: "2027-02-28",
    status: "ACTIVE",
    cheer_count: 7
  }
];

export const demoWords: Word[] = [
  { word: "끝까지 가보자", word_count: 8 },
  { word: "너라면 할 수 있어", word_count: 6 },
  { word: "오늘도 한 걸음", word_count: 5 },
  { word: "내가 옆에 있을게", word_count: 3 },
  { word: "진짜 멋지다", word_count: 2 }
];
