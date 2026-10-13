import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = { title: "Miniapp/Button", component: Button, tags: ["autodocs"] } satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { children: "토스로 시작하기", variant: "primary" } };
export const Secondary: Story = { args: { children: "친구 초대하기", variant: "secondary" } };
export const Disabled: Story = { args: { children: "다음", disabled: true } };
export const Loading: Story = { args: { children: "저장하기", loading: true } };
