import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackHomeLink, ReceiverBrandMark, ReceiverPageShell } from "./ReceiverShell";

const meta = {
  title: "Common/Layout/ReceiverShell",
  component: ReceiverPageShell,
  parameters: { layout: "fullscreen" },
  args: {
    testId: "storybook-receiver-shell",
    children: null,
  },
} satisfies Meta<typeof ReceiverPageShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subpage: Story = {
  render: () => (
    <ReceiverPageShell testId="storybook-receiver-subpage">
      <ReceiverBrandMark />
      <h1 className="receiver-page-title mt-2">환전 진행 상태</h1>
      <div className="mt-6 rounded-md border border-border bg-card p-4">공용 최대 폭과 정렬선을 상속한 본문</div>
      <BackHomeLink />
    </ReceiverPageShell>
  ),
};

export const BottomSafe: Story = {
  render: () => (
    <ReceiverPageShell testId="storybook-receiver-home" bottomSafe>
      <ReceiverBrandMark />
      <div className="mt-6 rounded-md border border-border bg-card p-4">하단 고정 행동을 위한 안전 여백 상태</div>
    </ReceiverPageShell>
  ),
};
