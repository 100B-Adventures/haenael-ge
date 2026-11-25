import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const staticRoot = path.join(process.cwd(), ".next", "static");
const forbiddenSyntax = [
  { label: "class static block", pattern: /static\s*\{/, token: "static{" },
  { label: "positive lookbehind", pattern: /\(\?<=/, token: "(?<=" },
  { label: "negative lookbehind", pattern: /\(\?<!/, token: "(?<!" },
];

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

const files = collectJavaScriptFiles(staticRoot);
if (files.length === 0) {
  console.error(`BROWSER_SYNTAX_NO_INPUT ${path.relative(process.cwd(), staticRoot)}`);
  process.exit(1);
}

const findings = files.flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return forbiddenSyntax
    .filter(({ pattern }) => pattern.test(source))
    .map(({ label, token }) => ({ file: path.relative(process.cwd(), file), label, token }));
});

if (findings.length > 0) {
  for (const finding of findings) {
    console.error(
      `BROWSER_SYNTAX_FORBIDDEN ${finding.label} ${finding.token} ${finding.file}`,
    );
  }
  process.exit(1);
}

console.log(`BROWSER_SYNTAX_OK files=${files.length} forbidden=0 target=safari15,ios_saf15`);
