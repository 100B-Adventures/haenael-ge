import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const colorTokens = [
  "--background", "--foreground", "--card", "--border", "--warm", "--muted-foreground",
  "--faint", "--primary", "--clover-bright", "--accent", "--accent-foreground",
  "--destructive", "--danger-soft", "--danger-ink", "--amber", "--amber-soft",
  "--amber-line", "--amber-ink",
];
const spacingTokens = ["--space-mobile-gutter", "--space-page-y", "--space-bottom-safe"];
const radiusTokens = ["--radius-control", "--radius-card", "--radius-sheet"];
const typeTokens = [
  "--text-wordmark", "--text-goal-title", "--text-page-title-mobile",
  "--text-page-title-desktop", "--text-body-description", "--text-label-small", "--text-meta-micro",
];

function TokenGallery() {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const computed = getComputedStyle(document.documentElement);
    setValues(Object.fromEntries(
      [...colorTokens, ...spacingTokens, ...radiusTokens, ...typeTokens]
        .map((token) => [token, computed.getPropertyValue(token).trim()]),
    ));
  }, []);

  return (
    <main className="min-h-svh bg-background p-8 text-foreground">
      <h1 className="receiver-page-title">DESIGN.md v2.0.0 토큰 갤러리</h1>
      <section className="mt-8">
        <h2 className="text-lg font-bold">Colors</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {colorTokens.map((token) => (
            <div key={token} className="overflow-hidden rounded-md border border-border bg-card">
              <div className="h-16" style={{ background: `var(${token})` }} />
              <div className="p-3 text-xs"><strong>{token}</strong><p className="mt-1 text-muted-foreground">{values[token]}</p></div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        <div><h2 className="text-lg font-bold">Spacing</h2>{spacingTokens.map((token) => <p key={token} className="mt-2 text-sm">{token}: {values[token]}</p>)}</div>
        <div><h2 className="text-lg font-bold">Radius</h2>{radiusTokens.map((token) => <div key={token} className="mt-3 border border-border bg-card p-3" style={{ borderRadius: `var(${token})` }}>{token}: {values[token]}</div>)}</div>
        <div><h2 className="text-lg font-bold">Typography</h2>{typeTokens.map((token) => <p key={token} className="mt-2" style={{ fontSize: `var(${token})` }}>{token}: {values[token]}</p>)}</div>
      </section>
    </main>
  );
}

const meta = {
  title: "Design System/Tokens",
  component: TokenGallery,
} satisfies Meta<typeof TokenGallery>;

export default meta;
type Story = StoryObj<typeof meta>;
export const AllTokens: Story = {};
