import type { Meta, StoryObj } from "@storybook/react-vite";

function Tokens() {
  const colors = ["background", "surface", "ink", "muted", "warm", "clover", "clover-soft", "danger-soft"];
  return <div><h1>해낼게 미니앱 토큰</h1><div className="token-grid">{colors.map((color) => <div className={`token-chip token-${color}`} key={color}><span />{color}</div>)}</div></div>;
}

const meta = { title: "Design System/Tokens", component: Tokens } satisfies Meta<typeof Tokens>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Gallery: Story = {};
