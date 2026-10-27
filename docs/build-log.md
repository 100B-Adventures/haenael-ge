# 해낼게 V2 소셜 바이럴 루프 build 로그

## 2026-10-28 S3 독립 코드검토 P1 보완, 독립 QA 대기

- 친구 목표 상세 UI 클릭 직전의 인증 HTTP 사전 요청을 제거했다. 01A는 친구 목록 DOM, 실제 Link 클릭, 최종 URL, 상세 DOM과 목표 제목으로 cold UI navigation을 검증한다.
- F6 정식 verify에 staging `PAYMENTS_ENABLED` 활성화, 전체 Playwright 실행, 종료 처리의 비활성화, HTTP 503 `payments_disabled` 검사를 한 수명주기로 고정했다.
- 최종 E2E SHA-256은 `a5b18a71ed2e3601ed2f29a5e427e5e7ec85c354c0f50a80c76b462598922234`다. 전체 Chromium 17/17, 실패 0, skip 0, exit 0이며 테스트 실행 식별자 `1793117012267` 정리 계수는 모두 0이다.
- 결제 설정 복구 rc 0, 비활성화 확인 503, 외부 결제 호출 0이다. 제품 `web/src`, staging deployment, 운영 환경은 변경하지 않았다.
- v9는 실행 위치를 `web`로 잘못 지정해 정식 명령의 `cd web`이 테스트 시작 전에 실패했다. staging 설정은 바뀌지 않았고, 저장소 루트에서 재실행한 v10만 최종 증거로 채택했다.
- 로그는 `docs/qa/evidence/v2-goal-20261027/S3/logs/haenael-s3-f6-full-v10-gpt-codex-20261028-0055.log`, 데모 허브는 같은 S3 폴더의 `index.html`이다. 독립 QA 전 S3 closed를 선언하지 않는다.

> STAMP: 생성 2026-10-28 01:11 KST. 모델 gpt-codex. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 S3 독립 코드검토 P1, staging Playwright·Supabase, prototype v3.0.0이다. 독립 QA 대기, production 미반영.

## 2026-10-27 S3 친구 초대 전체 E2E, 독립 QA 대기

- 기존 `web/e2e/social-web-first.spec.ts` 안에서 S3 happy path와 거부 경계를 분리했다. happy path는 초대 생성·링크·다른 계정 수락·친구 목록·친구 목표를 실제 UI/API/DB로 검증하고 5단계 PNG를 남긴다. 거부 경계는 잘못된 owner·PRIVATE·REMOVED의 HTTP 404와 비인증 307→landing 200·금지 DOM 0을 보존한다.
- F5 명시 verify는 7/7, skip 0, exit 0이다. 최신 전체 Chromium 회차는 17/17, 실패 0, skip 0, exit 0이다. 최종 namespace `1793090343902`는 DB/Auth/Storage/profile cleanup 전 항목 0이다.
- 관리자 검수 locator는 고정 제목을 버리고 DB의 현재 goal title·owner와 exact asset ID 검증을 연결했다. 최종 회차는 `goalId 669`, asset `102dd934-0c78-4c2a-bbd5-47b3907ba11f`, 승인 CTA visible, 승인 뒤 같은 asset `APPROVED`와 public Storage 69,612 bytes를 확인했다.
- 정리 실패 원인은 승인 asset보다 reviewer member 삭제가 먼저 처리돼 `reviewed_by=NULL`이 상태 제약을 깨뜨린 것이었다. teardown이 namespace goal cover asset을 먼저 삭제하도록 바꿨고, 실패 namespace `1793089655551`도 exact email/goal/payment/asset 범위로 Auth·DB·Storage 0을 재확인했다.
- staging `PAYMENTS_ENABLED`는 ORDER-ATTR 검증 동안만 임시 활성화했다. 종료 시 false 복구 rc 0과 HTTP 503 `payments_disabled`를 확인했고 Toss 호출·실결제는 없었다.
- S3는 제품 `web/src`를 변경하지 않았다. 제품 SHA는 S2 최종 staging과 같아 78파일·439/439 회귀를 재사용했으며 unit 전량을 다시 돌리지 않았다. E2E SHA-256은 `0798c5770875d0eb43801eddd4084f6c5eb15160fcdbbcfdeb6a2f4f34011d7a`다.
- 증거 허브는 `docs/qa/evidence/v2-goal-20261027/S3/index.html`, source manifest는 같은 폴더의 `source-manifest.json`이다. builder 판정은 독립 QA 대기이며 S3 closed가 아니다. production·운영 DB·과금·커밋·STATE 수정은 없다.

> STAMP: 생성 2026-10-27 17:46 KST. 모델 gpt-codex. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 prototype v3.0.0, staging Playwright·Supabase Auth/API/DB/Storage, S2 최종 제품 소스와 회귀다. 독립 QA 대기, production 미반영.

## 2026-10-27 S2 프로필·커버 실제 쓰기 검증, 독립 QA 재검수 대기

- 기존 구현을 확인한 결과 `/my` 프로필 이름·소개·사진, semantic preset 커버, 실제 Storage 커버 업로드와 관리자 승인 경로가 이미 제품에 연결돼 있었다. 제품 소스는 바꾸지 않고 `web/e2e/social-web-first.spec.ts`에 실제 흐름의 영속성·DB·Storage assertion과 단계별 캡처만 보강했다.
- F3는 MY-01과 PW-03 2/2, skip 0이다. MY-01은 이름·소개 저장과 reload, 실제 사진 sign→PUT→finalize, preset 복귀를 검증했다. PW-03은 건강 preset의 저장 완료, reload, 공개 목표 반영을 검증했다.
- F4는 PW-04와 PW-05 2/2, skip 0이다. 실제 69,612 byte JPEG를 quarantine Storage에 올리고 finalize 200·DB `REVIEW`·active cover 불변을 확인했다. 관리자 승인 뒤 DB `APPROVED`, goal active asset, public Storage 69,612 bytes, owner·public 이미지 완전 로드를 확인했다.
- `/my`와 인증된 `/me/goal/{id}`를 각각 360·390·412·600·700·780·820·900·1000px에서 측정했다. 18/18 모두 13px 미만 0, 본문 토큰 16px, 44px 미만 누름 0, active 100%, 가로 overflow 0, fixed overlap 0, 하단 clearance 80px다. 중앙값 13px은 참고값으로만 기록했다.
- 승인 prototype과 실제 제품을 프로필 display와 건강 커버 display 각각 같은 390×844, scroll top 0, 이미지 완전 로드 상태로 대조했다. 픽셀 변화율은 프로필 21.53%, 커버 44.60%이며 fixture 데이터 차이 경계를 JSON에 함께 기록했다.
- 현재 `web/src`는 staging deployment `dpl_2QeUAd65Qn4Tcfs9SvCuZaFWmbC3`의 S1 올바른 snapshot과 diff exit 0이다. S2 제품 소스 변경과 재배포가 없으므로 S1 04:03 전체 회귀 78파일 439/439를 재사용했다. E2E TypeScript 보강은 최종 `npx tsc --noEmit --pretty false` exit 0으로 확인했지만 empty-success stdout은 별도 로그 파일로 남기지 못했다.
- 실패 이력은 MY-01 timeout 1회, PW-03 저장 완료 전 reload race 1회, PW-05 닫힌 context locator 로깅 1회다. 모두 테스트 계약·증거 수명 문제로 기존 E2E 안에서 고쳤고 동일 항목 3회 실패는 없었다.
- 증거 허브는 `docs/qa/evidence/v2-goal-20261027/S2/index.html`, source manifest는 같은 폴더의 `source-manifest.json`이다. builder가 S2 PASS를 자가 선언하지 않으며 독립 qa-verifier 재검수 대기다. S1 보존, S3 미수정, production·운영 DB·과금·커밋·상태 파일 수정 없음.
- 데모 허브는 headless Chromium으로 1회 렌더했다. 표시 이미지 19개가 모두 완전 로드됐고 console error 0, 가로 overflow 0, 상태 배지 `독립 QA 재검수 대기`를 확인했다.

증거: `docs/qa/evidence/v2-goal-20261027/S2/logs/F3-MY-01-PW-03-attempt-3.log`, `F4-PW-04-PW-05-attempt-2.log`, `env-check.log`, `served-source-diff.log`, `captures/flow/`, `source-manifest.json`.

> STAMP: 생성 2026-10-27 04:49 KST. 모델 gpt-codex(API model ID 미노출). 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 승인 prototype v3.0.0, staging Playwright·Supabase Auth/API/DB/Storage, 정본 mobile ergonomics 기준, S1 전체 회귀다. production 미반영, 독립 QA 재검수 대기.

## 2026-10-27 S1 독립 QA 반려 보완, 재검수 PASS

- 독립 QA의 QAS1-01~04를 대상으로 S1만 보완했다. `web/e2e/social-web-first.spec.ts`의 PW-02 한 실행에서 owner 로그인, 목표 관리 상단, 편집 입력, 저장, reload 제목 보존, 응원자 8명 preview, 18명 전개와 pill 18개 assertion을 연속 검증하고 단계별 PNG 6장을 남겼다.
- 인증된 `/me/goal/{id}` 화면을 360·390·412·600·700·780·820·900·1000px에서 측정했다. 9폭 모두 13px 미만 글자 0, 본문 토큰 `.font-designer-14r` 16px, 44px 미만 누름 0, active coverage 100%(27개 규칙), 가로 overflow 0, 하단 clearance 80px다. 글자 중앙값 13px은 참고값이며 정본 판정 축이 아니다.
- 승인 prototype과 staging을 같은 390×844 viewport, 같은 응원자 목록 전개 상태, 첫 card top 72px로 캡처했다. prototype은 11행, 실제 fixture는 18행이며 이름·횟수 데이터도 달라 픽셀 변화율은 22.14%, 평균 채널 차이는 10.42다. 이 데이터 차이를 숨기지 않고 manifest에 기록했다.
- 응원자 pill의 기존 정합 수정과 실제 active 누락 보완은 유지했다. 정본에 없는 `median_font >= 16` 기준으로 이름·메시지·날짜를 16px로 키운 CSS 3곳은 기존 `text-label-small`·`text-meta-micro` 토큰으로 복구했다. 잘못된 snapshot `/private/tmp/haenael-s1-remediation-20261027-mCP7b6`은 staging alias에 연결하지 않았고 증거에서도 제외했다.
- 올바른 snapshot을 Vercel preview `dpl_2QeUAd65Qn4Tcfs9SvCuZaFWmbC3`로 build·배포해 staging alias에 연결했다. health는 HTTP 정상, version 2.0.0, database ok, Supabase project `ezzklgotgydwxqebfoys`다. production 배포는 하지 않았다.
- 기능 검증은 F1 PW-02 1/1, skip 0이다. F2 2/2는 독립 QA 통과 증거를 재사용했으며 인증 로직은 바뀌지 않았다. active CSS 변경 때문에 QA 계약과 전체 Vitest를 1회 재실행해 78파일 439/439를 통과했다.
- F1 연속 실패는 1회다. 제품 결함이 아니라 정본과 충돌하는 median assertion을 새로 만든 테스트 계약 오류였다. 검사 범위를 축소한 것이 아니라 정본 `fontBelow13=0`과 본문 토큰 16px, tap·active·overflow·fixed-bottom 축으로 복원했다.
- 공식 build-log 미기록은 이 항목으로 해소했다. 독립 qa-verifier가 현재 staging F1을 1회 재실행해 1/1 PASS, skip 0과 QAS1-01~04 해소를 확인했고 S1을 closed로 판정했다. 04 reload 캡처의 cover loading은 비차단 데모 품질 제한으로 기록했다. S2/S3, 상태 파일, 운영, 과금, 커밋은 건드리지 않았다.

증거: `docs/qa/evidence/v2-goal-20261027/S1/logs/F1-PW-02-remediation-corrected.log`, `full-regression-remediation.log`, `staging-remediation-correct-deploy.log`, `staging-remediation-correct-alias.log`, `staging-remediation-health.json`, `captures/flow/`, `source-manifest.json`.

> STAMP: 생성 2026-10-27 04:15 KST. 모델 gpt-codex(API model ID 미노출). 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 독립 QA 반려보고, 승인 prototype v3.0.0, 정본 mobile ergonomics 측정기, staging Playwright·Vercel build·Vitest 실측이다. 운영 미반영, builder 제출 시 독립 재검수 대기.

> 독립 재검수 STAMP: 2026-10-27 04:23 KST. 모델 gpt-codex(API model ID 미노출). 에이전트 qa-verifier. 스킬 qa·review. 근거는 독립 F1, 캡처 01~08, source manifest, 정본 측정기, 회귀·배포 로그다. 판정 PASS, S1 closed, production 미반영.

## 2026-10-25 승인 프로토타입 v3 구현과 free staging 실제 검증

- `docs/design/prototypes/social-viral-loop-v3-opus5.html`을 화면·상태의 SSOT로 삼아 목표 관리, 마이페이지, 친구 목록·상세, 초대, 공개 목표, 랜딩, 관리자 화면을 다시 맞췄다. 최종 독립 source review와 390px 승인본 9장 대 제품 9장 직접 대조는 신규 finding 0으로 종료됐다.
- free Supabase staging `ezzklgotgydwxqebfoys`와 Vercel preview alias에서 실제 Auth·DB·Storage·Edge Function 쓰기 경로를 실행했다. 운영 Supabase·운영 Vercel·실결제·실은행 송금은 건드리지 않았다.
- 원격 E2E는 한 번의 전체 PASS로 과장하지 않는다. 이전 고유 10건, 최신 소스 영향 재검증 `PW-02`·`MY-01`, `SMOKE-01`, viewport, `PW-05`, `PW-06`·`PW-07`·`CC-01`·`ORDER-ATTR-01`의 분할 로그를 합쳐 고유 17건을 닫았다. 마지막 4건은 4/4, 커버 승인은 1/1, viewport는 1/1이다. 각 wrapper는 테스트 뒤 `PAYMENTS_ENABLED=false` 복구와 무인증 요청 503 `payments_disabled`를 확인했다.
- 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000px 모바일 사용성은 9/9 통과했다. 캡처 폴더에는 승인 390px 9장, 제품 기본 화면 390·1024·1280 각 9장과 마이페이지 하위 상태 2장, 총 39장이 있다.
- 최종 앱 회귀는 Vitest 78파일 439건, Next.js production build, TypeScript를 통과했다. Storybook 정적 build는 21 stories·9 titles로 통과했고, title 누락 0건이다. 컴포넌트 인벤토리는 HEAD 직접 7/42(16.7%)에서 현재 직접 8/46(17.4%)로 증가했다. 새 공용 `WordmapCloudLayout`은 병설 스토리의 Default·Empty·LongWords와 기존 `Wordmap` 렌더 트리 양쪽에서 확인한다.
- 디자인 lint는 기존 전역 부채를 숨기지 않는다. 신규 디자인 토큰 위반은 0건이지만 기존 10px·inline style·off-token hex 경고는 남아 있다. 실제 Kakao OAuth, Toss Payments 승인 API, 실은행 송금, production 배포와 production QA는 아직 하지 않았다.

증거: `docs/qa/evidence/v2-ssot-20261025/web-unit-full-v9-final-20261025.log`, `web-build-v9-final-why-weight-20261025.log`, `staging-e2e-20261025-{122808,123617,124755,125645,125815}.log`, `staging-e2e-control-20261025-{123617,124755,125645,125815}.json`, `captures-v10-staging-20261025-124745/`, `storybook-build-v10-final-naming-20261025.log`, `storybook-typecheck-v10-final-20261025.log`, `docs/design/component-inventory-v1.0.0.md`.

> STAMP: 생성 2026-10-25 13:15 KST. 모델 gpt-5.6-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 승인 프로토타입 v3, DESIGN.md, free Supabase staging, Vercel preview, Playwright, Vitest, Next.js, Storybook 실측이다. 운영 미반영.

## 2026-10-25 V2 승인 시안 재정렬·로컬 production 검증 종료

- Next.js는 보안 패치 버전 `16.4.1`로 고정했고 `sharp`는 `0.35.5`를 유지했다. 최종 production build는 컴파일·TypeScript·정적 페이지 18/18을 통과했다.
- 승인 FDD v1.2.5의 AU-03에 따라 비로그인 `/me/goal/<양의 정수>`만 권한 안내 화면까지 통과한다. 익명 화면의 목표 관리 본문·응원·잔액·소유자 데이터·법적 고지 DOM은 0건이고, 다른 `/me` 경로는 계속 인증으로 보호된다.
- 승인 프로토타입 v3의 공개 화면 순서, 목표 커버 기본 접힘, 목표·WHY 인라인 편집, 목표·친구 워드맵 순서, 관리자 핵심 큐 우선순위, D-031-A 마이페이지 구조를 제품에 반영했다. 친구 응원자 사진은 서버 응답에 신원 데이터가 없으므로 중립 아이콘으로 바꾸고 실제 응원 수 0·1·2·4를 단위 테스트로 고정했다.
- `/my`는 `마이페이지`·하단 탭 `마이`로 맞추고 중복 목표 블록을 제거했다. 기존 `member.nickname`과 `member.profile_image`만 사용해 이름과 4개 승인 프리셋 사진의 저장·새로고침·실패 후 재시도를 구현했다. 사진 선택기의 세로 이미지는 실제 DOM에서 44px 버튼 밖으로 11.328px 늘어나는 결함을 발견해 절대 배치 40×40, 넘침 0으로 고정했다.
- `/my` 390px 실측은 본문 토큰 16px, 13px 미만 글자 0건, 44px 미만 터치 대상 0건, 눌림 상태 적용률 100%, 가로 넘침 0건, console error 0건이다. 이름 버튼의 첫 production CSS에는 source의 `min-width`가 빠져 실제 41.2×44px로 렌더됐다. 제거 주체는 규명하지 못했으며, logical sizing으로 바꾼 served CSS와 짧은·긴 이름 DOM을 재검증했다.
- 데이터가 있는 공개 목표에서 공식 모바일 측정기를 360·390·412·600·700·780·820·900·1000px로 실행해 9/9 통과했다. 최종 캡처는 390·1280 기본 화면 18장과 390 이름 편집·사진 선택 2장, 합계 20장이다. 전부 DPR 3이며 물리 크기와 SHA-256은 `captures-ui-rework-final-all-20261025-0245/manifest.tsv`에 기록했다. 목표 상세 캡처는 cover·인라인 목표/WHY·워드맵·잔액을 기다린 뒤 저장해 skeleton을 증거로 쓰지 않았다.
- 기능·반응형 검증 통과는 승인 시안과의 디자인 전체 일치를 뜻하지 않는다. 승인 목표 관리 화면은 작은 사진 커버 안의 편집 overlay, 제목 1회, inline WHY 구조인데 제품은 별도 대형 커버 카드와 하단 편집 버튼, 제목 중복, 독립 WHY 박스로 남아 있다. 마이페이지도 승인 시안과 간격·아이콘 표현이 다르다. 승인 시안 `approved-goal-detail.png`·`approved-mypage.png`와 최종 제품 `dev-goal-detail-390.png`·`dev-mypage-390.png`를 직접 대조한 결과이므로 디자인 출고는 보류한다.
- Playwright는 소셜 15/15와 다중 목표 2/2를 별도 실행해 합계 17건의 미실행이 0이다. 최종 CSS 뒤 MY-01과 390·1280 캡처 회귀도 통과했다. 신규 주문 201·재실행 200·최초 회원 귀속, Storage upload/finalize, 관리자 승인, 공개범위, 동시 초대, 경보를 포함한다.
- 전체 Vitest 실행은 72파일 407건 중 406건 통과, 승인된 커버 선택기 기본 접힘을 반영하지 않은 기존 카피 테스트 1건 실패였다. 테스트가 `배너 바꾸기`를 누른 뒤 사용자 라벨을 검사하도록 교정했고 해당 파일 3/3을 표적 재검증했다. 제품 소스는 그 사이 바뀌지 않았다. 기존 React `act(...)` 경고는 남아 있다.
- 최종 backend 회귀는 pgTAP 22파일 412건을 통과했다. Storage cleanup 출고 조건 5개 명령과 `create_goal` 동시 세션도 통과했으며, 동시 생성은 1건 성공·1건 상한 거절·ACTIVE 목표 총 3건을 관찰했다. E2E fixture는 실행별 UUID·run ID·Storage prefix만 정리하며 최종 잔여는 0이다.
- 후속 backend slice에서 프로필 한 줄 소개와 실제 사진 sign→PUT→finalize, 친구 목록의 최근 비익명 직접 메시지, 승인 프로토타입 semantic 8개 커버와 legacy `c1..c6` 호환을 구현했다. 받은·보낸 응원 내역, supporter별 횟수·최신 메시지·고유 인원수, owner-only 목표 종료, 고객센터 탈퇴 사전 확인도 같은 migration 계약으로 연결했다.
- 프로필 사진은 5 MiB·JPEG/PNG/WebP·magic bytes·SHA-256·owner를 검증한다. 동시 정상/오류 finalize에서 ACTIVE Storage object와 member metadata가 일치했고, 타인 asset은 404, 잘못된 bytes는 415, signed upload URL 재사용은 차단됐다. 실패·교체·member 삭제 자산은 token 만료 뒤 cleanup worker가 회수한다.
- 실제 로컬 HTTP 경로에서 sign 200, Storage PUT 200, 정상 finalize 200, 동시 오류 hash 422, 타인 finalize 404, 잘못된 magic bytes 415를 관찰했다. cleanup worker는 profile queue 1건을 claim해 Storage object를 삭제하고 DB를 `DONE`으로 전이했으며, 동시 claim·cron·재시도 경계도 통과했다.
- Kakao 재로그인은 기존 사용자 nickname과 profile image를 원자적으로 보존하고 빈 값만 provider 기본값으로 채운다. client의 `member.profile_image` 직접 UPDATE 권한은 회수하고 service-role activation으로 단일화했다.
- 운영 배포와 운영 Supabase 쓰기는 실행하지 않았다. free Supabase staging에는 54번째 migration과 서버 Edge Functions 16개를 배포했고 신규 RPC 존재·EXECUTE 권한을 실측했다. staging의 실제 sign→Storage PUT→finalize 쓰기 경로는 frontend E2E 판정 전까지 미검증이며 production에는 적용하지 않았다.

증거: `docs/qa/evidence/v2-goal-20261024/web-build-ui-rework-final4-20261025-0254.log`, `e2e-ui-rework-final2-20261025-0226.log`, `e2e-ui-rework-final2-multigoal-20261025-0229.log`, `e2e-ui-rework-my-capture-final4-20261025-0256.log`, `e2e-ui-rework-capture-final-all-20261025-0245.log`, `unit-final-ui-rework-20261025-0258.log`, `unit-user-facing-copy-target-20261025-0243.log`, `captures-ui-rework-final-all-20261025-0245/`, `docs/qa/evidence/v2-ssot-20261025/server-contract-final/server-contract-handoff-v1.0.0-gpt-codex.md`.

> STAMP: 생성 2026-10-25 KST. 모델 gpt-5.6-sol, gpt-codex. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 승인 프로토타입 v3·DESIGN.md·FDD v1.2.5·로컬 Next production 서버·Playwright·Vitest·Supabase DB·Storage runtime. 운영 미반영.

## 2026-10-22 core 감사 재오픈 P0/P1 보정

- D-017 환전 경계를 서버 전용 `CASHOUT_ALLOWED_MEMBER_IDS` allowlist로 옮겼다. 값이 없거나 잘못됐거나 preview이면 기본 거부하고, Server Action 직접 호출도 DB 쓰기 전에 같은 판정을 다시 한다.
- 일반 계정은 기존 잔액·진행 중 신청·이력을 회수할 수 있지만 신규 신청 폼은 열리지 않는다. 승인된 읽기 상태를 삭제했던 1차 구현은 Claude 교차 리뷰 BLOCK 뒤 되살렸다.
- 아동·청소년 보호 정책 실본문과 개인정보처리방침의 카카오·솔라피 운영 정합을 반영했다. 환전 조회 4종, 상태, 이력의 오류 위장 회귀 테스트를 추가했다.
- 실제 Next production 서버 기반 환전 Playwright는 허용 계정 쓰기와 **일반 계정 화면 비노출**을 포함해 13/13 통과했다. 브라우저 검사가 단언한 것은 화면에 신청 폼이 없다는 것이고, 화면을 거치지 않은 Server Action 직접 호출의 거부는 `__tests__/actions.real-gate.test.ts` 가 게이트를 목으로 치환하지 않고 환경변수부터 판정까지 실제로 실행해 5/5 로 단언한다(교차 리뷰 MAJOR-2 정정). 웹 전체 회귀는 70파일 387/387, 로컬 pgTAP은 21파일 369/369, 환경·돈 계약 mutation은 8/8 통과했다. Next production build와 Storybook 정적 build도 통과했다.
- 환경 계약 검사는 `qa/contracts/deploy-env.contract.json`의 `sourceRoots`인 `web/src`와 `supabase/functions`를 재귀 순회한다. 이번 실행은 코드 환경변수 39개를 발견해 39개 전부 분류했고, 한 파일만 읽는 축소 검사가 아니다.
- 감사 레지스트리 P0/P1 17행 가운데 15행을 닫았다. `supporter_name_visibility`·`message_visibility`와 1회 `thanks_message` 채널은 스키마·정책 결정이 승인되지 않아 회수 필요로 남겼다.
- 워커는 운영 Supabase 쓰기와 운영 배포를 실행하지 않았다. 그 뒤 컨트롤러가 회장 승인으로 웹을 운영에 배포했다.

- 비활성 안내 본문을 "환전 기능이 열리면 여기에서 바로 알려드릴게요" 에서 "쌓인 클로버는 그대로 보관됩니다" 로 바꿨다. 허용 목록 밖 계정에게 알림을 약속할 근거가 없기 때문이다. 승인 프로토타입에 준비 중 상태가 없어 대조 정본이 없으므로 이 줄로 사유를 남긴다(교차 리뷰 지적).
- 자격 조회가 오류 없이 빈 응답을 주는 경우도 실패로 센다. `loadFailed` 에 자격 부재를 더하고 빈 응답 주입 테스트를 넣었다. 전화번호 조회 실패는 폼 프리필 전용이라 전체 실패로 승격하지 않는다(교차 리뷰 MAJOR-1).
- 전역 스위치가 켜졌는데 허용 목록이 비면 전원 거부이므로 그 조합을 경고로 드러낸다. 배포 환경 계약에도 조건부 필수로 표기했다(값은 Secret 이라 검사가 차단하지 못하고 목록으로만 드러낸다).

> STAMP: 생성 2026-10-22 KST. 모델 gpt-6.1-sol 과 claude-opus-5[1m](교차 리뷰 지적 반영분). 에이전트 code-builder. 스킬 haenael-supabase-build·review. 근거는 감사 v1.0.0, D-017, 로컬 Supabase·Vitest·Next·Playwright, Claude 교차 리뷰. 운영 반영됨(커밋 44b38e8 이 main 에 머지돼 웹이 배포됐다).

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
