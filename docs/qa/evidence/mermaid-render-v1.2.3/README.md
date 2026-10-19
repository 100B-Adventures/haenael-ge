# mermaid 독립 렌더 증거 (설계 v1.2.3)

생성 2026-10-20. 렌더러 = `@mermaid-js/mermaid-cli`(mmdc) + 실제 Chrome(Puppeteer). mermaid 파서 통과가 아니라 **SVG 산출까지** 확인했다.

```
node_modules/.bin/mmdc -p pup.json -i <block>.mmd -o <block>.svg
executablePath = /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

| 종류 | 블록 수 | SVG 총 바이트 |
|---|---:|---:|
| flowchart | 10 | 2,194,207 |
| sequenceDiagram | 3 | 610,625 |
| erDiagram | 2 | 628,129 |
| **합계** | **15** | **3,432,961** |

**15/15 렌더 성공. 실패 0.** 전부 `<svg` 루트로 시작한다. 구조 규격이 요구하는 3종(아키텍처 flowchart · ERD erDiagram · 플로우 sequenceDiagram)이 모두 포함된다.

## 파일 목록

- `01_fdd-_1_erDiagram.svg`  335838바이트
- `02_fdd-_2_flowchart.svg`  211940바이트
- `03_fdd-_3_sequenceDiagram.svg`  196983바이트
- `04_fdd-_4_sequenceDiagram.svg`  199735바이트
- `05_arch_1_flowchart.svg`  201538바이트
- `06_arch_2_flowchart.svg`  201709바이트
- `07_arch_3_flowchart.svg`  231372바이트
- `08_arch_4_flowchart.svg`  242615바이트
- `09_arch_5_flowchart.svg`  215771바이트
- `10_arch_6_sequenceDiagram.svg`  213907바이트
- `11_arch_7_flowchart.svg`  239699바이트
- `12_arch_8_flowchart.svg`  233513바이트
- `13_arch_9_flowchart.svg`  214870바이트
- `14_erd-_1_erDiagram.svg`  292291바이트
- `15_test_1_flowchart.svg`  201180바이트
