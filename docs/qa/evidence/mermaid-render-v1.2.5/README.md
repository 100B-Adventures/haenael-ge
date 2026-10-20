# mermaid 독립 렌더 증거 (설계 v1.2.5)

생성 2026-10-20. 렌더러 = `@mermaid-js/mermaid-cli`(mmdc) + 실제 Chrome(Puppeteer).

**파서 통과가 아니라 SVG 산출까지 확인했다.** jsdom 파서만으로는 부족하다: `mermaid.parse()` 는 통과해도 레이아웃 단계에서 `getBBox` 가 없어 SVG 가 안 나온다(15/15 실패를 실제로 봤다).

**직렬 실행 + 1회 재시도로 돌린다.** 병렬로 15개를 동시에 돌리면 Chrome 인스턴스가 경합해 2건이 실패했고, 그 2건을 단독으로 다시 돌리니 각각 23만 바이트 SVG 가 나왔다. **즉 문법 결함이 아니라 자원 경합이었다.** 그 구분을 못 하면 멀쩡한 다이어그램을 고치려 든다.

```
for m in blocks/*.mmd; do mmdc -p pup.json -i $m -o out/$(basename $m .mmd).svg; done   # 직렬
executablePath = /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

| 종류 | 블록 | SVG 바이트 |
|---|---:|---:|
| flowchart (시스템 구성·인증 흐름) | 10 | 2,193,886 |
| sequenceDiagram (초대 수락·커버 승인) | 3 | 610,625 |
| erDiagram (데이터 구조) | 2 | 628,047 |
| **합계** | **15** | **3,432,558** |

**15/15 렌더 성공. 실패 0. 전부 `<svg` 루트.** 구조 규격이 요구하는 3종이 모두 포함된다.

## 파일 목록

- `01_fdd-_1_erDiagram.svg`  335810바이트
- `02_fdd-_2_flowchart.svg`  211940바이트
- `03_fdd-_3_sequenceDiagram.svg`  196983바이트
- `04_fdd-_4_sequenceDiagram.svg`  199735바이트
- `05_arch_1_flowchart.svg`  201538바이트
- `06_arch_2_flowchart.svg`  201709바이트
- `07_arch_3_flowchart.svg`  231393바이트
- `08_arch_4_flowchart.svg`  242615바이트
- `09_arch_5_flowchart.svg`  215771바이트
- `10_arch_6_sequenceDiagram.svg`  213907바이트
- `11_arch_7_flowchart.svg`  239699바이트
- `12_arch_8_flowchart.svg`  233513바이트
- `13_arch_9_flowchart.svg`  214528바이트
- `14_erd-_1_erDiagram.svg`  292237바이트
- `15_test_1_flowchart.svg`  201180바이트
