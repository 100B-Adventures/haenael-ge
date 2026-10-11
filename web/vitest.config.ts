import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": resolve(__dirname, "src"),
          },
        },
        test: {
          name: "web",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["node_modules", ".next"],
        },
      },
      {
        test: {
          name: "edge-security",
          environment: "node",
          include: [
            "../supabase/functions/_shared/toss-webhook-handler.security.test.ts",
            "../supabase/functions/auth-kakao/security.test.ts",
          ],
          exclude: ["node_modules"],
        },
      },
    ],
  },
});
