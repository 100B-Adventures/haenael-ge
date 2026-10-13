import type { Meta, StoryObj } from "@storybook/react-vite";
import { GoalCard, GoalList } from "./GoalCard";
import type { GoalSummary } from "../domain";

const goal: GoalSummary = {
  goalId: 1,
  slug: "sample",
  title: "이번 달엔 세 번씩 꼭 달릴게",
  ownerName: "서연",
  dueLabel: "12월 1일까지",
  cheerCount: 13,
  coverPreset: "c1",
  coverUrl: "/avatars/seoyeon.png",
  message: "작게 시작해도 계속 이어가는 중이에요.",
  words: ["꾸준함"],
};

const meta = { title: "Miniapp/GoalCard", component: GoalCard, args: { goal, onOpen: () => undefined } } satisfies Meta<typeof GoalCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LongTitle: Story = { args: { goal: { ...goal, title: "아주 길어져도 두 줄 안에서 읽을 수 있는 목표 문장을 매일 꾸준히 써 내려갈게" } } };
export const Empty = { render: () => <GoalList goals={[]} onOpen={() => undefined} /> };
export const Loading = { render: () => <GoalList goals={[]} loading onOpen={() => undefined} /> };
export const Error = { render: () => <GoalList goals={[]} error="친구 목표를 불러오지 못했어요." onOpen={() => undefined} /> };
