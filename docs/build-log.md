# 해낼게 V2 소셜 바이럴 루프 build 로그

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
