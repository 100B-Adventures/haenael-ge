import type { Meta, StoryObj } from "@storybook/react-vite";
import { PageShell } from "./PageShell";

const meta = { title: "Miniapp/PageShell", component: PageShell } satisfies Meta<typeof PageShell>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Friends: Story = { args: { activePath: "/friends", title: "친구들이 해내는 중", subtitle: "과정만 조용히 보여요.", children: <div className="state-card">콘텐츠 영역</div> } };
