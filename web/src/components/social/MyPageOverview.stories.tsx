import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MyPageOverview } from "./MyPageOverview";

const meta = {
  title: "Social/MyPageOverview",
  component: MyPageOverview,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="receiver-page-frame w-screen max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MyPageOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

const normal = {
  profile: { nickname: "서연", profile_image: null },
  goals: [{
    goal_id: 1,
    slug: "run",
    title: "이번 달 세 번씩 달리기",
    due_date: "2026-12-01",
    status: "ACTIVE" as const,
    cover_preset_key: "c1",
  }],
  friend_count: 3,
  achievements: {
    completed_goal_count: 2,
    received_cheer_count: 7,
    connected_friend_count: 3,
  },
  belonging_queue: [{
    friend_member_id: "friend-a",
    nickname: "도경",
    goal_id: 2,
    slug: "study",
    title: "이번 시험 두 과목 A 받기",
    due_date: "2026-12-20",
    cover_preset_key: "c3",
  }],
};

const initialPreferences = { notifyCheer: true, notifyMarketing: false };

export const Normal: Story = { args: { dashboard: normal, initialPreferences } };

export const Empty: Story = {
  args: {
    dashboard: {
      profile: { nickname: null, profile_image: null },
      goals: [],
      friend_count: 0,
      achievements: {
        completed_goal_count: 0,
        received_cheer_count: 0,
        connected_friend_count: 0,
      },
      belonging_queue: [],
    },
    initialPreferences,
  },
};

export const Overflow: Story = {
  args: {
    dashboard: {
      ...normal,
      goals: Array.from({ length: 6 }, (_, index) => ({
        ...normal.goals[0],
        goal_id: index + 1,
        slug: `goal-${index + 1}`,
        title: `${index + 1}번째 오래된 목표 제목이 두 줄을 넘지 않도록 확인하기`,
      })),
      belonging_queue: Array.from({ length: 8 }, (_, index) => ({
        ...normal.belonging_queue[0],
        friend_member_id: `friend-${index + 1}`,
        goal_id: index + 10,
        slug: `friend-goal-${index + 1}`,
      })),
    },
    initialPreferences,
  },
};
