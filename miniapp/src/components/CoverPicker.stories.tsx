import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CoverPreset } from "../domain";
import { CoverPicker } from "./CoverPicker";

const meta = { title: "Miniapp/CoverPicker", component: CoverPicker } satisfies Meta<typeof CoverPicker>;
export default meta;
type Story = StoryObj<typeof meta>;

function InteractivePicker() {
  const [value, setValue] = useState<CoverPreset>("c1");
  return <CoverPicker value={value} onChange={setValue} />;
}

export const Interactive: Story = {
  args: { value: "c1", onChange: () => undefined },
  render: () => <InteractivePicker />,
};
