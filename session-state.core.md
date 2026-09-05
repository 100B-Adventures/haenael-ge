## CLAUDE 라벨 핀 정리 완료 — 미해결 34 → 1 (2026-09-06 06:05 KST)

### 지금까지 한 것
- **대시보드 미해결이 실질 1건으로 줄었다**(세션 시작 시점 34건).
  - **실경로화 5건** — 이름표였던 핀을 같은 대상의 실제 파일로 교체. 정본을 바꾼 게 아니라 가리키는 방식만 고쳤다.
    - haejo-danta `design: core-v7-proto-hub-v1` → `docs/prototype/v7/core-hub-v7-opus5.html`(2026-09-05 승인된 v7 허브)
    - haejo-danta `discovery: v1.1.0-11종` → `docs/discovery/시장경쟁분석.md`
    - blog-premium `eng-design-adr: launch-v4-vercel-neon-auth` → `docs/launch-mvp/eng-design-decision-record-v4-vercel-neon-auth.md`
    - blog-premium `plan-review: launch-v1.1` → `docs/launch-mvp/blog-premium-launch-plan-review-v1-claude-opus.md`
    - blog-premium `home: A-curated-trustline` → `prototypes/glutmat-home-variants/index.html`(회장 홈 픽 A)
  - **결함 아님으로 분리 4건** — 상태파일이 스스로 "이름표·파일 없음"이라 적은 3건(d-edu prd_v1_0·user-flow·measurement)과 도커 이미지 태그 1건(d-edu release_image). 결함과 같이 세면 진짜 고칠 것이 묻힌다. 수집기에 `labelOnly` 분류 추가.
  - **남은 실제 결함 1건** = `d-edu::mvp-e::qa_smoke`. 핀이 가리키는 `scripts/qa/prod-smoke.sh` 가 d-edu 저장소에 없다(deep find 0건). 파일 미커밋이거나 핀 오류이며 **d-edu 세션이 판단할 사안**이라 대체 후보를 임의로 넣지 않았다.
- **`tsc -b` 통과 복구.** `collect-harness-details.mjs` 방출 타입에 `callers?: string[]` 추가, `ArtifactSlotKey` 유니온에 `'audit'` 추가. 근본 수정은 생성기 쪽.
- 검증: `artifact-discovery.test.mjs` **16/16**, `venture-paths.test.mjs` **2/2**, `npx tsc -b` exit 0, `vite build --mode private` exit 0, 스모크 **PASS**(버튼 연인원 1,310·유니크 309).

### 남은 이슈
1. **P0 환전 접근 범위 = 회장 결정 대기.** D-017 집행 여부. 회장이 실제 회원 성공을 확인한 것과 충돌해 임의로 닫지 않았다.
2. P1 16건 = build 단계 작업(감사 세션 소유). 스키마·화면 동시 변경이라 설계 합의가 앞선다.
3. `d-edu::mvp-e::qa_smoke` 핀 = d-edu 세션.
4. 토스 지급대행 해지 미실행(회장 물리 영역).

### 다음 액션
1. **소유자: 회장.** 환전 접근 범위 결정. **종료증거:** 결정 기록 후 코드 반영 또는 D-017 개정.
2. **소유자: 감사·build 담당 세션.** P1 16건 처리. **종료증거:** 감사 재실행에서 해당 항목 소멸.
3. **소유자: d-edu 세션.** `prod-smoke.sh` 커밋 또는 핀 교정. **종료증거:** 수집기 실제 결함 0.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 목표 잔여 정리: 타입 정합 + 라벨 핀 후보 귀띔 (2026-09-06 05:45 KST)

### 지금까지 한 것
- **멈춰 있던 백그라운드 13건 전부 종료.** 전부 오래전 Vercel 배포 확인용 `until` 루프였고 그 배포는 이미 끝나 조건이 영원히 안 맞는 상태였다. 내가 걸고 끄지 않은 것이 목표 평가를 367분 붙잡았다.
- **★`tsc -b` 통과 복구(SJ_BRAIN_wiki `726d828`).** ①`collect-harness-details.mjs` 가 `callers` 를 내보내면서 타입에는 안 넣어 `TS2353` 3건+ ②내가 만든 `audit` 슬롯이 `ArtifactSlotKey` 유니온에 없어 `TS2322` 3건. **둘 다 해소, `npx tsc -b` exit 0.** 근본 수정은 생성기 쪽에 했다(생성 파일 직접 편집 아님).
- **라벨 핀에 디스크 후보 귀띔 추가.** 값이 라벨이라 못 찾은 핀은 이제 미해결 사유에 `후보: <경로>` 를 함께 적는다. 실제로 3건이 유효 후보를 얻었다.
  - `haejo-danta::core::prototype`(`core-v7-proto-hub-v1`) → `docs/prototype/haejo-mvp-proto-hub-v1-fable5.html`
  - `blog-premium::launch-mvp::eng-design-adr`(`launch-v4-vercel-neon-auth`) → `docs/launch-mvp/eng-design-decision-record-v4-vercel-neon-auth.md`
  - `blog-premium::launch-mvp::plan-review` 는 후보가 어긋나(`wongoryo-launch-phase-roadmap-v1.md`) 참고용.
  - **자동 선택은 하지 않았다.** 무엇을 정본으로 삼을지는 그 벤처가 정할 일이고, 이름 비슷하다고 대신 고르면 이번에 고친 그 사고(라벨≠파일명 오탐)가 되돌아온다.
- 검증: `artifact-discovery.test.mjs` **16/16**, `venture-paths.test.mjs` **2/2**, `vite build --mode private` exit 0, 스모크 **PASS**(버튼 연인원 1,311·유니크 310).

### 남은 이슈
1. **P0 환전 접근 범위 = 회장 결정 대기.** D-017(세무 자문 전 회장 계정 한정) 집행 여부. 회장이 실제 회원 성공을 확인한 것과 충돌해 임의로 닫지 않았다.
2. P1 16건 = build 단계 작업(감사 세션 소유). 제품 UI·스키마 변경이라 디자인·설계 합의가 앞선다.
3. 라벨 핀 10건 = 각 벤처 세션이 후보를 보고 확정.
4. 토스 지급대행 해지 미실행(회장 물리 영역).

### 다음 액션
1. **소유자: 회장.** 환전 접근 범위 결정. **종료증거:** 결정 기록 후 코드 반영 또는 D-017 개정.
2. **소유자: 감사·build 담당 세션.** P1 16건 처리. **종료증거:** 감사 재실행에서 해당 항목 소멸.
3. **소유자: 각 벤처 세션.** 라벨 핀을 후보 경로로 확정. **종료증거:** 수집기 미해결 0.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 감사 보고서 대시보드 노출 + 산출물 목표 완결 (2026-09-06 01:30 KST)

### 지금까지 한 것
- **감사 보고서를 대시보드에서 열 수 있게 했다.** build 재오픈의 근거 문서인데 상태파일 주석에만 있어 클릭이 불가했다. ①`pipeline-state.core.md` qa 블록에 승인 핀 추가 ②대시보드에 **`audit` 표준 슬롯 신설**(`STAGE_ARTIFACT_SSOT` 검증 단계 + `ARTIFACT_KEY_ALIASES`) ③수집기 슬롯 추론에 audit 규칙 추가. **실측: 대시보드에서 클릭 → 원문 모달 렌더 확인**(캡처 Read 대조, 제목·STAMP·P1 표까지 표시).
- **해낼게 산출물 36건, 미해결 0.** 승인 핀 33 + 마이그레이션 glob 확장 3.
- 전체 벤처 미해결 **34 → 10건**(모두 파일 부재·도커 태그·이름표라 해당 벤처 몫).
- 검증: `artifact-discovery.test.mjs` **16/16**, `venture-paths.test.mjs` **2/2**, `vite build --mode private` exit 0, 스모크 **PASS**(산출물 버튼 연인원 1,311·유니크 310), `artifact-drift-check.sh` **드리프트 0**.

### 남은 이슈
1. **P0 환전 접근 범위 = 회장 결정 대기.** 거버넌스 D-017(세무 자문 전 회장 계정 한정) 집행 여부. 회장이 실제 회원 성공을 확인한 것과 충돌해 세션이 임의로 닫지 않았다.
2. P1 16건 = build 단계 작업(감사 세션 소유).
3. **`src/data/harness-details.generated.ts` 타입 에러 3건**(`callers` 속성 미정의) — 다른 트랙 수집기 산출물. `tsc -b` 를 막는다. vite 빌드는 통과.
4. 토스 지급대행 해지 미실행.
5. 다른 벤처 이름표형 핀 10건.

### 다음 액션
1. **소유자: 회장.** 환전 접근 범위 결정. **종료증거:** 결정 기록 후 코드 반영 또는 D-017 개정.
2. **소유자: build 담당 세션.** P1 16건 처리. **종료증거:** 감사 재실행에서 해당 항목 소멸.
3. **소유자: harness-details 트랙.** `callers` 타입 정합. **종료증거:** `npx tsc -b` exit 0.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## ★정정: 스프린트 종결 아님 — 감사로 build 재오픈 (2026-09-05 23:40 KST)

### 지금까지 한 것
- **앞선 "스프린트 종결" 보고는 무효다.** 같은 날 다른 세션의 코드베이스 감사(`docs/qa/audit-20260905/audit-haenael-ge-v1.0.0.md`, codex/code-reviewer)가 **P0 1건·P1 16건**을 찾아 `pipeline-state.core.md` 를 **`current_stage: build`, `approved_stages: [plan, design, eng-design]`** 로 재잠금했다. 내가 쓴 종결 주석은 그 세션이 덮어썼고 그쪽이 정본이다.
- **★P0(stop-ship):** `web/src/lib/supabase/service.ts:86` + `cashout/actions.ts:94-104` — 환전이 `CASHOUT_ENABLED` 전역값만 보고 **회장 계정 allowlist 가 없다.** 거버넌스 D-017(`wiki/거버넌스/결정.md:43-50`)은 세무 자문 전까지 "환전은 회장 계정으로만 시험, 사용자에게 열지 않는다"인데 켜진 상태에서는 **로그인한 누구나 미확정 3.3% 세금 계약으로 신청 가능**. 감사 권고 = 전역 스위치 끄기 또는 서버 allowlist 강제(공수 S 긴급).
  - ⚠️ **회장 판단 필요 사유:** 회장은 직전 턴에 실제 회원 환전 성공을 직접 확인했다고 밝혔다. D-017 을 그대로 집행하면 그 경로가 닫힌다. 거버넌스와 실제 운영이 어긋난 상태라 세션이 임의로 닫지 않았다.
- 주요 P1: 다중 목표 유니크 인덱스 잔존(PRD `:196` DROP 요구와 반대), 공개범위(visibility) 스키마·뷰 필터 전무, 응원자 경험 미구현, child-safety 본문 "준비 중", 워드맵 13개 초과 회수 경로 없음, GoalCard clamp 미구현.
- **`docs/제품현황.md` 정정 완료.** 종결 서술을 재오픈 서술로 교체하고 P0 를 본문에 명시.

### 남은 이슈
1. **P0 환전 접근 범위 = 회장 결정 대기.** D-017 집행(계정 제한) vs 현행 유지 중 택일.
2. P1 16건 = build 단계 작업(다른 세션 소유).
3. 토스 지급대행 해지 미실행.
4. 다른 벤처 이름표형 핀 10건.

### 다음 액션
1. **소유자: 회장.** 환전 접근 범위 결정(D-017 집행 여부). **종료증거:** 결정 기록 후 코드 반영 또는 D-017 개정.
2. **소유자: build 담당 세션.** P1 16건 처리. **종료증거:** 감사 재실행에서 해당 항목 소멸.
3. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 대시보드 산출물 노출 정비 (2026-09-05 19:25 KST, 목표 "모든 산출물 최신 정본으로 100B 대시보드에 박고 마무리")

### 지금까지 한 것
- **해낼게 몫 완결.** 대시보드 haenael 합성키 **35건**(승인 핀 32 + 마이그레이션 glob 확장 3), **missingReason 0**, **로더 35/35**. `artifact-drift-check.sh` **드리프트 0**(`docs/제품현황.md` 갱신으로 해소).
- **★대시보드 결함 3건 발견·수정**(SJ_BRAIN_wiki `64b8355`).
  1. **경로형 핀이 표기 때문에 미검색되던 것.** `shouldResolveApprovedArtifactExactly` 가 `block-list`·`block-map` 만 정확해석하고 `inline` 은 라벨로 봐 이름 유사도 탐색으로 넘겼다. d-edu mvp-e 처럼 inline 에 실제 경로를 적은 라인이 **한글 파일명 때문에 전부 미검색**. 표기 무관 경로 모양이면 정확해석하도록 바꾸고, 값 뒤 사람용 주석(`(rev.7)`·중첩 괄호 포함)을 떼는 `pinnedPathOf` 신설. **미해결 34 → 10건.** 남은 10건은 파일 부재(`prod-smoke.sh`)·도커 태그·이름표(`v1.1.0-11종` 등)라 그 벤처 몫.
  2. **진행노트가 프로토타입 슬롯을 차지.** `docs/prototype/*/PROGRESS.md` 가 경로에 prototype 이 있다는 이유로 시안 html 을 밀어냈다(romeo main). PROGRESS·README·NOTES·TODO·CHANGELOG 를 슬롯 후보에서 제외.
  3. **스모크가 접힌 행 도트에서 멎던 것.** 안 보이는 도트를 건너뛰고 세며, 모달 검증도 특정 인덱스 대신 버튼이 뜰 때까지 훑도록 개정.
- **`HarnessView.tsx:1020` 타입 에러 해소.** 콜백 안에서 `row.jumpTo` 좁히기가 풀리던 것을 지역 상수로 받아 해결. `npx tsc -b` **exit 0**(종전 실패).
- **회귀 테스트 정비.** `artifact-discovery.test.mjs` **16/16 pass**(직전 5건은 zero-one 개명·데이터 드리프트로 이미 실패 중이던 것). 파일명을 못박던 단언을 계약 단언으로 바꾸고, `zeroOne` 경로를 `zto1-it-edu-community` 로 교정. `venture-paths.test.mjs` 2/2.
- **검증:** `vite build --mode private` **exit 0**, `check-public-bundle.mjs` OK, `headless-artifact-smoke.mjs` **PASS**(서비스 행 11, 도트 145, 산출물 버튼 연인원 620·유니크 299, 모달 body 23,890자).

### 남은 이슈
1. **다른 벤처 미해결 10건.** d-edu 4(파일 부재·도커 태그·이름표), haejo-danta 2(이름표), blog-premium 3(이름표), d-edu mvp-e user-flow 1. 핀 값을 실경로로 바꾸는 것은 그 벤처 세션 몫.
2. 토스 지급대행 해지 미실행(회장 물리 영역).
3. 디자인 토큰 위반 75건 = 기준선 등재, 디자인 검토 동반 축소 대상.
4. `docs/discovery/research-20260905/` 미추적 2건 = 다른 세션 산출물.

### 다음 액션
1. **소유자: 각 벤처 세션.** 이름표형 핀을 실경로로 교체. **종료증거:** 수집기 미해결 0.
2. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
3. **소유자: 디자인 검토 동반 작업.** 토큰 위반 75건 축소. **종료증거:** 기준선 감소와 시각 회귀 없음.

## CLAUDE 대시보드 경로 구조 개선 + 토큰 예외 정비 (2026-09-05 10:35 KST, 회장 "너가 직접해")

### 지금까지 한 것
- **100B 대시보드 미푸시 179커밋 push 완료**(`1a9e890..4e48bda`). 내 `10d03fd`(죽은 벤처 경로 수정) 포함. 종전엔 "그 저장소 소유 세션 몫"으로 넘겼는데 회장 지시로 직접 처리.
- **★대시보드 경로를 손코딩 import 에서 glob 해석으로 전환**(`86f5b7d`). 종전 `DashboardView.tsx` 는 벤처마다 `import('...pipeline-state.md?raw')` 를 손으로 적어, **한 벤처 경로가 낡으면 rollup 이 빌드를 통째로 죽여 다른 벤처 산출물까지 못 열었다**(9-02 사고의 구조적 원인). 이제 `import.meta.glob` 이 실존 파일만 잡으므로 그 항목만 빠지고 나머지는 열린다. 지목 표 `VENTURE_PIPELINE_STATE` 만 남겨 어느 파일이 정본인지 표시.
  - 조용한 실종 방지: `venture-paths.test.mjs` 두 번째 테스트를 "지목 표 대상 실존 검사"로 개정. **2/2 pass**. `vite build --mode private` **exit 0**.
  - ※ `npx tsc -b` 는 `HarnessView.tsx:1020` 에서 실패하는데 **다른 세션이 지금 편집 중인 파일**(2026-09-05 주석)이라 손대지 않았다. 내 변경과 무관.
- **디자인 토큰 예외 정비.** 카카오·구글 로고 색상 6건을 사유 주석으로 예외 처리(브랜드 가이드상 토큰화 불가). 기준선 **81 → 75건**.
  - 처음엔 JSX 여는 태그 **안에** 주석을 넣어 `TS1005` 파싱 에러를 냈다. 태그 바깥으로 옮겨 해소(`npx tsc --noEmit` clean).
  - 그 결과 예외가 안 먹는 걸 발견 → 검사기의 예외 적용 범위를 "자기 줄 + 바로 윗줄"에서 **"자기 줄 + 뒤따르는 6줄"** 로 넓혔다. 여러 줄짜리 JSX 요소는 주석이 요소 위로 갈 수밖에 없기 때문.
  - 프로브 파일로 검출 재실증(exit 1 → 제거 후 통과).
- **검증:** `npm test` **279/279**(1차 실행의 2건 실패는 부하성 5초 타임아웃, 격리 재실행·전체 재실행 모두 통과). CI `33957159357` **결론 success, 3 job 전부 통과**.

### 남은 이슈
1. **토큰 위반 75건 잔존.** 대부분 제품 UI 색상 리터럴·인라인 스타일이라 일괄 치환은 시각 회귀 위험이 있다. 디자인 검토를 낀 작업으로 남긴다.
2. 토스 지급대행 해지 미실행(평일 08:00~19:00 라이브챗, 회장 물리 영역).
3. 지급 신원·세무정보 처리 계약 = 회장 보류.
4. `HarnessView.tsx:1020` 타입 에러 = 다른 세션 작업 중. 그 세션이 닫아야 100B 전체 `tsc -b` 가 통과한다.
5. `docs/discovery/research-20260905/` 미추적 2건 = 다른 세션 산출물, 미수정.

### 다음 액션
1. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
2. **소유자: 디자인 검토 동반 작업.** 토큰 위반 75건 축소. **종료증거:** 기준선 갱신으로 건수 감소 + 시각 회귀 없음 확인.
3. **소유자: 100b 편집 중 세션.** `HarnessView.tsx` 타입 에러 해소. **종료증거:** `npx tsc -b` exit 0.
4. **소유자: 운영 시간.** 예약 점검 지속 green 관찰. **종료증거:** 다음 schedule 런 success.

## CODEX 읽기 전용 코드베이스 감사 완료, build 재오픈 (2026-09-05 17:24 KST)

### 지금까지 한 것
- 코드 수정 없이 승인 PRD·DESIGN·프로토타입, `web/src`·Supabase, 위키 53개, 기존 운영 캡처 20개를 대조했다. 감사 산출물은 `docs/qa/audit-20260905/audit-haenael-ge-v1.0.0.md`다.
- 최종 판정은 `REVIEW_VERDICT: BLOCK(MAJOR 있음)`이다. 표 기준 P0 1건, P1 16건이며 축간 중복을 합친 고유 P1 원인은 14건이다.
- P0: `wiki/거버넌스/결정.md` D-017은 세무 자문 전 환전을 회장 계정에만 제한했지만, `web/src/lib/supabase/service.ts`와 cashout action은 전역 스위치가 켜지면 모든 인증 사용자의 신청을 허용한다. 서버 allowlist가 없다.
- 주요 P1: 승인 PRD v0.4의 다중 목표·visibility·응원자 My Page·감사 메시지가 구현되지 않았고, 환전 3화면은 DB 오류를 0원·신청 없음·이력 없음으로 위장한다. 개인정보처리방침은 운영 실발송 기록이 있는 카카오·솔라피를 비활성으로 고지한다.
- 직접 실측: 운영 보호 API 3개 무인증 HTTP 401, Supabase migration local·remote 42/42 일치, Vitest 279/279 PASS, production dependency audit 0건. 기존 390/1280 캡처는 재촬영하지 않았고 auth-only 리다이렉트 이미지는 기능 정상 증거에서 제외했다.
- 종료 훅의 QA 핀 결함을 실물과 대조했다. `docs/qa-tracker.md`와 `docs/design-conformance-matrix.md`는 이미 qa 핀에 존재했지만 `pipeline-state.core.md:10`의 inline comment 때문에 linter가 블록 전체를 읽지 못했다. comment를 분리하고 glob 핀을 실파일 5개로 펼쳐 검사기가 실제 블록을 읽게 했다.
- 현재 감사가 BLOCK이고 독립 regression 산출물도 없으므로 QA 승인을 꾸며 유지하지 않았다. `build`를 재오픈하고 build·qa·ship을 승인 목록에서 제거했다. `pipeline-artifact-lint.sh`는 exit 0으로 통과했고, STAMP 결손 위생 경고 11건은 별도 후속으로 남았다.

### 남은 이슈
1. P0 환전 노출 경계를 세무 자문 전 결정대로 복구해야 한다. 돈·운영 변경이라 회장 승인과 별도 실행 세션이 필요하다.
2. 승인 PRD v0.4의 미구현 범위를 구현할지, 승인 범위에서 제외할지 plan을 reopen해 결정해야 한다.
3. 환전 오류 위장, PRIVATE 공개 경계, rate limit, timeout, 접근성·토큰 부채를 build와 QA에서 닫아야 한다.
4. QA 재승인 전 독립 regression 산출물이 필요하다. 기존 디자인·기술설계·릴리스 핀 11개에는 STAMP 결손 위생 경고가 남아 있다.
5. 위키 깨진 링크 2건과 current-state·운영 미결 원장 드리프트가 남아 있다.
6. worktree에는 이번 감사 전부터 다른 세션의 변경이 있었다. 감사 문서와 이 핸드오프 외 파일은 건드리지 않았다.

### 다음 액션
1. **소유자: root 컨트롤러 + 회장.** 일반 사용자 환전 노출을 즉시 막을지 결정하고 승인 후 실행한다. **종료증거:** 운영 스위치 OFF 또는 서버 allowlist, 일반 계정 거부 실측, D-017·약관·개인정보 문서 정합.
2. **소유자: qa-verifier.** build 수정 뒤 전체 회귀를 재실행해 독립 regression 산출물로 출고한다. **종료증거:** 기능·design-conformance·regression 3종 최신 핀과 `pipeline-artifact-lint.sh` exit 0.
3. **소유자: 각 상류 산출물 담당.** 핀 위생 경고 11개의 STAMP 실재 여부를 확인하고, 없으면 재출고한다. **종료증거:** pin lint 경고 0건.
4. **소유자: plan·eng-design 세션.** 승인 PRD 누락 범위를 재합의한다. **종료증거:** approved_artifacts와 구현 범위가 일치하고 pipeline `done` 허위가 해소됨.
5. **소유자: code-builder·qa-verifier.** 감사 보고서의 P1부터 실패 픽스처와 함께 처리한다. **종료증거:** 돈 오류 상태, 다중 목표·visibility·응원자 acceptance, 390/1280 인증 화면 실측이 모두 green.

## CLAUDE 운영 점검 자동화 green (2026-09-03 06:20 KST, 회장 "그냥 승인하니까 너가 직접해")

### 지금까지 한 것
- **시크릿 5종 재등록 완료.** `gh secret set` 에서 `--body` 를 빼고 stdin 파이프로 전달. 등록 시 길이를 함께 출력해 검증: URL 40 / ANON_KEY 208 / EMAIL 40 / PASSWORD 46 / EXPECTED_USER_ID 36. 앞선 판의 길이 1(`-`) 사고와 구분된다.
- **`Production Read-only E2E` 수동 실행 `33684338780` = success.** 이로써 매일 도는 운영 읽기 점검이 실제로 통과하는 것을 관찰했다. 종전 실패 2건(`33570347606` 시크릿 부재, `33663313883` 값 `-`)은 모두 해소.
- `pipeline-state.core.md` 종결 주석에서 "잔여 비차단 1건" 문구를 제거하고 green 근거로 교체. **차단 잔여 없음.**

### 남은 이슈
1. 토스 지급대행 해지 미실행(평일 08:00~19:00 라이브챗).
2. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).
3. 대시보드 벤처 경로가 수집기·뷰 두 곳에 중복 하드코딩(100b 트랙 몫). `venture-paths.test.mjs` 로 재발은 막아둠.
4. 디자인 토큰 위반 기존 81건 = 기준선 등재 상태, 축소 대상.
5. 100B 대시보드 커밋 `10d03fd` 는 원격 push 미실행(그 저장소 소유 세션 몫).

### 다음 액션
1. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
2. **소유자: 100b 트랙.** 벤처 경로 단일 진실원화. **종료증거:** 수집기와 뷰가 같은 상수를 참조.
3. **소유자: 다음 작업 세션.** 토큰 위반 81건 축소. **종료증거:** 기준선 갱신으로 건수 감소.
4. **소유자: 실제 운영.** 예약 스케줄 런이 자동으로 green 유지되는지 관찰. **종료증거:** 다음 schedule 런 success.

## CLAUDE 시크릿 등록 1차 실패(gh --body 오용) (2026-09-03 02:55 KST)

### 지금까지 한 것
- 회장이 `zsh /tmp/setsec.sh` 를 실행해 시크릿 5종이 등록됐고 `gh secret list` 에 5건이 떴다. 그러나 **값이 전부 문자열 `-` 였다.**
  - 원인: 컨트롤러가 스크립트에 `gh secret set "$n" --body -` 를 썼다. gh 의 `--body` 는 **값을 그대로 받는 옵션**이라 `-` 를 stdin 기호가 아니라 리터럴로 저장한다. `gh secret set --help` 확인: *"The value for the secret (reads from standard input if not specified)"*. 즉 stdin 을 쓰려면 `--body` 를 **빼야** 한다.
  - 증상: `Production Read-only E2E` 수동 실행 `33663313883` **failure**, `TypeError: Invalid URL` (spec:118 `new URL(supabaseUrl)`). 로컬 값 자체는 정상(길이 40, `https://` 시작, `supabase.co` 끝, 공백·따옴표 없음)이라 값이 아니라 등록 방식 문제였다.
- `/tmp/setsec.sh` 를 `--body` 제거 + 파이프 방식으로 고쳤고, 등록 후 길이를 함께 찍어 `-`(길이 1) 로 들어가는 사고를 눈으로 잡게 했다. **재실행은 회장 몫**(컨트롤러의 `gh secret set` 은 classifier 차단).

### 남은 이슈
1. **시크릿 5종 재등록 필요.** 현재 저장소에는 값이 `-` 로 들어가 있다. 재실행 전까지 예약 워크플로는 계속 실패한다.
2. 토스 지급대행 해지 미실행.
3. 대시보드 벤처 경로 수집기·뷰 중복 하드코딩(100b 트랙 몫).
4. 토큰 위반 기존 81건은 기준선 등재 상태, 축소 대상.

### 다음 액션
1. **소유자: 회장.** `! zsh /tmp/setsec.sh` 재실행. **종료증거:** 각 항목 옆 길이가 1이 아닌 실제 길이로 찍힘.
2. **소유자: 세션.** 예약 워크플로 재실행·통과 확인. **종료증거:** `Production Read-only E2E` 런 success.
3. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
4. **소유자: 100b 트랙.** 벤처 경로 단일 진실원화. **종료증거:** 수집기와 뷰가 같은 상수를 참조.

## CLAUDE 스프린트 종결 + 백로그 3건 실행 (2026-09-03 02:05 KST, 회장 "진행해")

### 지금까지 한 것
- **스프린트 종결 기록.** `pipeline-state.core.md` `current_stage: done` 주석에 종결 근거를 박았다. 마지막 미검증이던 실제 회원 환전 성공은 **회장 직접 확인**(2026-09-02)으로 닫혔고, CI 도 최초 green(run `33646162280`, 3 job 전부 success).
- **`pay-open` worktree 정리 완료.** 미커밋 59건을 `wt-pay-open` 브랜치에 커밋(`6b6c40d`)해 보존한 뒤 `git worktree remove` 로 제거. **아무것도 지우지 않았다** — 브랜치에 그대로 살아 있다. `git worktree list` 는 이제 main 하나뿐.
- **★전역 디자인 토큰 검사기 신설** `scripts/qa/design-token-lint.mjs`. 색상 리터럴(hex·rgb·hsl)과 인라인 `style={{` 를 web/src 전역 130파일에서 검사. **기존 81건은 기준선(baseline)에 기록하고 "신규 위반"만 실패**시킨다(전면 금지는 매번 빨간불이라 아무도 안 보게 된다). 영구 예외는 `design-token-lint-allow: <사유>` 주석으로만 허용 — 사유 없는 예외는 통과 못 한다.
  - **동작 실증:** 일부러 `#ff0000` 파일을 심어 exit 1·해당 줄 지목 확인, 제거 후 통과 확인.
  - `npm run qa:design-tokens` 로 등록하고 **CI `단위 테스트 + 빌드` job 에 단계 추가**(`.github/workflows/ci.yml`, `npm test` 앞).
- **운영 점검 시크릿 등록은 실행 못 했다.** `gh secret set` 이 auto mode classifier 에 차단됐다. 회장이 직접 등록하거나 권한을 열어야 한다.

### 남은 이슈
1. **운영 점검 시크릿 5종 미등록.** `QA_PRODUCTION_SUPABASE_URL`·`_ANON_KEY`·`_EMAIL`·`_PASSWORD`·`_EXPECTED_USER_ID`. `gh secret list` 0건. 값은 `~/.sj-agent-harness/secrets/haenael-ge-qa-production.env` 에 존재. 등록 전까지 예약 워크플로 `Production Read-only E2E` 는 매일 실패한다.
2. 토스 지급대행 해지 미실행(평일 08:00~19:00 라이브챗).
3. 지급 신원·세무정보 처리 계약 = 회장 보류.
4. 대시보드 벤처 경로가 수집기·뷰 두 곳에 중복 하드코딩(100b 트랙 몫). 이번엔 `venture-paths.test.mjs` 로 막아뒀다.
5. 토큰 위반 기존 81건은 기준선에 담긴 상태 — 줄여나갈 대상.

### 다음 액션
1. **소유자: 회장.** 운영 점검 시크릿 5종 등록. **종료증거:** `Production Read-only E2E` 예약 런 success.
2. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
3. **소유자: 100b 트랙.** 벤처 경로 단일 진실원화. **종료증거:** 수집기와 뷰가 같은 상수를 참조.
4. **소유자: 다음 작업 세션.** 토큰 위반 81건 축소. **종료증거:** 기준선 갱신으로 건수 감소.

## CLAUDE CI 실측 + 운영 E2E 시크릿 부재 발견 (2026-09-03 00:15 KST)

### 지금까지 한 것
- **GitHub Actions 무료분이 복구됐다.** 8-31 까지 전 job 이 steps 0개로 즉시 종료되던 것과 달리, `33566526828`(9-01 22:29) 은 **success**, 이후 push 도 정상 실행. 종전 "CI green 없음"의 원인(무료 2,000분 소진)이 해소됨.
- **★ 예약 워크플로 `Production Read-only E2E` 가 실패 중이다(`33570347606`, 9-01 23:17).** 원인은 제품 결함이 아니라 **저장소 시크릿 전무**: `gh secret list` **0건**인데 `production-readonly-e2e.yml:44-48` 이 `QA_PRODUCTION_SUPABASE_URL`·`_ANON_KEY`·`_EMAIL`·`_PASSWORD`·`_EXPECTED_USER_ID` 5종을 요구한다. 실패 메시지 = `QA_PRODUCTION_SUPABASE_URL 미설정. 운영 인증 경로를 SKIP하지 않고 실패 처리한다.`(spec:43 `requiredEnv`). 값은 로컬 `~/.sj-agent-harness/secrets/haenael-ge-qa-production.env` 에 이미 있다(§4.5 이중 관리의 GitHub 쪽만 비어 있음). **시크릿 등록은 회장 승인 사항이라 미실행.**
- **직전 push `87cd14f` 의 CI 런 `33646162280` = 결론 success.** 3개 job 전부 통과(`단위 테스트 + 빌드`·`배포 환경·환전 층간 계약`·`환전 브라우저 E2E`). **이 저장소에서 CI green 을 실제로 관찰한 것은 이번이 처음이다**(종전엔 무료분 소진으로 steps 0개 종료).

### 남은 이슈
1. **스프린트 종료 판정 = 회장.** 실제 회원 환전 성공은 회장 직접 확인으로 닫힘.
2. **운영 E2E 시크릿 5종 등록 = 회장 승인 필요.** 등록 전까지 이 예약 워크플로는 계속 실패한다.
3. **`pay-open` worktree = 회장 결정.** 미커밋 59건.
4. **전역 토큰 준수 검사기 부재.** 다음 스프린트.
5. 토스 지급대행 해지 미실행.
6. 지급 신원·세무정보 처리 계약 = 회장 보류.
7. 대시보드 벤처 경로가 수집기·뷰 두 곳에 중복 하드코딩(100b 트랙 몫).

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정. **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** 운영 E2E 시크릿 5종 등록 승인. **종료증거:** `Production Read-only E2E` 예약 런 success.
3. **소유자: 회장.** `pay-open` worktree 처리. **종료증거:** 저장소 clean.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
5. **소유자: 다음 스프린트.** 전역 토큰 준수 검사기 신설. **종료증거:** 검사 스크립트와 위반 0 리포트.
6. **소유자: 100b 트랙.** 벤처 경로 단일 진실원화. **종료증거:** 수집기·뷰가 같은 상수를 참조.

## CLAUDE 대시보드 렌더 차단 결함 해소 + 환전 성공 회장 확인 (2026-09-02 08:20 KST, 회장 "환전 성공확인했었고 모든산출물 최신정본 잘 렌더링되게 박혀있어?")

### 지금까지 한 것
- **회장이 실제 환전 성공을 직접 확인했다고 밝혔다.** 스프린트 유일 미검증 항목이던 "실제 회원 환전 성공"이 회장 직접 관찰로 닫혔다. 컨트롤러의 운영 DB 재조회는 auto mode classifier 에 차단돼 별도 관찰은 못 했다(회장 관찰이 상위 증거).
- **핀 32건 전수 실재 확인.** glob 2건(`supabase/migrations/2026082*.sql` 4매치, `qa/contracts/*.json` 1매치) 포함 전부 해석됨. 누락 0.
- **대시보드 생성 데이터 정상:** haenael 합성키 **32**, missingReason **0**, 32/32 전부 `load` 로더 보유, 프로토타입 2종·QA 리포트 v2 정상 매핑.
- **★렌더 차단 결함 2건 발견·해소 (해낼게 산출물이 안 열리던 진짜 원인).** private 빌드가 rollup `Could not resolve` 로 죽어 있었다. 빌드가 죽으면 **벤처 무관 전 산출물이 안 열린다.**
  1. `zero-one` 레포가 `zto1-it-edu-community` 로 개명됐는데 `collect-artifacts.mjs:29` VENTURE_ROOTS 와 `DashboardView.tsx:424` 하드코딩 import 가 옛 이름에 남아 있었다.
  2. `DashboardView.tsx` 의 `openclaw-auto` → `pipeline-state.osmu.md` import 는 **그 레포에 그 파일이 존재한 적이 없다**(deep find 0건). 경로를 지어내지 않고 항목을 제거했다.
- **재발 방지 회귀 테스트 신설:** `scripts/venture-paths.test.mjs` — ①VENTURE_ROOTS 전 경로 실재 ②DashboardView 의 `?raw` import 전건 실재. 이 테스트가 결함2를 실제로 잡아냈다(1차 pass 1/fail 1 → 수정 후 **2/2 pass**). 경로 하나가 낡으면 대시보드 전체가 멎는 구조라 이빨로 고정.
- 검증: `npx tsc -b` **exit 0**.

### 남은 이슈
1. **스프린트 종료 판정 = 회장.** 환전 성공 확인으로 마지막 미검증이 닫혔다. 공정·증거 모두 종료 가능.
2. **`pay-open` worktree = 회장 결정.** 미커밋 59건 때문에 임의 제거 불가.
3. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0.
4. **전역 토큰 준수 검사기 부재.** 다음 스프린트.
5. 토스 지급대행 해지 미실행.
6. 지급 신원·세무정보 처리 계약 = 회장 보류.
7. 대시보드 벤처 경로가 수집기·뷰 **두 곳에 중복 하드코딩**돼 있다. 이번엔 테스트로 막았으나 단일화가 근본 해법(100b 트랙 몫).

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정. **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** `pay-open` worktree 처리. **종료증거:** 저장소 clean.
3. **소유자: 회장.** GitHub Actions 예산 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
5. **소유자: 다음 스프린트.** 전역 토큰 준수 검사기 신설. **종료증거:** 검사 스크립트와 위반 0 리포트.
6. **소유자: 100b 트랙.** 벤처 경로 단일 진실원화. **종료증거:** 수집기·뷰가 같은 상수를 참조.

## CLAUDE 스프린트 잔여 확인·종료 판정 대기 (2026-09-02 07:20 KST, 회장 "할거 다했어?")

### 지금까지 한 것
- 컨트롤러 몫 잔여 없음을 실측 확인. `git status --porcelain` 미커밋 **1건**뿐이며, 그것은 훅 `chairman-request-capture.sh` 가 회장 발화를 자동 박제하는 `docs/requests/inbox/chairman-2026-09.md` 로 작업 잔여물이 아니다.
- `git log --oneline -3` = `eaf5af0` `fb162b5` `e4928fe`, origin 동기 확인.
- 직전 감사(승인 산출물 내용 최신성) 결과 그대로 유지: 승인 핀 **32건**, 드리프트 **0**, 대시보드 32/32 missingReason 0.
- 백로그 재훑음 결과 **컨트롤러가 집을 항목 0건**. 남은 6건은 회장 결정 4 / 실제 회원 1 / 다음 스프린트 1.

### 남은 이슈
1. **스프린트 종료 판정 = 회장.** 공정은 6단계 승인·v1.2.1 released 로 닫혔으나 총30·지급가능27 실계정 0명이라 실제 회원 환전 성공은 미검증. 추천 = 닫고 유저 확보 전환("미검증 1건" 명시 인수).
2. **`pay-open` worktree = 회장 결정.** 미커밋 59건 때문에 임의 제거 불가.
3. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0. 코드 실패도 flaky 도 아님.
4. **전역 토큰 준수 검사기 부재.** 이번엔 3파일 수동 확인으로 닫음. 다음 스프린트.
5. 토스 지급대행 해지 미실행.
6. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정. **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** `pay-open` worktree 처리. **종료증거:** 저장소 clean.
3. **소유자: 회장.** GitHub Actions 예산 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
5. **소유자: 다음 스프린트.** 전역 토큰 준수 검사기 신설. **종료증거:** 검사 스크립트와 위반 0 리포트.
6. **소유자: 실제 회원.** 총30·지급가능27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공.

## CLAUDE 승인 산출물 내용 최신성 감사 (2026-09-02 06:20 KST, 회장 "제대로 된거 가져와")

### 지금까지 한 것
개수·연결만 보던 앞선 점검을 **내용 최신성**까지 내려 다시 감사했다. 결함 2건을 찾아 둘 다 닫았다.

- **결함1: 정본 프로토타입이 gitignore 안에 있었다.** 전체 여정 프로토타입 v3.8 이 `scratchpad/`(gitignore 37행)에 있는데, DESIGN.md·user-flow.md·`SplitBalanceCard.tsx` 주석 등 **10개 파일이 이걸 정본으로 인용**하고 있었다. 저장소 밖·미추적·백업 없음 = 지우면 영구 소실. → `docs/prototype/core-cashout-full-journey-v3.8-opus5.html` 로 승격, 추적 편입, design 승인 핀 등록, **살아있는 인용 22곳 경로 교정**(DESIGN.md 13 / user-flow.md 3 / pipeline-state 5 / 소스 1). 과거 로그(build-log·qa-tracker·구 리포트)는 그 시점 사실이라 미수정. vitest 279/279 유지 확인.
- **결함2: 승인된 qa 단계가 NG 문서를 가리키고 있었다.** 핀된 `core-cashout-qa-report-v1-gpt-codex.md`(8-24)가 `status: changes-requested`, 판정 `❌ NG`, Design Score `C, FAIL`, basis 는 DESIGN.md v2.0.0·FDD v1.0.0·구 프로토타입. 회장이 대시보드에서 열면 **NG 를 본다.** → qa-verifier 위임으로 `core-cashout-qa-report-v2-claude-sonnet.md` 신규 작성(v1 supersedes, 구본 보존). 위임이 8개 실측 명령을 직접 재실행: vitest 279/279, mutation 8/8, E2E 12/12, audit 0, 보안헤더 4종, health 1.2.1, qa:verify-production 3/3.
- **위임이 미검증으로 남긴 1건을 컨트롤러가 닫았다.** v1 의 NG 4번(토큰 위반)은 이 저장소에 `design-lint` 스크립트가 **없어서** 검증 불가였다. 지목된 3파일(`SplitBalanceCard.tsx`·`CashoutQueue.tsx`·`MyLinkCard.tsx`)을 직접 검사 → 하드코딩 hex **0건**, inline `style={{` **0건**. **v1 NG 4건 전부 해소.** 리포트에 컨트롤러 후속 실측 표로 삽입.
- 승인 핀 **31 → 32건**(전체 여정 프로토타입 추가), QA 리포트 핀 v1 → v2 교체. `artifact-drift-check.sh` **드리프트 0**.
- 대시보드 재수집 확인: haenael 합성키 **32개**, `qa-report` 가 **v2** 를 가리킴, `prototype-2` 로 전체 여정 프로토타입 노출, missingReason **0**.
- 커밋 `e4928fe`(프로토타입 승격) `fb162b5`(QA 리포트 v2·핀 교체) push 완료.

### 남은 이슈
1. **전역 토큰 준수 검사기 부재.** 이번엔 3파일 수동 확인으로 닫았으나 자동 검사가 없다. 다음 스프린트 항목.
2. **스프린트 종료 판정 = 회장.** 공정은 6단계 승인·v1.2.1 released 로 닫혔으나 총30·지급가능27 실계정 0명이라 실제 회원 환전 성공은 미검증.
3. **`pay-open` worktree = 회장 결정.** 미커밋 59건 때문에 임의 제거 불가. 추천 = 미커밋분 커밋 후 제거.
4. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0. 코드 실패도 flaky 도 아님.
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).
6. 토스 지급대행 해지 미실행.

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정. **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** `pay-open` worktree 처리. **종료증거:** 저장소 clean.
3. **소유자: 회장.** GitHub Actions 예산 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
4. **소유자: 다음 스프린트.** 전역 토큰 준수 검사기 신설. **종료증거:** 검사 스크립트와 위반 0 리포트.
5. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 스프린트 정리 완료·종료 판정 대기 (2026-08-31 21:55 KST)

### 지금까지 한 것
- **저장소 정리 완료.** 잔여 미커밋은 성장 트랙 7건뿐(다른 세션 소유, §8 로 미수정).
  - `docs/requests/inbox/` 추적 편입(`5790aa6`). 훅 `chairman-request-capture.sh` 가 회장 발화를 원문 박제하는 파일인데 미추적이라 세션 교대 시 소실 위험이 있었다(§4.6 request-provenance).
  - SJ_BRAIN_wiki `d1f387a`: 승인 핀이 파일명 추측보다 우선한다는 계약을 테스트로 고정 + 수집 결과 갱신. `node --test` **16/16**. 이번 수정이 다음 세션에 조용히 증발하지 않게 하는 회귀 장치.
- **최종 실측 재확인:** `/api/health` = `{"status":"ok","version":"1.2.1","database":"ok"}`, 태그 `v1.2.1` 존재, `artifact-drift-check.sh` **드리프트 0**, main push 완료(origin 동기).

### 스프린트 종결 판정 (회장 결정 대기)
공정 기준 = **종료 가능.** 6단계 승인 / v1.2.1 released·배포 검증 / 회고 작성 / 대시보드 31/31 클릭 열람 정상 / 드리프트 0.

**단 핵심 산출 검증 1건이 비어 있다.** 이 스프린트의 목적은 회장이 직접 겪은 30클로버 신청 거부 수정이었는데, **그 경로를 실제로 통과한 회원이 0명**이다(운영 집계 `reached_threshold=0`, 총30·지급가능27 계정 0). 계약·화면·E2E 는 전부 우리가 만든 것을 우리가 검사한 것이고, 실제 회원 통과는 관측된 적이 없다.

선택지: ①여기서 닫고 유저 확보로 전환(**추천** — 회장 방향과 일치, 회원이 도달해야 검증도 가능. "미검증 1건" 명시 인수) ②첫 회원 통과까지 스프린트 유지(정확하나 종료 시점을 우리가 통제 못 함).

### 남은 이슈
1. **스프린트 종료 판정 = 회장.**
2. **`pay-open` worktree = 회장 결정.** 브랜치 main 병합 완료, 마지막 커밋 2026-08-02, 미커밋 59건(25파일 945줄 + 미추적 34)이라 임의 제거 불가. 대시보드 오염은 수집기 수정으로 이미 해소. 추천 = 미커밋분 커밋 후 제거.
3. **CI green 없음.** run `33394104921` 포함 전부 세 job 이 2~3초 만에 steps 0개 종료. Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. `--log-failed` 로 열 로그 자체가 없다. 코드 실패도 flaky 도 아니며 저장소 수정으로 해소 불가.
4. **총30·지급가능27 실계정 0명** → 실제 신청 성공 미검증(위 종결 판정의 근거).
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖, open-decisions 등재).
6. 토스 지급대행 해지 미실행.
7. `collect-harness-changelog.mjs` 행(hang) 가능성 — 다른 트랙 소유. 재발 시 private 빌드 prebuild 를 막는다.

### 다음 액션
1. **소유자: 회장.** 스프린트 종료 판정(①닫고 유저 확보 전환 / ②첫 회원 통과까지 유지). **종료증거:** 판정 발화 후 pipeline-state 반영.
2. **소유자: 회장.** `pay-open` worktree 처리 방식 결정. **종료증거:** 저장소 clean.
3. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
4. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
5. **소유자: 실제 회원.** 총30·지급가능27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공과 후속 지급 흐름.

## CLAUDE 대시보드 클릭 열람까지 검증 완료 (2026-08-31 07:10 KST)

### 지금까지 한 것
- 수집기 파싱 수정분(SJ_BRAIN_wiki `cff9d55`)을 컨트롤러가 재검증: 단위 테스트 **16/16**, 재수집 후 haenael 합성키 **31개 전량 `core`**(유령 `main` 소멸), import 실재 **31/31**, missingReason **0**, `pipeline-live` 의 `approvedArtifacts` **31건**(이전 `[]`).
- **private 대시보드 빌드가 깨져 있던 것을 찾아 고쳤다(SJ_BRAIN_wiki `d9985a2`).** 앞선 수정이 emit 하는 타입 선언에서 "실물 없음" 변형에 실제로는 없는 `load` 가 적혀 있어 타입 좁히기가 무력화되고 `DashboardView.tsx:415` 가 TS2322 로 깨졌다. 공개 빌드만 확인했으면 못 잡았을 결함이다.
- **클릭 열람 실검증 통과.** `npx tsc -b` exit 0 → `vite build --mode private` ✓ built → `node scripts/headless-artifact-smoke.mjs` **PASS(모달에 원문 표시)**.
- 빌드된 번들에 security-report·perf-report·cross-browser-matrix·design-spec·clean-frames·구현현황·RELEASE·CHANGELOG **전부 포함** 확인, `feed-02-carousel`(마케팅 캐러셀 오탐) **0건** 확인.
- **회귀 없음(정정된 실측).** before/after: romeo 23→25, dark 15→15, zero-one 64→97, d-edu 97→117, openclaw-auto 20→30, haenael-ge 19→31, haejo-danta 17→17, verse 8→8, blog-premium 33→34. **감소 0.**
  - ★내 앞선 보고의 "타 벤처 개수 동일"은 **오측정**이었다. 이미 수정이 적용된 뒤 상태를 before 로 잡았다. 결론(무회귀)은 같으나 근거 숫자가 틀렸고 회장께 정정 보고했다.
- 전체 missingReason 36→41 증가는 회귀가 아니라 **표면화**(해조단타·blog-premium 이 승인 핀에 경로 대신 설명 라벨을 적어둔 것이 이제 읽혀 드러남). 그 벤처 소유라 미수정.
- 빌드 도중 `collect-harness-changelog.mjs`(다른 트랙 소유)가 35분 이상 진행 없이 멈춰 prebuild 를 막았다. 해당 프로세스를 종료하고 `tsc -b` + `vite build` 를 직접 실행해 우회했다. 이 스크립트의 행 자체는 그 트랙 몫으로 남긴다.

### 남은 이슈
1. **`pay-open` worktree 처리 = 회장 결정.** 브랜치 `wt-pay-open` 은 main 에 병합됨, 마지막 커밋 2026-08-02. 미커밋 59건(25파일 945줄 + 미추적 34) 때문에 임의 제거하지 않았다. 수집기 수정으로 대시보드 오염은 이미 사라졌다. open-decisions 에 선택지 4안 등재(추천 = 미커밋분 커밋 후 제거).
2. **CI green 없음.** run `33318783524` 포함 전부 세 job 이 2초 만에 steps 0개 종료. Actions 무료 2,000분 소진 + budget $0. 코드 실패도 flaky 도 아니며 `--log-failed` 로 열 로그가 없다. 저장소 수정으로 해소 불가.
3. **`collect-harness-changelog.mjs` 행(hang)** 이 남아 있으면 다음 private 빌드도 막힌다. 다른 트랙 소유.
4. 총보유 30·지급가능 27 실계정 0명. 실제 신청 성공 미검증.
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).

### 다음 액션
1. **소유자: 회장.** `pay-open` worktree 처리 방식 결정. **종료증거:** 폴더 정리 후 저장소 clean.
2. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
3. **소유자: 100B/openclaw-auto 트랙.** `collect-harness-changelog.mjs` 행 원인 규명. **종료증거:** prebuild:private 이 끊김 없이 완주.
4. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
5. **소유자: 실제 회원.** 총 30·지급가능 27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공.

## CODEX 100B 대시보드 수집기 수정 회수 (2026-08-31 05:45 KST)

### 지금까지 한 것
- 100B 수집기가 `pipeline-state.core.md`의 표준 block/list `approved_artifacts`를 1급 파싱하도록 수정했다. 기존 inline 객체와 legacy block map도 유지했다.
- 승인 핀의 정확 path를 파일명 추측보다 우선하고, 표준 핀이 모두 실재하면 discovery와 worktree fallback을 억제했다.
- 루트 `pipeline-state.md`가 없는 레포는 실제 정식 라인에만 귀속하도록 고쳐 유령 `main`을 제거했다. 낡은 `pay-open` worktree는 유실 위험 때문에 삭제하지 않았다.
- glob 핀은 대표 실파일 1건과 `globMatchCount`를 기록한다. migration 4건, QA contract 1건을 확인했다.
- 현재 진실원의 승인 핀은 37건이 아니라 목록 항목 31건이다. 단계 제목 6개를 합치면 하위 YAML 행이 37개다. 수집 결과는 pin 31/31, glob 전개 실파일 34/34다.
- `dashboard-sync.sh manual` exit 0 후 `haenael-ge` 합성키는 `core=31`, `main=0`, `missingReason=0`, 실파일 `load()` 31/31이다. 기존 인스타 캐러셀·구 wireframe·중복 matrix 오탐은 합성키에서 사라졌다.
- 9개 벤처 합성키는 감소 0이다. before/after: romeo 23→25, dark 15→15, zero-one 64→97, d-edu 97→117, openclaw-auto 20→30, haenael-ge 19→31, haejo-danta 17→17, verse 8→8, blog-premium 33→34.
- 검증: artifact 계약 테스트 16/16, 대상 ESLint, `npm run build` 통과. private Dashboard 전항목 실클릭은 QA 미검증이다.
- 공유 BRAIN 저장소에서 다른 동시 작업이 05:26 KST에 수집기 1차 변경을 `cff9d55`로 커밋했다. 이 Codex 세션은 commit·push를 실행하지 않았다. 현재 로컬 원격 추적 브랜치에는 해당 커밋이 없다.

### 남은 이슈
1. private Dashboard에서 `haenael-ge core` 31개 모달 실클릭과 브라우저 콘솔 오류 0 검증이 남았다.
2. 전역 기존 `missingReason` 36건과 새로 표면화된 ZERO-ONE의 비파일 worktree 핀 1건은 별도 벤처 정본 정리가 필요하다. `haenael-ge` 누락은 0이다.
3. GitHub CI run `33318783524`는 세 job 모두 steps 0개로 실패했다. 코드 실행 전 계정 Actions 무료분 소진 + budget $0에서 차단된 기존 외부 조건이다. `gh run view --log-failed`도 실행 로그가 없어 실패했다. 코드 결함이나 플레이키 증거는 아니다.
4. BRAIN 저장소가 여러 세션의 대규모 dirty 상태다. 이 작업은 관련 8파일 외 사용자 변경을 건드리지 않았다.

### 다음 액션
1. **소유자: qa-verifier.** `npm run build:private` 후 `node scripts/headless-artifact-smoke.mjs` 실행, `haenael-ge core` 31개 모달 확인. **종료증거:** 31/31 원문 표시, 콘솔 error 0.
2. **소유자: 회장 또는 GitHub 계정 관리자.** Actions budget 승인 또는 무료분 초기화 대기. **종료증거:** run `33318783524` 재실행 시 세 job에 실제 steps가 생기고 success.
3. **소유자: 각 벤처 세션.** 전역 `missingReason` 37건의 정본 path 보정. **종료증거:** 해당 벤처 생성키 missing 0 또는 의도적 missing 사유 확정.

---

## CLAUDE 100B 대시보드 산출물 노출 점검 (2026-08-31, 회장 "누락된 것도 있고 병신같은 것도 있다")

### 지금까지 한 것 (진단 = 컨트롤러 직접 실측)
- `dashboard-sync.sh manual` 실행. 수집 정상 종료(9벤처·19트랙).
- **haenael-ge 합성키가 19개뿐**이고 승인 핀 37건 중 대부분이 누락. 누락 예: security-report, perf-report, cross-browser-matrix, RELEASE.md, CHANGELOG.md, 구현현황.md, design-spec, clean-frames stamp, migrations 글롭, qa/contracts 글롭, fdd v0.1.0, folder-structure, core-cashout-qa-report.
- **오탐**: `haenael-ge::main::prototype` = `docs/brand-assets/feed/_src/feed-02-carousel.html`(인스타 마케팅 캐러셀). `::main::wireframes` = 구 v2 허브. `design-conformance-matrix` 가 core/main 에 서로 다른 파일로 중복.
- **근본 원인 ① 확증(직접 실행 검증).** `collect-artifacts.mjs`:270 이 `/^approved_artifacts:\s*\{(.*)\}/m` 로 **인라인 한 줄 객체만** 파싱한다. 우리는 release-and-artifacts.md §1.1 **블록/리스트 스키마**를 쓴다. node 로 직접 돌려 **매치 X** 확인. → 승인 핀 37건이 전부 무시되고 파일명 추측(discoverRepoArtifacts)으로 떨어진다. `pipeline-live.generated.ts` 의 `HaenaelGe.approvedArtifacts` 도 **`[]`** 로 같은 증상(해조단타는 인라인 스키마라 값이 있음).
- **근본 원인 ② 확증.** 유령 `main` 트랙의 출처 = `.claude/worktrees/pay-open` 워크트리에 **루트 `pipeline-state.md`** 가 있어 `lineOf()` 가 'main' 을 반환. 그 워크트리는 브랜치 `wt-pay-open`(마지막 커밋 2026-08-02, **main 에 이미 병합됨**)이고 상태파일은 "2026-07-23 v2 design 진행 중"으로 낡았다. 구 PRD·구 와이어·마케팅 캐러셀이 여기서 올라온다.
- 우리 쪽 핀은 이상 없음: 37건 실물 전량 존재(글롭 2건도 각각 4파일·1파일 해석), 대시보드가 잡은 haenael 엔트리 45건의 import 대상 **실재 45/45·실패 0**(즉 "안 열리는" 문제는 아니고 "엉뚱한 것이 열리는" 문제다).
- **Codex 위임 진행 중**: `codex-delegate.sh code-builder` 로 수집기 수정 발주(블록 스키마 1급 파싱 + 라인 귀속 누수 + 글롭 처리 + before/after 숫자 + 타 벤처 회귀 금지).
- 워크트리 처리는 미커밋 59건(25파일 945줄 + 미추적 34) 유실 위험이 있어 **임의 제거하지 않고** open-decisions 에 선택지 4개로 등재.

### 남은 이슈
1. **수집기 수정 회수 대기(Codex).** 종료증거 = 재수집 후 haenael 승인 핀 37건 중 잡힌 수, 유령 main 트랙 소멸, 타 벤처 합성키 수 미감소.
2. **워크트리 `pay-open` 처리 = 회장 결정.** 추천 = 미커밋분 커밋 후 worktree 제거.
3. `pipeline-live` 의 `lastApprovalStage` 가 `eng-design`(2026-08-01)로 낡았고 stageTimestamps 에 ship 이 없다. 수집기 수정 후 재확인.
4. CI green 없음(Actions 무료분 소진 + budget $0).
5. 총보유 30·지급가능 27 실계정 0명.

### 다음 액션
1. **소유자: Codex.** 수집기 블록 스키마 파싱·라인 귀속 수정. **종료증거:** before/after 표, 승인 핀 커버리지 숫자.
2. **소유자: 회장.** worktree `pay-open` 처리 방식 결정. **종료증거:** worktree 제거 후 대시보드에 `haenael-ge::main` 트랙 소멸.
3. **소유자: 회장.** GitHub Actions 예산 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 스프린트 종료 (2026-08-30 22:45 KST)

### 지금까지 한 것 (이 턴 추가분)
- **환전 폼 시안 대조 완료 = 마지막 QA 잔여 해소.** kill switch 켠 E2E 로 재캡처(`artifacts/qa-cashout-core-20260824/build-fix/cashout-390.png`) 후 시안 `core-cashout-30-27-form-390-v1-gpt-codex.png` 과 2장을 나란히 Read 육안 대조. 타이틀·분해카드 3행·환산카드 4행·폼 필드 순서·요약박스·버튼 **일치**. 핵심인 **자격·상한 분리 문구**(`환전 기준: 모인 클로버 30개 이상 · 지금 지급 가능 N개`)도 일치. `docs/design-conformance-matrix.md` 에 스탬프 기록.
- **E2E 12/12 통과.** 처음엔 12건 전부 실패했는데 내 코드 회귀가 아니라, 앞서 버전 주입 확인용으로 돌린 **가짜 Supabase 주소 빌드 결과물을 E2E 가 재사용**한 탓이었다(세션 쿠키 이름 불일치 → 전부 로그아웃 판정). 올바른 env 로 재빌드 후 12/12. 이 교훈을 회고에 추가했다.
- **대표 주소 자동 추적 복구 확인(관찰됨).** 태그 push 배포 `haenael-72ps8djpd` 에 수동 alias 없이 `haenael-ge.vercel.app` 이 붙었다. 2026-08-25 부터 반복되던 수동 승격 문제도 Root Directory 미설정이 뿌리였다.
- **릴리즈 v1.2.1 released.** 태그 생성·push 완료. RELEASE.md·CHANGELOG.md 는 release-manager 위임(verify FAIL=벤치마크 근거 부족, 내용은 컨트롤러 실측과 대조해 사실 확인 후 보존).
- **pipeline-state 자체 오류 복구.** 내가 줄 번호로 패치하다 approved_artifacts 의 ship 핀 2줄을 덮어쓰고 stages 블록은 안 고쳐 자기모순이 났다. release-manager 가 지적해 복구했다.

### 최종 실측 (전부 컨트롤러 직접)
| 확인 | 결과 |
|---|---|
| `/api/health` | version **1.2.1**, database ok |
| 보안 헤더 | **4/4** (CSP·nosniff·referrer·permissions) |
| `x-powered-by` | **0건** |
| Firefox / WebKit 콘솔 | error 0, pageerror 0 |
| `qa:verify-production` | 3/3 |
| 운영 인증 읽기 E2E | 1/1, 제품 쓰기 0 |
| 환전 E2E | **12/12** |
| vitest | 279/279 |
| qa-contracts | 전량 PASS, mutation 8/8 검출 |
| `npm audit --omit=dev` | 0건 |
| artifact-drift-check | 드리프트 0 |

### 남은 이슈 (전부 비차단)
1. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. 코드·워크플로로 해소 불가. 축소안(중복 build 제거·트리거 축소) 미승인.
2. **총보유 30·지급가능 27 실계정 0명.** 실제 회원의 27클로버 신청 성공 미검증. 30·27 값 그대로의 실화면 캡처도 같은 이유로 없다(구조·문구 대조로 대체).
3. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖, open-decisions 등재).
4. 토스 지급대행 해지 미실행.

### 다음 액션
1. **소유자: 회장.** 대시보드에서 산출물·배포 결과 확인. **종료증거:** 회장 확인.
2. **소유자: 회장.** GitHub Actions 예산 결정 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성 후 success.
3. **소유자: 회장.** 토스 지급대행 해지(평일 08:00~19:00 라이브챗). **종료증거:** 계약 상태 변경.
4. **소유자: 실제 회원.** 총 30·지급가능 27 상태에서 27클로버 신청. **종료증거:** 운영 신청 성공.

## CLAUDE 배포 성공·QA 승인 (2026-08-30, 회장 "vercel root 디렉토리 너가 해야지")

### 지금까지 한 것
- **Vercel Root Directory 를 `web` 으로 설정**(API PATCH 성공). 루트 `vercel.json` 제거 → `web/vercel.json` 이관(framework·regions·kakao-review 헤더만). 구 `6b23fd7` 의 buildCommand 우회 청산.
- **배포 성공.** `haenael-ma17op5kd`(Ready) → `haenael-e1rbeonxz` → 최종 `haenael-6f48v643p`. 각 배포마다 `vercel alias set` 으로 대표 주소 수동 승격.
- **운영 버전 진실원 전환.** `/api/health` 의 version 이 Vercel 환경변수 수기 관리였고 40일 stale 사고의 원인이었다. `next.config.ts` 에서 `package.json` 을 읽어 빌드 시각 주입하도록 변경(환경변수는 더 이상 읽지 않는다). 결과 `/api/health` = **version 1.2.1**.
- **QA 검증 대상 주소 교정.** `scripts/qa/verify-production.mjs` 와 `web/playwright.production.config.ts` 가 302 redirect 되는 `haenaelge.vercel.app` 을 보고 있었다. 대표 주소 `haenael-ge.vercel.app` 로 교정. **대표 주소 헤더가 오래 미검증이던 이유였다.**
- **카카오 prefetch 차단.** 배포 후 Firefox·WebKit 콘솔에 CSP connect-src 위반이 새로 떴다. 랜딩(`app/page.tsx`)의 카카오 로그인 Link 만 prefetch 가 켜져 있었다(목표 페이지·전화동의 안내는 이미 꺼져 있었음). CSP 를 여는 대신 prefetch 를 껐다.
- **최종 실측(전부 컨트롤러 직접):** 보안 헤더 **4/4** 관찰, `x-powered-by` **0건**, Firefox·WebKit 콘솔 **error 0·pageerror 0**, `qa:verify-production` **3/3**, 운영 인증 읽기 E2E **1/1**(제품 쓰기 0), `/api/health` version **1.2.1**·database ok, vitest **279/279**, 프로덕션 빌드 통과.
- **qa·ship APPROVED.** `pipeline-state.core.md` 갱신. `docs/security-report.md`·`docs/cross-browser-matrix.md` 에 배포 후 재판정 PASS 스탬프 추가. `docs/제품현황.md` 갱신.
- **회고 확장.** `wiki/3-operations/2026-08-30-환전-스프린트-회고.md` 에 "회고를 쓴 그날 같은 병을 다시 앓았다" 절과 "증상 대신 구조를 고친 것" 대조표 추가. 브라우저로 띄웠다.
- 커밋 push: `8db3558`(vercel 구성 이관) `30f98a0`(버전 진실원·QA 주소) `de109a6`(prefetch).

### 남은 이슈
1. **환전 폼 캡처 미확보(비차단).** 시안 대조 실화면이 `CASHOUT_ENABLED` 꺼진 상태로 찍혀 대기 카드만 나온다. 재촬영 필요(`web/src/lib/supabase/service.ts`:86 `isCashoutEnabled`).
2. ~~대표 주소 자동 승격 안 됨~~ → **해소(관찰됨).** `vercel domains add` 결과 이미 프로젝트에 assign 돼 있었고, Root Directory 수정 후 태그 push 로 만들어진 배포 `haenael-72ps8djpd` 에 **수동 alias 없이** `haenael-ge.vercel.app` 이 자동으로 붙은 것을 `vercel inspect` 로 확인했다. 2026-08-25 부터 반복되던 alias 수동 승격 문제의 뿌리도 Root Directory 미설정이었다.
3. **CI green 없음.** Actions 무료 2,000분 소진 + budget $0 + Stop usage Yes. 축소안(중복 build 제거·트리거 축소) 미승인.
4. 총보유 30·지급가능 27 실계정 0명. 실제 신청 성공 미검증.
5. 지급 신원·세무정보 처리 계약 = 회장 보류(범위 밖).

### 다음 액션
1. **소유자: 회장.** Vercel Domains 에 `haenael-ge.vercel.app` 추가해 자동 추적으로 전환. **종료증거:** 다음 배포 후 수동 alias 없이 대표 주소가 최신을 가리킴.
2. **소유자: 컨트롤러.** 환전 폼 캡처 재촬영·시안 대조. **종료증거:** 좌우 합성 대조 이미지.
3. **소유자: 회장.** CI 축소 승인 또는 무료분 초기화 대기. **종료증거:** CI job 에 실제 steps 생성.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.

## CLAUDE 턴 종료 시점 상태 (2026-08-30 03:40 KST)

- push 완료: `fb6f871..a659f1f` (커밋 5건). 작업트리 clean(growth 트랙 제외).
- **Vercel 배포 Error 지속.** 해제 = 회장 콘솔에서 Root Directory=`web`. 런북 `docs/ops/vercel-root-directory-수정.md`.
- **CI run `33286007123` 도 세 job 전부 steps 0개로 종료.** annotation = 계정 결제 실패 또는 spending limit. 코드 실패·flaky 아님. Actions 무료 2,000분 소진 + budget $0(2026-08-29 브라우저 실화면 확인). green 증거 생성 불가.
- 위임 검증: 성능 측정(Sonnet) verify FAIL — `~/.claude/standards/doc-review.md` Read 0회. 측정 스크립트·원자료 실재하고 컨트롤러가 직접 확인해 **경고 라벨 붙여 출고**(회장 2026-07-11 규약). 재위임 시 프롬프트에 doc-review.md Read 필수 명시할 것.
- 실수원장 2건 추가: [proxy] 의존성 변경을 배포 확인 없이 push / [struct] Root Directory 미설정을 우회로 덮은 구조 문제 재발(count 2).

## CLAUDE 배포 시도와 차단 (2026-08-30, 회장 "쭉 진행")

### 지금까지 한 것
- 회장 승인으로 **main push 실행** (`fb6f871..a888ae3`). 커밋 4건 반영.
- **Vercel 배포 실패.** `haenael-a7qvrf5md` = Error. 빌드는 53초에 정상 완료(16화면 생성)했고 **출력 배포 단계**에서 죽었다: `Cannot patch preview comments when immutable static file upload is enabled. Upgrade to next@v16.3.0-canary.32 or newer.`
- **근본 원인 규명.** 실제 next 는 16.3.3 으로 지목된 canary 보다 최신이라 조건은 이미 충족. 문제는 **Vercel 이 next 버전을 못 읽는 것**이다. CLI 재배포가 `No Next.js version detected ... check your Root Directory setting` 을 뱉었고, 프로젝트 API 조회 결과 `rootDirectory = None` 인데 `package.json` 은 `web/` 에 있다. 루트 `vercel.json` 이 installCommand·buildCommand·outputDirectory 로 빌드만 우회시켰을 뿐 프레임워크 위치는 안 알려줬다(구 `6b23fd7` 의 성격). next 16.3 부터 immutable static upload 가 켜지며 버전 게이트 경로가 생겨 이제서야 터졌다.
- **되돌리기 불가 실측.** next 16.2.10 으로 내리면 배포는 살지만 `npm audit --omit=dev` 가 0건 → **high 3건**으로 되살아난다. 배포를 위해 보안을 되돌리지 않기로 하고 16.3.3 을 복원했다(작업트리 clean, 0건 재확인).
- API 로 `rootDirectory: web` PATCH 시도 → **도구 분류기가 운영 배포 설정 변경으로 차단.**
- 수정 런북 작성: `docs/ops/vercel-root-directory-수정.md` (콘솔 경로·확인 명령·설정 후 정리 순서 포함). 브라우저로 띄웠다.
- 성능 실측 반영(위임 Sonnet, verify FAIL=품질헌법 미독이나 원자료 실재로 보존): LCP 384~840ms, CLS 0, 오류율 0/30, p95 0.166~1.229s. 재현 스크립트 `scripts/qa/measure-web-vitals.mjs`.
- **디자인 증거 구멍 발견.** 시안 `core-cashout-30-27-form-390` 과 실화면 `390-cashout.png` 를 직접 Read 대조. 시안엔 환전 신청 폼이 있는데 실화면엔 "환전 기능을 준비하고 있어요" 대기 카드가 있다. 코드 확인 결과 버그 아님(`CashoutRequestForm.tsx`:569-577, `cashoutEnabled` 거짓이면 폼 대신 대기 카드). **문제는 폼 상태 캡처가 증거 묶음에 없다는 것** — 정합 대조표는 통과라 적혀 있으나 근거 화면이 다른 화면이다.

### 남은 이슈
1. **★ ship 차단.** Vercel Root Directory 를 `web` 으로 설정해야 배포가 산다. 회장 콘솔 1회. 그 전까지 대표 주소는 직전 Ready 배포(1.2.0, 구 번들)를 계속 서빙한다. **사용자 영향 없음**(구 번들이 정상 동작 중).
2. Root Directory 설정 후 루트 `vercel.json` 의 우회 3줄 제거 → `web/vercel.json` 이관. **반드시 설정 변경 뒤에.**
3. qa 미승인. 보안 헤더·Firefox 콘솔은 배포돼야 닫힌다(현재 대표주소에 CSP·nosniff·referrer·permissions 전부 미관찰, `x-powered-by: Next.js` 노출).
4. 환전 폼 캡처 재촬영(스위치 켠 상태) 후 시안 대조.
5. CI green 없음(무료 2,000분 소진 + budget $0). 축소안 미승인.

### 다음 액션
1. **소유자: 회장.** <https://vercel.com/100-b/haenael-ge/settings> → Build and Deployment → Root Directory = `web` 저장. **종료증거:** 재배포 Ready + 대표주소 `curl -sSI` 에 보안 헤더 4종.
2. **소유자: 컨트롤러.** 설정 후 재배포 확인 → 헤더·Firefox 콘솔 재검증 → qa 승인 → vercel.json 정리 → ship 마감·태그 v1.2.1. **종료증거:** `/api/health` 1.2.1, RELEASE.md released.
3. **소유자: 컨트롤러.** 환전 폼 캡처 재촬영·대조. **종료증거:** 좌우 합성 대조 이미지.
4. **소유자: 회장.** 토스 지급대행 해지. **종료증거:** 계약 상태 변경.
