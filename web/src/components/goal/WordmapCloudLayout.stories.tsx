import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WordmapCloudLayout } from "./WordmapCloudLayout";

const meta = {
  title: "Goal/Layout/WordmapCloudLayout",
  component: WordmapCloudLayout,
  parameters: { layout: "fullscreen" },
  args: {
    className: "wordmap-cloud",
    seed: "storybook-wordmap-cloud",
    label: "응원 메시지 워드맵 레이아웃",
  },
} satisfies Meta<typeof WordmapCloudLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

function item(text: string, tier: "s1" | "s2" | "s3" = "s2") {
  return (
    <span key={text} className={`wordmap-cloud-item wordmap-tier-${tier}`} data-wordmap-item>
      {text}
    </span>
  );
}

export const Default: Story = {
  args: {
    children: [
      item("꼭 해낼 거야", "s3"),
      item("너라면 할 수 있어", "s2"),
      item("오늘도 한 걸음", "s1"),
    ],
  },
};

export const Empty: Story = {
  args: { children: null },
};

export const LongWords: Story = {
  args: {
    seed: "storybook-wordmap-cloud-long",
    children: [
      item("매일의 작은 약속을 끝까지 이어가는 사람이야", "s3"),
      item("너라면 분명 해낼 수 있어", "s2"),
      item("서두르지 않아도 괜찮아", "s2"),
      item("오늘도 한 걸음", "s1"),
      item("이미 충분히 잘하고 있어", "s1"),
      item("포기하지 마", "s1"),
    ],
  },
};
