import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const sourceRoot = new URL("../src/", import.meta.url).pathname;
const forbidden = [
  { name: "SSR 또는 Next.js 의존", pattern: /react-dom\/server|renderToString|getServerSideProps|from\s+["']next\// },
  { name: "결제 또는 환전 surface", pattern: /cheer-order|toss-confirm|cashout|checkoutPayment|TossPay/ },
  { name: "외부 웹 이동", pattern: /openURL|href\s*=\s*["']https?:\/\// },
  { name: "카카오 로그인", pattern: /auth-kakao|kakaoLogin|Kakao\.Auth/ },
];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if ([".ts", ".tsx", ".css"].includes(extname(entry.name)) && !entry.name.includes(".test.")) files.push(path);
  }
  return files;
}

const violations = [];
for (const file of await collect(sourceRoot)) {
  const source = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) violations.push(`${rule.name}: ${relative(sourceRoot, file)}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("PASS: SSR, 외부 웹, 카카오 로그인, 결제·환전 의존 0건");
