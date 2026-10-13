import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendGoalList } from "./FriendGoalList";

const meta = {
  title: "Social/FriendGoalList",
  component: FriendGoalList,
  parameters: { layout: "centered" },
} satisfies Meta<typeof FriendGoalList>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Normal: Story = {
  args: {
    friends: [{
      friend_member_id: "friend-a",
      nickname: "서연",
      profile_image: null,
      goals: [{
        goal_id: 1,
        slug: "run",
        title: "이번 달에는 세 번씩 달릴게",
        due_date: "2026-12-01",
        cover_preset_key: "c1",
        cover_public_path: null,
        cover_url: null,
        cheer_count: 13,
      }, {
        goal_id: 2,
        slug: "read",
        title: "매일 스무 쪽 읽을게",
        due_date: "2026-11-20",
        cover_preset_key: "c3",
        cover_public_path: null,
        cover_url: null,
        cheer_count: 7,
      }, {
        goal_id: 3,
        slug: "study",
        title: "영어 발표를 준비할게",
        due_date: "2026-12-10",
        cover_preset_key: "c5",
        cover_public_path: null,
        cover_url: null,
        cheer_count: 4,
      }],
    }],
  },
};
export const Empty: Story = { args: { friends: [] } };
