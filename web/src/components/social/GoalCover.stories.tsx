import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GoalCover } from "./GoalCover";

const meta = {
  title: "Social/UI/GoalCover",
  component: GoalCover,
  parameters: { layout: "centered" },
} satisfies Meta<typeof GoalCover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UploadedPortraitBanner: Story = {
  args: {
    title: "매일 운동하기",
    imageUrl: "/images/social-viral/seoyeon.png",
    size: "banner",
  },
};
