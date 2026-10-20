import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheerSummaryBar } from "./CheerSummaryBar";

const meta = {
  title: "Social/V2Revision/CheerSummaryBar",
  component: CheerSummaryBar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof CheerSummaryBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    goal: {
      cheer_count: 5,
      supporter_avatars: [
        { profile_image: null, is_anonymous: false },
        { profile_image: null, is_anonymous: true },
        { profile_image: null, is_anonymous: false },
      ],
      recent_cheer: {
        supporter_name: "도경",
        message: "이번 주도 꾸준히 해낼 수 있어요.",
        created_at: "2026-10-20T00:00:00Z",
        is_anonymous: false,
      },
    },
  },
};

export const Empty: Story = {
  args: { goal: { cheer_count: 0, supporter_avatars: [], recent_cheer: null } },
};
