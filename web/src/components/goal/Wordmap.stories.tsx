import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Wordmap } from "./Wordmap";

const meta = {
  title: "Goal/Wordmap",
  component: Wordmap,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Wordmap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FrequencyWeighted: Story = {
  args: {
    ownerName: "서연",
    words: [
      { word: "꼭 해낼 거야", word_count: 18 },
      { word: "너라면 할 수 있어", word_count: 14 },
      { word: "오늘도 한 걸음", word_count: 10 },
      { word: "진짜 멋지다", word_count: 8 },
      { word: "끝까지 가보자", word_count: 5 },
      { word: "내가 옆에 있을게", word_count: 3 },
      { word: "응원해", word_count: 2 },
      { word: "천천히 가도 돼", word_count: 1 },
      { word: "오늘도 수고했어", word_count: 1 },
      { word: "포기하지 마", word_count: 1 },
      { word: "이미 잘하고 있어", word_count: 1 },
      { word: "한 번 더", word_count: 1 },
      { word: "우리 같이 해내자", word_count: 1 },
    ],
  },
};

export const Empty: Story = {
  args: { ownerName: "서연", words: [] },
};
