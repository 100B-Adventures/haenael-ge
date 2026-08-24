import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheerList, type ReceiverCheer } from "./CheerList";

function makeCheers(count: number): ReceiverCheer[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    display_name: `응원자 ${index + 1}`,
    is_anonymous: index % 3 === 0,
    message: index === 0
      ? "긴 응원 메시지는 한 줄에서 말줄임되고 전체 문장은 title로 보존됩니다. 끝까지 응원할게요."
      : `${index + 1}번째 응원 메시지`,
    clover_amount: (index % 10) + 1,
    created_at: "2026-08-24T00:00:00.000Z",
  }));
}

const meta = {
  title: "Receiver/UI/CheerList",
  component: CheerList,
  decorators: [(Story) => <div className="mx-auto max-w-md bg-background p-6"><Story /></div>],
} satisfies Meta<typeof CheerList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { cheers: [], totalCount: 0 } };
export const Default: Story = { args: { cheers: makeCheers(3), totalCount: 3 } };
export const Overflow: Story = { args: { cheers: makeCheers(20), totalCount: 100 } };
