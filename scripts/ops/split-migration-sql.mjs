// 이관 SQL 을 테이블 단위 파일로 쪼갠다.
//
// 왜: 76KB 를 한 번에 운영에 적용하면 무엇이 들어갔는지 중간 확인이 안 된다.
// 테이블 하나씩 넣고 매번 행 수를 대조해야 잘못된 적재를 그 자리에서 잡는다.
//
// 쓰는 법: node scripts/ops/split-migration-sql.mjs <migrate-into-new.sql>
// 출력   : 같은 디렉터리의 steps/NN-<schema>.<table>.sql (권한 600)

import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("SQL 파일 경로를 인자로 넘겨라");
  process.exit(1);
}

const lines = readFileSync(src, "utf8").split("\n");
const stepsDir = join(dirname(src), "steps");
mkdirSync(stepsDir, { recursive: true });
chmodSync(stepsDir, 0o700);

let n = 0;
for (const line of lines) {
  if (!line.startsWith("insert into ")) continue;
  const m = line.match(/^insert into ([a-z_]+)\."([a-z_]+)"/);
  if (!m) continue;
  n += 1;
  const name = `${String(n).padStart(2, "0")}-${m[1]}.${m[2]}.sql`;
  const path = join(stepsDir, name);
  // 각 단계도 트랜잭션으로 감싼다. 실패하면 그 테이블만 통째로 되돌아간다.
  writeFileSync(path, `begin;\n${line}\ncommit;\nselect count(*) as 적재후_행수 from ${m[1]}."${m[2]}";\n`, "utf8");
  chmodSync(path, 0o600);
  const rows = (line.match(/-- (\d+)행/) || [])[1] || "?";
  console.log(`${name}  ${String(line.length).padStart(7)}바이트  ${rows}행`);
}
console.log(`\n${n}개 단계 생성: ${stepsDir}`);
