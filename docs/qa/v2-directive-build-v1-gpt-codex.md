# 해낼게 V2 화면별 지시 반영 build 결과

> **판정: 로컬 build 일치 10, 불일치 0, 미확인 0.** 회장 화면별 지시를 제품 코드와 승인 프로토타입에 반영했고, 390px production-mode 실화면 8개를 직접 열어 확인했다. 운영 DB 쓰기와 배포는 실행하지 않았다.

기반 포맷: `docs/qa/v2-approved-build-realignment-v5-gpt-codex.md`

## 1. 지시별 판정

| 번호 | 지시 | 판정 | 직접 증거 |
|---|---|---|---|
| 1 | 하단탭 기준 수립 | 일치 | `docs/design/standard-bottom-tab.md`에 Apple·토스·당근·Instagram·카카오페이·Airbnb 공식 근거와 전체 화면 판정표를 기록했다. |
| 2 | 환전 하단탭 제거·다음 행동 | 일치 | `/cashout` 실화면에서 하단탭 0, `해낼게 관리로 돌아가기` CTA를 확인했다. 환전 E2E 12/12가 통과했다. |
| 3 | 워드맵 전체 표시·빈도 가중·정서 모션 | 일치 | 23개 메시지가 모두 렌더됐다. 16·20·26px 3단계와 색 농도를 적용했고, 하트·부유 모션 및 `prefers-reduced-motion` 정지를 구현했다. |
| 4 | 공개 목표 정보 위계 | 일치 | 하단탭 유지, 배너·D-29·진행 중·목표·WHY·응원 36명·워드맵을 390px 실화면에서 확인했다. |
| 5 | 마이페이지를 해낼게 관리로 재정의 | 일치 | 제목·탭을 `해낼게 관리`로 통일했다. 목표별 꾸밈·D-day·상태·WHY·정확한 응원 인원·공유하기를 확인했고 긴 제목은 `keep-all`로 보정했다. |
| 6 | UX writing 기준과 전 화면 문구 교체 | 일치 | `docs/design/standard-ux-writing.md`를 만들고 `열리는 것들`, `열리는 자리`, `왜요`를 제거했다. 목표 이유 라벨은 `WHY`로 통일했다. |
| 7 | 친구 목록·상세 정보 과다 제거·엣지 처리 | 일치 | `서로 응원`, `연결된 친구` 중복을 제거했다. 0명·다수·긴 닉네임·이미지 없음·공개 목표 없음·다중 목표 상태를 계약 테스트로 고정했다. |
| 8 | 업적 생동감, D-022 3지표 유지 | 일치 | 아이콘·색·카드 위계를 보강하고 `완료한 목표`, `받은 응원`, `친구` 3지표만 유지했다. |
| 9 | 승인 프로토타입 갱신 | 일치 | `docs/design/prototypes/social-viral-loop-v2-opus48.html` 상단에 D-025 사유를 남기고 제품 변경과 같은 구조·문구로 갱신했다. |
| 10 | 390px 캡처·회귀·결정 보드 | 일치 | 8개 full-page PNG, 메모 입력 8개가 있는 HTML 보드, 본 보고서를 만들고 전체 회귀를 다시 통과했다. |

## 2. 기존 기능 확인과 보존

- 기존 `ReceiverBottomNav`, `Wordmap`, 공개 목표, 친구, 관리, 업적, 환전 컴포넌트를 확장했다. 새 IA나 병렬 화면을 재창조하지 않았다.
- 환전 수수료 10%(VAT 포함), 이용료 차감 후 원천징수, 계좌 마스킹 단정을 변경하지 않았다.
- FRIENDS 커버 비공개, D-022 3지표, 공개 목표 하단탭 유지 결정을 보존했다.
- 운영 migration, Edge Function, 운영 데이터, 배포 설정은 변경하지 않았다.

## 3. 카카오 전화번호 동의 UI 확인

`web/src/app/(receiver)/me/page.tsx`는 `member.phone`을 조회한 뒤 `hasPhone={Boolean(member.phone)}`을 `PhoneConsentNotice`에 전달한다. 컴포넌트는 `hasPhone`이 참이면 즉시 `null`을 반환한다.

`web/src/app/(receiver)/me/__tests__/page.test.tsx`는 전화번호가 저장된 `/me` 응답에서 동의 안내 DOM이 0개인지 직접 검증한다. 실제 local Supabase Auth를 사용한 환전 E2E에서는 다음을 확인했다.

- 전화번호 없는 회원: 동의 안내 노출.
- 전화번호 있는 회원: 동의 안내 DOM 0개.
- 카카오 재동의 뒤에도 번호가 없을 때: 직접 입력 폴백 노출.
- 저장 전화번호가 있을 때: 환전 폼에 기존 번호 프리필.

판정은 **일치**다. 카카오 가입 과정에서 전화번호가 이미 저장된 사용자에게 동의 안내 UI가 뜨지 않는다.

## 4. 친구 엣지 케이스

| 상태 | 처리 |
|---|---|
| 친구 0명 | 빈 상태와 친구 초대 다음 행동을 제공한다. |
| 친구 다수 | 행을 반복 렌더하고 친구 수를 상단 한 번만 표시한다. |
| 긴 닉네임 | 한 줄 말줄임으로 레이아웃을 보호하고 `title`에 원문을 유지한다. |
| 프로필 이미지 없음 | 이니셜 fallback을 표시한다. |
| 공개 목표 없음 | 목표 없음 상태를 표시하고 상세 진입을 만들지 않는다. |
| 목표 다수 | 대표 공개 목표 한 건을 명시적으로 표시하고 행 정보를 중복하지 않는다. |

## 5. 직접 실행 증거

| 검증 | 결과 | 로그·산출물 |
|---|---|---|
| Vitest 전체 | 59파일, 341/341 PASS | `/tmp/haenael-v2-full-vitest-final.log` |
| pgTAP 전체 | 19파일, 336/336 PASS | `/tmp/haenael-v2-pgtap-final.log` |
| Next.js production build | PASS, 모든 route compile·typecheck·route manifest 생성 | `/tmp/haenael-v2-next-build-4.log` |
| 환전 Playwright | 12/12 PASS | `/tmp/haenael-v2-cashout-e2e-final.log` |
| production-mode 실화면 | 8/8 HTTP 200, console error 0, page error 0, overflow X 0 | `docs/qa/evidence/v2-directive-build-v1-gpt-codex/capture-results.json` |
| 하단탭 판정 | 공개 목표·관리·친구·업적 유지, 환전·워드맵 숨김 | 같은 capture 결과 |
| 결정 보드 렌더 | 이미지 8개 정상 로드, 메모 입력 8개, console error 0 | `docs/qa/evidence/v2-directive-build-v1-gpt-codex/board-render.png` |
| 디자인 토큰 | 170파일, 기존 위반 58, 신규 0, 기준선 대비 12 감소 | `/tmp/haenael-v2-design-tokens-final.log` |
| design-lint | 실행 PASS. 기존 8pt·inline style·hex 범주 3종 경고는 남음 | `/tmp/haenael-v2-design-lint-final.log` |

### 모바일 사용성 원문 수치

데이터가 있는 공개 목표에서 목표 카드 1개, 실제 응원 워드 23개, 오류 문구 0을 먼저 확인한 뒤 측정했다.

| 폭 | 글자 중앙값 | 13px 미만 | 44px 미만 누름 | 눌림 상태 | 가로 넘침 | 판정 |
|---:|---:|---:|---:|---:|---:|---|
| 360 | 16px | 0 | 0 | 100% | 0 | PASS |
| 390 | 16px | 0 | 0 | 100% | 0 | PASS |
| 412 | 16px | 0 | 0 | 100% | 0 | PASS |
| 600 | 16px | 0 | 0 | 100% | 0 | PASS |
| 700 | 16px | 0 | 0 | 100% | 0 | PASS |
| 780 | 16px | 0 | 0 | 100% | 0 | PASS |
| 820 | 16px | 0 | 0 | 100% | 0 | PASS |
| 900 | 16px | 0 | 0 | 100% | 0 | PASS |
| 1000 | 16px | 0 | 0 | 100% | 0 | PASS |

## 6. 프로토타입 대 구현 diff

| 구분 | 차이 | 판정 |
|---|---|---|
| 제품 구조·문구 | 회장 D-025 지시를 프로토타입과 구현 양쪽에 같은 내용으로 반영 | 일치 |
| fixture 숫자 | 프로토타입 예시값과 local fixture의 응원 인원은 다를 수 있음 | 정상 데이터 차이 |
| 동작 | 프로토타입의 정적 상태와 달리 제품은 실제 라우팅·RPC·Auth를 사용 | 정상 구현 차이 |
| 운영 배포 | 수행하지 않음 | 미반영 |

## 7. 벤치마크와 자체 검증

- [Apple HIG Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)와 [WWDC22 navigation](https://developer.apple.com/videos/play/wwdc2022/10001/)에서 최상위 탐색과 자기완결 과업을 분리했다.
- 토스·당근·Instagram·카카오페이·Airbnb의 공식 페이지는 서비스별 세부 탭 상태가 버전과 실험군에 따라 달라질 수 있어, 화면 복제가 아니라 공통 원리만 채택했다.
- BRAIN의 유저심리 6단계와 공유장벽 문서에서 실제 사람의 메시지와 낮은 공유 장벽을 채택했다. 가짜 희소성이나 감정 단정은 사용하지 않았다.

셀프심문: 이 결과가 틀렸다면 가장 가능성 높은 이유는 캡처용 fixture가 실제 제품 데이터 분포를 충분히 대표하지 못하는 것이다. 그래서 0명·다수·35명·긴 문자열·이미지 없음·23개 워드 상태를 테스트와 캡처에 분리해 넣었고, 운영 반영은 완료라고 부르지 않았다.

레드팀: 까다로운 사용자는 “예쁘게 보이기만 하고 실제 버튼이 죽었거나 돈 흐름이 깨졌다”고 공격할 수 있다. 전체 Vitest, 실제 local Auth 기반 환전 12건, pgTAP 336건, production-mode 브라우저 8경로를 다시 실행해 이 공격을 막았다.

## 8. 남은 경계와 다음 단계

- 이 결과는 local build 검증이다. QA 게이트 승인과 운영 배포는 별도 단계이며 아직 수행하지 않았다.
- design-lint의 기존 경고 3범주는 이번 변경에서 신규 위반 0건이지만, 저장소 기준선 부채로 남아 있다.
- 다음 실행 소유자는 QA verifier다. 종료 증거는 이 8화면의 독립 육안 대조와 쓰기 경로 재검증이다.

🏷 STAMP | line: v2 | 생성: 2026-10-15 22:19 KST | model: gpt-codex/gpt-6.1-sol | agent: code-builder | skill: haenael-supabase-build | 근거: 회장 지시 원문, 승인 프로토타입, local Supabase, production-mode Next.js, Apple·토스·당근·Instagram·카카오페이·Airbnb 공식 자료 | 고민: 탐색 탭의 일관성과 거래·몰입 화면의 집중을 하나의 판정 기준으로 만들고 전 화면에 적용했다.

SKILLS_USED: haenael-supabase-build, Next.js+Supabase 수직 슬라이스의 코드·계약 테스트·local DB·production-mode E2E 검증 순서에 사용
SKILLS_SKIPPED: review, PR landing·push가 아니라 build 산출물 마감이므로 별도 pre-landing 리뷰는 실행하지 않음
SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/chairman-directives-v2-20261015.md` | `pipeline-state.v2.md` | `DESIGN.md` | `docs/design/prototypes/social-viral-loop-v2-opus48.html` | `wiki/거버넌스/결정.md` | BRAIN PMF·유저심리·공유장벽 문서 | Apple·토스·당근·Instagram·카카오페이·Airbnb 공식 페이지
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, 390px 제품 캡처와 HTML 보드를 Chromium에서 렌더해 육안 확인함
KNOWLEDGE_QUERY: BRAIN에서 해낼게 도네이션 PMF·유저심리 6단계·공유장벽을 조회하고, Apple·토스·당근·Instagram·카카오페이·Airbnb의 탐색·거래 내비게이션 근거를 검색
HITS_USED: BRAIN의 실제 응원 메시지·낮은 공유장벽 원칙과 공식 자료의 최상위 탐색 대 자기완결 과업 구분을 채택
HITS_REJECTED: 비공식 앱 캡처와 버전이 불명확한 블로그는 탭 상태를 확정할 근거가 약해 미채택
CONFLICTS: 기존 승인 프로토타입과 회장 D-025 지시가 충돌해 회장 지시를 우선하고 프로토타입 상단에 변경 사유를 기록
판단: 하단탭을 화면명으로 나누지 않고 탐색 지속성·상태 손실 위험·다음 행동의 세 조건으로 판정했다. 모든 상세 화면을 일괄 숨기는 안은 친구 탐색을 끊어 폐기했다.
병목: 응원 인원수가 preview 상한 20으로 잘리던 기존 조회를 exact count로 바꾸고 35명 fixture로 다시 렌더한 검증이 가장 오래 걸렸다.
