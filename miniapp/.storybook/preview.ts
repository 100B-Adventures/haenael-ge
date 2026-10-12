import type { Preview } from "@storybook/react-vite";
import "../src/theme.css";
import "../src/App.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { default: "warm" },
  },
};

export default preview;
