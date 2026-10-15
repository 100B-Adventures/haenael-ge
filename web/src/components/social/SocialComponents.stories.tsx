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
      relationship_direction: "I_CHEERED",
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
    }, {
      friend_member_id: "friend-b",
      nickname: "윤도경",
      profile_image: null,
      relationship_direction: "CHEERED_ME",
      goals: [{
        goal_id: 4,
        slug: "grade",
        title: "이번 학기 평점 4.0 해낼게",
        due_date: "2026-12-18",
        cover_preset_key: "c3",
        cover_public_path: null,
        cover_url: null,
        cheer_count: 12,
      }],
    }, {
      friend_member_id: "friend-c",
      nickname: "정민서",
      profile_image: null,
      relationship_direction: "MUTUAL",
      goals: [{
        goal_id: 5,
        slug: "fitness",
        title: "3개월 안에 5kg 감량 해낼게",
        due_date: "2027-01-10",
        cover_preset_key: "c4",
        cover_public_path: null,
        cover_url: null,
        cheer_count: 3,
      }],
    }],
  },
};
export const Empty: Story = { args: { friends: [] } };
