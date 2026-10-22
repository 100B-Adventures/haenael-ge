# 해낼게 V2 소셜 바이럴 루프 build 로그

## 2026-10-22 core 감사 재오픈 P0/P1 보정

- D-017 환전 경계를 서버 전용 `CASHOUT_ALLOWED_MEMBER_IDS` allowlist로 옮겼다. 값이 없거나 잘못됐거나 preview이면 기본 거부하고, Server Action 직접 호출도 DB 쓰기 전에 같은 판정을 다시 한다.
- 일반 계정은 기존 잔액·진행 중 신청·이력을 회수할 수 있지만 신규 신청 폼은 열리지 않는다. 승인된 읽기 상태를 삭제했던 1차 구현은 Claude 교차 리뷰 BLOCK 뒤 되살렸다.
- 아동·청소년 보호 정책 실본문과 개인정보처리방침의 카카오·솔라피 운영 정합을 반영했다. 환전 조회 4종, 상태, 이력의 오류 위장 회귀 테스트를 추가했다.
- 실제 Next production 서버 기반 환전 Playwright는 허용 계정 쓰기와 일반 계정 거부를 포함해 13/13 통과했다. 웹 전체 회귀는 70파일 387/387, 로컬 pgTAP은 21파일 369/369, 환경·돈 계약 mutation은 8/8 통과했다. Next production build와 Storybook 정적 build도 통과했다.
- 환경 계약 검사는 `qa/contracts/deploy-env.contract.json`의 `sourceRoots`인 `web/src`와 `supabase/functions`를 재귀 순회한다. 이번 실행은 코드 환경변수 39개를 발견해 39개 전부 분류했고, 한 파일만 읽는 축소 검사가 아니다.
- 감사 레지스트리 P0/P1 17행 가운데 15행을 닫았다. `supporter_name_visibility`·`message_visibility`와 1회 `thanks_message` 채널은 스키마·정책 결정이 승인되지 않아 회수 필요로 남겼다.
- 운영 Supabase 쓰기와 운영 배포는 실행하지 않았다.

> STAMP: 생성 2026-10-22 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build·review. 근거는 감사 v1.0.0, D-017, 로컬 Supabase·Vitest·Next·Playwright, Claude 교차 리뷰. 운영 미반영.

## 2026-10-21 6차 회수 R21~R25

- R21은 정상 시각으로 404·403 실패를 주입한 뒤 임시 감시 cron의 실제 실행 `succeeded`와 그 실행 이후 정체 경보를 관찰했다. 손 호출만으로 인과를 대신하지 않는다.
- R22는 `/admin`이 실제 `ops_event` WARN/ERROR를 읽도록 연결하고 헤드리스 Chromium E2E 1/1로 수신을 관찰했다. 감시 cron 최근 실행과 큐 비어 있음 경보도 계약에 포함했다.
- R24는 `/my` 1단 목록과 `/my/legal` 2단 사업자 전문이 `LEGAL_EXPOSURE`를 직접 소비한다. 제품 코드와 충돌하던 `DESIGN.md`의 과거 `/how=biz` 설명도 D-041대로 정정했다.
- R25는 migration 본문에서 실제 대시보드 질의를 추출한다. 실행되지 않은 plan node를 제외해 기본 플래너에서 최근 분기 60행→3행을 다시 관찰했다.
- 로컬 회귀는 tsc·lint rc=0, QA mutation 8/8, Vitest 66파일 372/372, pgTAP 21파일 369/369다. 스케줄·동시성·런타임·인덱스 검증도 모두 rc=0이다.
- R23은 공식 GHCR mirror를 함수 런타임 검증에 고정해 ECR 익명 pull 한도를 제거했다. 원격 run `39570467103`의 4잡이 모두 성공했고 서버 잡은 pgTAP·스케줄·동시성·함수 런타임·인덱스 효과를 연속 통과했다.
- 운영 Supabase 쓰기와 운영 배포는 실행하지 않았다.

> STAMP: 생성 2026-10-21 17:39 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 5차 반려 레지스트리, 로컬 Supabase·pg_cron·Vitest·pgTAP·헤드리스 Chromium, Actions run 39570467103. 운영 미반영.

## 2026-10-21 4차 회수 R10·R11·R18·R19 종료

- R10은 스케줄 검증 직전·직후 Vault 3종과 전체 `ops_event` fingerprint 동일, 파괴적 DELETE 0건을 다시 관찰했다.
- R11은 `pg_net`에 잘못된 함수 URL과 잘못된 내부 토큰을 각각 주입해 실제 HTTP 404·403을 만들었다. 디스패치 결과와 독립된 큐 배수 감시가 두 경우 모두 `STORAGE_CLEANUP_DRAIN_STALLED`를 기록했다.
- R18은 `ops_event` INSERT를 강제로 막았다. 직접 호출의 PostgreSQL warning·error, cron `failed`를 모두 관찰했다.
- R19는 `/my` 본문에 정책 링크 3개, `/my/legal` 본문에 법정 기재 6항목과 통신판매업 신고번호 `확인 중`을 구현했다. 전역 푸터는 이 두 경로의 내용을 더 이상 소유하지 않는다.
- dev 390×844에서 `/my/legal` HTTP 200, console·page error 0, 본문 6/6 첫 화면 노출을 확인했다. 모바일 360·390·412·600·700·780·820·900·1000은 9/9 통과했다.
- 최신 소스에서 TypeScript·lint·QA 계약, Vitest 370/370, pgTAP 369/369, Next build, Storybook build가 통과했다. 디자인 토큰 신규 위반은 0건이다.
- 운영 Supabase 쓰기와 운영 배포는 실행하지 않았다.

> STAMP: 생성 2026-10-21 04:38 KST. 모델 gpt-codex(API model ID 미노출). 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 4차 회수 레지스트리, 로컬 Supabase·pg_net·pg_cron·Vitest·pgTAP·Next·헤드리스 Chromium. 운영 미반영.

## 2026-10-21 3차 교차 코드리뷰 R10~R18

- R10은 스케줄 검증을 읽기 전용으로 바꾸고 Vault 3종과 `ops_event`의 실행 전후 fingerprint 동일성, 파괴적 DELETE 0건을 관찰했다.
- R11은 HTTP enqueue 성공과 분리된 큐 배수 감시 함수를 추가했다. 21분 정체 PENDING 1건과 `STORAGE_CLEANUP_DRAIN_STALLED` 감사 이벤트 1건을 실제 DB에서 확인했다.
- R12~R13은 `ClampText`의 `Collapsible` 단일 집행자 경유와 custom class 접두사 계약을 고정했다. 미등재 `reviewnew` fixture는 반려되고 실제 접두사 20개는 누락 0이다.
- R14는 pgTAP과 서버 런타임 4종을 PR #11 자동 검사에 연결했다. 원격 계약·단위·빌드 잡은 통과했지만 서버 잡이 깨끗한 DB의 기존 권한 드리프트 5건을 발견했다. 교정 migration은 로컬 pgTAP 369/369를 통과했으나 승인 게이트가 후속 branch push를 막아 원격 재실행은 미검증이다.
- R15~R18은 중첩 보호 라우트, 실제 migration 함수 본문 EXPLAIN, 초대 카드 반복 안정성, 감사 기록 실패 시 PostgreSQL warning과 cron 실패 상태를 각각 실행 출력으로 고정했다.
- 전체 로컬 회귀는 TypeScript rc=0, lint rc=0, `test:qa-contracts` 8 mutation PASS, Vitest 369/369, pgTAP 369/369, Next build 18화면, dev HTTP 200·console/page error 0, 모바일 9폭 9/9다.
- 운영 Supabase와 운영 Vercel에는 쓰거나 배포하지 않았다. Mermaid SVG도 다시 렌더하지 않았다.

> STAMP: 생성 2026-10-21 01:53 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 3차 리뷰 레지스트리, 로컬 Supabase·Vitest·pgTAP·Next·헤드리스 Chromium, PR #11 Actions. 운영 미반영, R14 원격 재실행 미검증.

## 2026-10-21 2차 교차 코드리뷰 R1~R9

- R1은 `(receiver)` 실제 폴더를 역스캔한다. 미등재 폴더 반려, 제거 후 통과, 명시적 public 통과를 각각 관찰했다.
- R2는 Vault 누락 상태의 실제 pg_cron 실행이 `ops_event.runtime_secret_missing`을 남긴다. 배포 env 검사도 Vault 3종을 fail-closed로 확인하고, provisioner는 2회 재실행된다.
- R3은 pgTAP과 런타임 검증 3종을 CI와 AGENTS 출고 조건에 올렸다. actionlint와 동일 명령 로컬 실행은 통과했고, 원격 GitHub Actions는 push 전이라 미검증이다.
- R4는 실제 대시보드 CTE를 goal별 최근 3건 LATERAL 질의로 바꿨다. 기본 플래너에서 최근 분기 60행에서 3행, 최종 실행 shared hit 119에서 87을 관찰했다.
- R5~R9는 legal 노출 단일정본, CSS class 경계·AST 수집, legacy 초대 변환 통합, 메시지별 ARIA·첫 렌더, 두 DB 세션 실행 구간 겹침을 테스트와 실제 브라우저·DB 출력으로 고정했다.
- TypeScript, oxlint, `test:qa-contracts`, Vitest 65파일 369/369, pgTAP 21파일 365/365, Next build 18/18, Storybook build, dev `/how` 200·console error 0을 관찰했다.
- 운영 Supabase·Vercel 쓰기와 배포는 하지 않았다. Mermaid SVG도 다시 렌더하지 않았다.

> STAMP: 생성 2026-10-21 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 2차 리뷰 레지스트리와 로컬 pg_cron·Vault·병렬 DB·EXPLAIN·브라우저·전체 회귀 로그. 운영 미반영.

## 2026-10-20 교차 코드리뷰 BLOCK 해소

- 레지스트리 15행 중 1~14를 코드·테스트·로컬 런타임으로 닫았다. 15번 Mermaid renderer는 P3 건너뜀 허용과 재렌더 금지에 따라 변경하지 않았다.
- 배너 업로드 실패 4단계, clamp 측정, cron·Vault 실패 관측, 6필드 초대 배포 창, 보호 라우트 정본, Auth fail-closed, 저장 lease, 포이즌 격리, CheerList 회귀, 무효 class, 실제 병렬 claim, migration 멱등, cheer index, 죽은 legal key를 각각 회귀 계약으로 고정했다.
- 로컬 Storage 정리 실제 호출은 CV-09~13과 EA-01~04를 통과했다. 객체 부재, cron HTTP 200, Authorization 미전송, 버킷+경로 쌍 격리를 관찰했다.
- TypeScript와 lint, Vitest 65파일 367건, pgTAP 21파일 365건, Next build와 Storybook build가 통과했다.
- Next dev `/`→`/how`는 HTTP 200과 console error 0이다. CheerList Storybook은 390×844에서 2줄 clamp와 셰브론을 보였고, 360~1000 아홉 폭 ergonomics가 모두 통과했다.
- 운영 Supabase·Vercel에는 쓰거나 배포하지 않았다. Mermaid SVG 15개도 다시 렌더하지 않았다.

> STAMP: 생성 2026-10-20 20:36 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 교차리뷰 레지스트리와 로컬 런타임·전체 회귀 로그. 상태 local build 일치, 운영 미반영.

## 2026-10-20 1차 슬라이스 실구동

- Storage 정리 worker와 점유·settle RPC, 중단 업로드 정리 함수, tombstone 재등록 함수를 구현했다. 버킷과 객체 경로를 쌍으로 비교한다.
- CV-09~13과 EA-01~04를 로컬 Supabase에서 실구동했다. 객체 부재, stale lease 재점유, 늦은 settle 거부, 부분 성공 1:1, tombstone 재등록, 동일 경로의 버킷 격리를 관찰했다.
- `drain-storage-cleanup-queue`를 로컬 `pg_cron`으로 1회 발사했다. run 89 succeeded, HTTP 200, 함수 로그 +1이며 cron은 원래 10분 주기로 원복했다.
- 커버는 sign 200, Presigned PUT 200, finalize 200, REVIEW 행·격리 객체 존재까지 확인했다. 실패 시도와 성공 시도의 로컬 fixture는 0건으로 정리했다.
- TypeScript·lint, Vitest 358/358, pgTAP 361/361, Next.js build, dev 헤드리스 smoke, 360~1000 아홉 폭 사용성 검사를 통과했다.
- 문서 contradiction 차단축과 요구 커버리지 결손은 0이며 H축은 14/14다. Mermaid는 이번 판에서 다시 렌더하지 않았다.
- 운영 Supabase·Vercel에는 쓰거나 배포하지 않았다. 운영 배너 장애와 로컬 Presigned URL origin 결함이 같은 원인인지는 미확인이다.

> STAMP: 생성 2026-10-20 19:27 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 승인 기술설계 v1.2.5와 로컬 런타임·테스트 로그. 상태 local build 일치, 운영 미반영.

## 2026-10-15 응원 키워드·희소 데이터 2차

- 한국어 응원 문장을 `Intl.Segmenter`와 조사·어미·불용어·승인 표현 규칙으로 정규화했다. `건넬게요`, `저희가`, `차례예요`, `클로버는`은 워드맵에서 0건이고, 빈도 가중·전체 표시는 유지했다.
- 친구 1명에는 초대 유도 카드를 추가했다. 목표 0개, 받은·보낸 응원 0건, 초대 가능한 목표 0개에는 단일 다음 행동을 연결했다.
- 승인 프로토타입에 `희소·빈 상태` 토글을 추가하고, 390px production-mode 8화면과 HTML 보드를 다시 렌더했다. 8/8 HTTP 200, console·page error 0, overflow X 0이다.
- Vitest 59파일 346/346, pgTAP 19파일 336/336, Next.js 정적 생성 17/17, Storybook build, 환전 Playwright 12/12, 360~1000 아홉 폭 모바일 사용성 검사를 통과했다.
- 운영 DB 쓰기와 운영 배포는 실행하지 않았다. 상세: `docs/qa/v2-directive-build-v2-gpt-codex.md`.

> STAMP: 생성 2026-10-15 22:58 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 상태 local build 검증 통과, 운영 미반영.

## 2026-10-15 v1.2.1 대 v2.0.0 화면 결정 보드

- tag `v1.2.1`을 별도 git worktree에 체크아웃해 v1과 현재 v2의 production build를 각각 통과시켰다. 정적 생성은 v1 16/16, v2 17/17이다.
- 같은 local Supabase fixture를 두 production server가 읽게 하고 공통 5화면을 각각 390×844로 캡처했다. v2 신규 5화면도 같은 fixture로 캡처했다.
- 캡처 15장은 HTTP 200, console error 0, page error 0, 가로 overflow 0이며 실제 이미지를 열어 판정했다.
- 결정 보드는 5쌍 크기·좌우 순서·통짜 덤프 검사와 Chromium 렌더를 통과했다. 기본 추천은 절충 3, v1 유지 2다.
- local fixture와 v1 worktree를 정리했다. 운영 DB 쓰기·배포·롤백은 실행하지 않았다. 상세: `docs/qa/v1-vs-v2-decision-v1-gpt-codex.md`.

> STAMP: 생성 2026-10-15 18:59 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 운영 미반영, 회장 화면 선택 대기.

## 2026-10-15 승인 시안 재정렬 5차 최종 정합

- 보고서 뒤 남았던 공개 목표 utility 충돌, 초대 수락 cover 좌표, 계약 테스트와 재캡처 변경을 모두 포함한 상태에서 390×844 이미지 14장을 다시 열었다. 데이터 자체 차이를 제외한 판정은 일치 7·불일치 0·미확인 0이다.
- 대조 보드는 7쌍 크기·순서 검사와 Chromium 렌더를 통과했다. 이미지 14개, 깨진 이미지 0개, 콘솔 오류 0개다.
- Vitest 59파일 337/337, pgTAP 19파일 336/336, Next.js 정적 생성 17/17, 환전 Playwright 12/12를 통과했다.
- 데이터가 있는 공개 목표에서 360~1000 아홉 폭 모바일 사용성 검사가 모두 통과했다. 디자인 토큰 검사는 신규 위반 0건이다.
- 운영 DB 쓰기와 운영 배포는 실행하지 않았다. 상세: `docs/qa/v2-approved-build-realignment-v5-gpt-codex.md`.

> STAMP: 생성 2026-10-15 11:28 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 최종 작업트리 로컬 회귀 통과, 디자인 일치 7·불일치 0·미확인 0, 운영 미반영.

## 2026-10-15 승인 시안 재정렬 4차 마무리

- 승인 시안과 로컬 구현을 390×844로 다시 캡처하고 이미지 14장을 직접 열었다. 데이터 자체 차이를 제외한 판정은 일치 2·불일치 5·미확인 0이다.
- 대조 보드는 7쌍 크기·순서 검사와 Chromium 렌더를 통과했다. 이미지 14개, 깨진 이미지 0개, 콘솔 오류 0개다.
- Vitest 59파일 336/336, pgTAP 19파일 336/336, Next.js 정적 생성 17/17, 환전 Playwright 12/12를 통과했다.
- 데이터가 있는 공개 목표에서 360~1000 아홉 폭 모바일 사용성 검사가 모두 통과했다. 디자인 토큰 검사는 신규 위반 0건이다.
- 운영 DB 쓰기와 운영 배포는 실행하지 않았다. 상세: `docs/qa/v2-approved-build-realignment-v4-gpt-codex.md`.

> STAMP: 생성 2026-10-15 09:26 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 로컬 회귀 통과, 디자인 일치 2·불일치 5, 운영 미반영.

## 2026-10-15 승인 시안 재정렬 3차

- D-023에 따라 승인 프로토타입의 사용자 노출 글자를 13px 이상으로 올리고, D-022가 금지한 연속 기록·`N번 함께`·활동 타임라인을 제거했다.
- 로컬 대조 fixture를 친구 3명·진행 목표 2·완료 목표 2·확정 응원 18·연결 친구 3으로 맞췄다. 제품 기본 데이터는 바꾸지 않았다.
- 카카오 미리보기 중앙 아바타, 초대 수락 cover 위 아바타, 목표명 접미사 중복과 일부 간격을 고쳤다.
- 승인 시안 7장과 dev 7장을 실제로 열어 본 판정은 일치 0·불일치 7·미확인 0이다. 개선된 항목을 화면 전체 일치로 승격하지 않았다.
- Vitest 336/336, pgTAP 336/336, Next.js 정적 생성 17/17, 환전 Playwright 12/12를 통과했다.
- 데이터가 있는 공개 목표에서 360~1000 아홉 폭 모바일 사용성 검사가 모두 통과했다.
- 운영 DB 쓰기와 운영 배포는 실행하지 않았다. 상세: `docs/qa/v2-approved-build-realignment-v3-gpt-codex.md`.

> STAMP: 생성 2026-10-15 08:06 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 로컬 회귀 통과, 디자인 픽셀대조 불일치, 운영 미반영.

## 2026-10-15 승인 시안 재정렬 2차 픽셀대조 정정

- 승인 프로토타입 7장과 dev 7장을 실제 이미지로 각각 연 뒤 판정을 정정했다. 결과는 일치 0, 불일치 7, 미확인 0이다.
- 대조 보드의 7쌍은 크기·좌우 순서·통짜 덤프 검사에서 통과했지만, 이 검사는 화면 내용 일치를 보장하지 않는다.
- Vitest 335/335, pgTAP 336/336, Next.js production build 17/17, 환전 Playwright 12/12를 통과했다.
- 환전 제출 중 높이는 D-023 적용 후 로컬 실측 622.8125px로 기준만 갱신했다. ±4px 허용 오차, 계좌 마스킹, 수수료 공식은 그대로다.
- 데이터가 있는 공개 목표에서 360~1000 아홉 폭 모바일 사용성 검사가 모두 통과했다.
- 운영 DB 쓰기와 운영 배포는 실행하지 않았다. 테스트 삭제·skip 추가·7일 초대 만료 추가는 0건이다.
- 상세: `docs/qa/v2-approved-build-realignment-v2-gpt-codex.md`.

> STAMP: 생성 2026-10-15 KST. 모델 gpt-codex/gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 디자인 픽셀대조 불일치, 운영 미반영.

## 2026-10-15 D-024와 승인 시안 재대조

- D-024 migration을 로컬 reset에 적용했다. 확정 응원 양방향 친구, 과거 이력 소급, attribution·status 경합을 pgTAP 13건과 실제 DB 세션 2순서로 검증했다.
- 전체 pgTAP 336/336, Vitest 334/334, Next.js production build 정적 생성 17/17 PASS다.
- 9개 실제 경로를 390px·1280px에서 열어 HTTP 200, 콘솔 오류 0, 가로 넘침 0을 확인했다.
- 공개 목표에 확정 응원 3건 fixture를 넣고 360~1000 아홉 폭 모바일 사용성 검사를 모두 통과했다.
- 승인 시안 대 로컬 구현은 6화면 불일치, 1화면 미확인이다. 이미지 규격 14쌍은 검사기를 통과했지만 디자인 게이트는 미통과다.
- 운영 DB·운영 배포는 실행하지 않았다. 테스트 파일 삭제 0, skip 증가 0이다.
- 상세: `docs/qa/v2-approved-build-realignment-v1-gpt-codex.md`.

> STAMP: 생성 2026-10-15 02:05 KST. 모델 gpt-codex. 에이전트 code-builder. 스킬 haenael-supabase-build. 운영 미반영.

## 2026-10-13 V2 전체 회귀 테스트 하네스 복구

- 제품 코드 변경 없이 Playwright 환경·local seed·pgTAP fixture만 수정했다.
- production build PASS, cashout 12/12, cheer 2/2, multi-goal·release 4/4, 전체 pgTAP 323/323 PASS.
- 전체 Playwright는 62 PASS / 운영 read-only 자격증명 1 FAIL / 0 SKIP이다.
- 테스트 삭제·skip 추가·계좌 마스킹·수수료 단정 약화는 0건이다.
- 상세: `docs/qa/v2-regression-harness-fix-v1.0.0-gpt-codex-20261013-1943.md`.

> STAMP: 생성 2026-10-13 19:43 KST. 모델 gpt-6.1-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 운영 DB·운영 배포 미실행.

## 2026-10-13 QA 반려 뒤 증거 범위 정정

QA-V2-COVERAGE-01에 따라 기존 `11/11 PASS`는 승인 test plan 84건 전체가 아니라 `social-web-first.spec.ts`에 당시 구현돼 있던 선별 11건만 뜻한다고 정정한다. QA 기준 집계는 통과 47, 부분 8, 실패 2, 미검증 27이었다. 미검증 27건은 PG-14, CT-04·05·08·10·11·12, PW-01·08~17, CC-02·03, ST-01~05, REG-CASH-01, REG-PUB-03이다. 이 항목들은 테스트가 추가되거나 QA가 실제로 재실행하기 전까지 PASS로 해석하지 않는다.

production-mode 로컬 QA의 `/my`는 당시 CSP가 local Supabase를 차단해 콘솔 오류 2건이 발생했다. 아래 390×844 `콘솔 오류 0` 증거는 이전 dev-mode 선별 실행에 한정한다. 수정 라운드에서 loopback Supabase origin만 환경별 CSP에 추가했지만, production-mode 브라우저 재실행 전까지 QA-V2-QA-01은 `미검증`이다.

| 항목 | 값 |
|---|---|
| 라인 | `v2` |
| build | 2차 슬라이스, 마이페이지·반증 가능한 업적·소속감 큐 |
| 기준 설계 | `docs/eng-design/{fdd,erd,api-contract,architecture,test-plan}-social-viral-loop-web-first-v1.1.0.md` |
| 승인 디자인 | `docs/design/prototypes/social-viral-loop-v2-opus48.html` |
| 기록 시각 | 2026-10-13 15:54 KST |
| 운영 반영 | 하지 않음. `20261013050000`, `20261013060000` 모두 운영 DB 미적용 |

> STAMP: 생성 2026-10-13 15:54 KST. 모델 gpt-5-codex. 에이전트 code-builder. 스킬 haenael-supabase-build, review. 근거는 v1.1.0 설계 5종, 승인 프로토타입, 로컬 Supabase pgTAP, Chromium Playwright, Storybook 실측이다. 가장 오래 고민한 지점은 업적을 과장된 배지가 아니라 DB 원장에서 다시 계산 가능한 세 지표로 제한하면서도 마이페이지의 성취감을 유지하는 일이었다.

## 1. 구현 결론

마이페이지 `/my`는 프로필 요약, 내 목표, ACTIVE 친구 수, 업적 3종, 아직 응원하지 않은 친구 목표를 한 화면에 제공한다. 업적은 달성 목표 수, 받은 확정 응원 수, ACTIVE 친구 수만 집계한다. 자기신고, 금액, 사용자 간 순위, 연속 기록은 응답과 화면에 없다.

비로그인 `/me/goal/[id]`는 권한없음 상태를 렌더하고 로그아웃 버튼을 노출하지 않는다. 하단탭 마이는 `/my`로 분리되고 현재 pathname으로 활성 상태를 판정한다.

## 2. DB·서버 변경

| 변경 | 구현 | 경계 |
|---|---|---|
| 마이페이지 read model | `my_social_dashboard()` | `authenticated`만 실행, 본인 데이터만 집계 |
| 응원 회원 귀속 | `social_cheer_member_attribution` | client 직접 접근 차단, `service_role`만 기록 |
| 소속감 큐 | ACTIVE 친구의 공개 가능 목표 중 본인이 아직 응원하지 않은 목표 | `due_date`, `goal_id` 순으로 결정적 정렬, 최대 20건 |
| 업적 | CLOSED 목표, 본인 목표의 non-welcome CONFIRMED 응원, ACTIVE 친구 | 원장 count만 사용, 별도 업적 저장·자기신고 없음 |
| 커버 D-019 | FRIENDS는 private object 유지 | ACTIVE 친구 재확인 뒤 Presigned URL, PUBLIC만 공개 버킷 |

신규 additive migration은 `supabase/migrations/20261013060000_social_my_page_achievements.sql`이다. 운영 DB에는 적용하지 않았다.

## 3. 직접 실행 증거

| 증거 등급 | 명령·경로 | 결과 |
|---|---|---|
| 테스트됨 | `supabase db reset --local` | `20261013050000`, `20261013060000` 순서 적용 성공 |
| 테스트됨 | `supabase test db` | 18 files, 322 tests, PASS |
| 테스트됨 | `vitest ...contracts.test.ts` | CT-01 포함 7/7 PASS |
| 테스트됨 | Playwright 선별 social spec | PW-02~07, CC-01, AUTH-GOAL-01, MY-01, SMOKE-01, ORDER-ATTR-01 11/11 PASS, 36.7초. 승인 test plan 84건 전체 PASS가 아님 |
| 테스트됨 | Playwright 독립 재실행 | PW-05, CC-01, ORDER-ATTR-01 3/3 PASS, 순서 의존 없음 |
| 관찰됨 | Chromium 390×844 `/my` | 프로필·목표 1건·업적 3종·소속감 큐 2건·마이 활성 렌더 |
| 관찰됨 | Chromium 390×844 `/my` dev-mode 선별 실행 | 13px 미만 0, 본문 중앙값 16px, 44px 미만 누름 0, active 커버 100%, 가로 넘침 0, 콘솔 오류 0. production-mode는 당시 CSP 오류 2건으로 실패 |
| 테스트됨 | `npx tsc --noEmit` | 오류 0 |
| 테스트됨 | `npm test` | 52 files, 311 tests, PASS |
| 테스트됨 | `deno check supabase/functions/cheer-order/index.ts` | PASS |
| 테스트됨 | 환경변수 정적 계약 | 35/35 분류, 미분류 0 |
| 테스트됨 | `npm run build` | Next.js production build, TypeScript, static generation 17/17 PASS, `/my` 포함 |
| 테스트됨 | `npm run build-storybook` | build 성공, `MyPageOverview` 번들 포함 |
| 테스트됨 | Storybook `MyPageOverview/Normal` 360·390·412·600·700·780·820·900·1000 | 아홉 폭 모두 font·tap·active·overflow·fixed PASS |
| 근거 확인 | `pipeline-artifact-lint.sh` | 상태파일 2개 핀 실체·슬롯키·버전 정합 PASS, 기존 핀 위생 경고 8건 |

Storybook 실측 fixture는 목표 카드 1건, 업적 카드 3건, 소속감 큐 2건을 포함하며 오류 상태가 아니다.

## 4. 프로토타입 대 구현 수치 대조

프로토타입은 형태와 정보 위계를 계승하고, 구현 수치는 `standard-design.md` §17의 모바일 사용성 기준과 `globals.css` 토큰을 우선했다.

| 항목 | 승인 프로토타입 | 구현 | 판정 |
|---|---:|---:|---|
| 프로필 아바타 | 52×52px | 52×52px | 일치 |
| 프로필 이름 | 16px | 16px | 일치 |
| 프로필 내부 간격 | 13px | 12px `gap-3` | 토큰 스케일로 1px 축소 |
| 프로필 카드 padding | 14px | 16px `social-card` | 토큰 스케일로 2px 확대 |
| 프로필 보조문구 | 11.5px | 16px | 모바일 본문 기준으로 확대 |
| 업적 열 수 | 3열 | 3열 | 일치 |
| 업적 grid gap | 10px | 8px `gap-2` | 토큰 스케일로 2px 축소 |
| 업적 카드 padding | 세로 14px, 가로 6px | 세로 16px, 가로 8px | 토큰 스케일로 확대 |
| 업적 아이콘 | emoji 26px | 40px 컨테이너, SVG 20px | 공용 아이콘 구조로 변경 |
| 업적 이름 | 11px | 16px | 모바일 본문 기준으로 확대 |
| 업적 설명 | 9.5px | 16px | 13px 하한과 본문 중앙값 기준으로 확대 |
| 업적 의미 | 횟수·연속·마일스톤 배지 | 달성 목표·받은 확정 응원·ACTIVE 친구 count | D-022에 따라 반증 가능한 원장 집계로 교체 |
| 소속감 큐 위치 | 별도 화면 | `/my` 하위 섹션 | 회장 지시에 따라 마이페이지에서 즉시 행동 가능하게 통합 |
| 하단탭 높이 | 64px | 64px | 일치 |
| 하단탭 아이콘 | 23px, stroke 1.9 | 23px, stroke 1.9 | 일치 |
| 하단탭 라벨 | 10px | 13px | 13px 하한 기준으로 확대 |
| 누름 영역 | 별도 수치 없음 | 최소 44×44px | 모바일 접근성 기준 추가 |

형태상의 차이는 임의 재해석이 아니다. 11.5px 이하 축소 텍스트와 44px 미만 누름 영역을 그대로 복제하면 필수 모바일 실측을 통과할 수 없어, 동일 정보 구조를 유지한 채 정본 토큰으로 올렸다.

## 5. 기존 기능 보존

- 환전 수수료 공식, A안 advisory lock, 계좌 마스킹 코드와 테스트를 변경하지 않았다.
- 기존 목표 관리의 응원 명단, 잔액, 링크, 편집은 PW-02에서 실렌더로 보존을 확인했다.
- FRIENDS 커버는 공개 버킷으로 복사하지 않는다.
- 운영 DB와 운영 환전 데이터에 쓰기 작업을 하지 않았다.

## 6. 남은 경계

- 운영 migration 적용은 회장 승인과 QA 승인 뒤의 별도 비가역 작업이다.
- v1.1.0 설계 5종은 워커가 작성했으며 `pipeline-state.v2.md`의 승인 핀 변경은 컨트롤러가 `/approve` 절차에서 수행해야 한다.
- attribution은 신규 주문에만 기록해 다른 회원의 replay 선점을 차단했다. 정상 경로는 실 Edge Function 왕복으로 확인했다. 주문 생성과 attribution insert의 원자성은 기존 `create_cheer_order` API를 바꾸는 기술설계 의사결정이 필요해 후속 설계 위험으로 남긴다.
- 도입 이전 응원에는 회원 식별 원본이 없어 안전한 backfill이 불가능하다. 소속감 큐의 “응원함” 제외는 이 migration 이후 회원 응원부터 정확하다.
- 이 문서는 build 증거다. 운영 배포 완료를 뜻하지 않는다.

## 7. 벤치마크·자기심문·레드팀

- Supabase Database Functions의 `SECURITY DEFINER`·`search_path` 권고를 차용하고, 함수 execute grant를 인증 역할로 제한했다. https://supabase.com/docs/guides/database/functions
- Supabase SSR 인증의 서버 측 세션 검증 방식을 참고하되, 응원 attribution은 브라우저 신뢰가 아니라 Edge Function의 `auth.getUser(token)` 결과로만 기록했다. https://supabase.com/docs/guides/auth/server-side/creating-a-client?environment=route-handler&framework=nextjs
- 이 결론이 틀릴 가장 그럴듯한 이유는 응원 귀속 누락으로 받은 응원 수가 과소집계되는 경우다. 그래서 집계값을 성취 점수로 저장하지 않고 원장과 attribution에서 매번 계산하며, 누락은 과대 성취가 아니라 보수적 과소표시로 실패하게 했다.
- 까다로운 사용자는 “프로토타입보다 글자가 커서 덜 세련됐다”고 공격할 수 있다. 390px 실제 제품에서 중앙값 16px와 44px 누름 영역을 충족해야 확대 없이 쓸 수 있으므로 가독성을 우선했고, 구조·열 수·핵심 크기는 대조표로 계승 여부를 분리했다.

SKILLS_USED: haenael-supabase-build(Next.js·Supabase 수직 슬라이스와 검증 순서), review(최종 diff 독립 점검), docs(Markdown 산출물 렌더·검수)
SKILLS_SKIPPED: 없음
SOURCES/MODEL: gpt-5-codex · `pipeline-state.v2.md` · FDD/ERD/API/architecture/test-plan v1.1.0 · `DESIGN.md` · 승인 프로토타입 · Supabase Functions/Auth 공식 문서
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 · 정본 Markdown 10종 HTML 렌더 확인
KNOWLEDGE_QUERY: BRAIN `wiki/*/index.md`에서 해낼게·social·achievement 관련 허브를 좁혀 조회하고, Supabase Functions·SSR Auth 공식 문서를 검색했다.
HITS_USED: 승인 v2 프로토타입은 화면 위계와 수치 대조에, Supabase 공식 문서는 함수 권한과 서버 토큰 검증에 채택했다.
HITS_REJECTED: BRAIN 인덱스에는 이 벤처의 이번 build를 직접 바꿀 신규 정본이 없어 제품 ADR·승인 설계를 우선했다.
CONFLICTS: 프로토타입의 9.5~11.5px 텍스트와 10px 탭 라벨은 모바일 13px 하한·본문 중앙값 16px 기준과 충돌해 토큰 기준으로 확대했다.
