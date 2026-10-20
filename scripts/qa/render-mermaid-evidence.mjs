import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(new URL("../..", import.meta.url).pathname);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outputDir = join(repo, "docs/qa/evidence/mermaid-render-v1.2.5");
const inputs = [
  ["fdd-", "docs/eng-design/fdd-social-viral-loop-web-first-v1.2.5.md"],
  ["arch", "docs/eng-design/architecture-social-viral-loop-web-first-v1.2.5.md"],
  ["erd-", "docs/eng-design/erd-social-viral-loop-web-first-v1.2.5.md"],
  ["test", "docs/eng-design/test-plan-social-viral-loop-web-first-v1.2.5.md"],
];
const tempDir = mkdtempSync(join(tmpdir(), "haenael-mermaid-"));
const puppeteerConfig = join(tempDir, "puppeteer.json");
writeFileSync(puppeteerConfig, JSON.stringify({ executablePath: chrome, headless: true }));

const rendered = [];
let globalIndex = 0;
try {
  for (const [prefix, relativePath] of inputs) {
    const source = readFileSync(join(repo, relativePath), "utf8");
    const blocks = [...source.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];
    blocks.forEach((match, sourceIndex) => {
      globalIndex += 1;
      const diagram = match[1].trim();
      const kind = diagram.split(/\s+/)[0];
      const stem = `${String(globalIndex).padStart(2, "0")}_${prefix}_${sourceIndex + 1}_${kind}`;
      const input = join(tempDir, `${stem}.mmd`);
      const output = join(outputDir, `${stem}.svg`);
      writeFileSync(input, `${diagram}\n`);
      const result = spawnSync(
        "npx",
        ["--yes", "@mermaid-js/mermaid-cli@11.12.0", "-p", puppeteerConfig, "-i", input, "-o", output],
        { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );
      if (result.status !== 0) {
        throw new Error(`mmdc_failed:${stem}:${result.stderr.slice(-500)}`);
      }
      const svg = readFileSync(output, "utf8");
      if (!svg.includes("<svg")) throw new Error(`svg_root_missing:${stem}`);
      rendered.push({ file: `${stem}.svg`, kind, bytes: statSync(output).size });
    });
  }
  if (rendered.length !== 15) throw new Error(`mermaid_block_count:${rendered.length}`);
  console.log(JSON.stringify({ rendered: rendered.length, files: rendered }));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
