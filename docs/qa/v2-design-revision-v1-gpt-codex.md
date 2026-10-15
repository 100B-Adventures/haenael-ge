# 해낼게 V2 디자인 단계 프로토타입 개정 1차

> **판정: 지시 9건을 로컬 프로토타입과 제품 화면에 반영했고, 디자인 승인 대기 상태다.** 승인 프로토타입을 먼저 개정한 뒤 제품 코드를 같은 계약에 맞췄다. 운영 DB 쓰기와 배포는 실행하지 않았다.

기반 포맷: `docs/qa/v2-directive-build-v2-gpt-codex.md`

## 1. 지시별 판정

| 번호 | 지시 | 판정 | 직접 증거 |
|---|---|---|---|
| 1 | 하단탭 화면에서 전역 푸터 제거 | 일치 | 하단탭·푸터 공존 가능 경로 9개를 전수 분류했다. 제품 캡처 8개에서 동시 노출 0건이다. |
| 2 | 공개 목표 제목을 v1 크기·위치로 복원 | 일치 | `v1-goal-390.png`의 제목 선행 구조를 적용했다. 27px 제목, 상태 칩, WHY, 커버 순서를 프로토타입과 제품에서 직접 확인했다. |
| 3 | 친구 관계 방향 표시 | 일치 | 친구 목록과 상세에 `내가 응원함`이 실제 local DB 귀속 기록으로 렌더됐다. outgoing, incoming, mutual, invited 경계를 pgTAP으로 고정했다. |
| 4 | 출처 없는 비공개 근황 조사·제거 | 일치 | 근황 테이블, 작성 RPC, 작성 화면이 없고 기존 화면은 `goal.reason`을 근황으로 오용했다. 프로토타입과 제품에서 블록을 제거했다. |
| 5 | 워드맵 하단탭 유지 | 일치 | 기준 문서에서 유지 화면으로 재분류했다. 실제 `/wordmap/[goalId]`에 하단탭 있음, 전역 푸터 없음이 관찰됐다. |
| 6 | Higgsfield 업적 비주얼 | 일치 | Higgsfield Soul 2.0 생성 2048px 클로버 세라믹 자산을 사용했다. 원본 생성 문자는 제품 크롭에서 제외했고 손코딩 SVG는 쓰지 않았다. |
| 7 | 프로토타입 우선 반영 | 일치 | `social-viral-loop-v2-opus48.html`을 먼저 개정하고 같은 규칙을 제품 컴포넌트·layout·RPC에 반영했다. |
| 8 | 390px dSF2 보드·QA | 일치 | 제품 8장과 프로토타입 핵심 4장을 390 CSS px, 물리 폭 780px로 캡처했다. 보드는 화면 8, 선택 버튼 24, 메모 8, 깨진 이미지 0이다. |
| 9 | 회귀·커밋·clean worktree | 테스트 통과, 커밋 대기 | Vitest 349, pgTAP 342, Next build, 환전 E2E 12가 통과했다. 이 보고를 포함한 최종 커밋 뒤 clean 상태를 확인한다. |

## 2. 하단탭과 전역 푸터 계약

정본은 `docs/design/standard-bottom-tab.md`다.

| 경로 | 하단탭 | 전역 푸터 | 결과 |
|---|---|---|---|
| `/` | 있음 | 없음 | 관찰됨 |
| `/g/[slug]` | 있음 | 없음 | 관찰됨 |
| `/me` | 있음 | 없음 | 계약·테스트됨 |
| `/wordmap/[goalId]` | 있음 | 없음 | 관찰됨 |
| `/friends` | 있음 | 없음 | 관찰됨 |
| `/friends/[friendId]` | 있음 | 없음 | 관찰됨 |
| `/invite` | 있음 | 없음 | 계약 확인 |
| `/me/achievements` | 있음 | 없음 | 관찰됨 |
| `/my` | 있음 | 없음 | 관찰됨 |

`ConditionalFooter`와 `ReceiverBottomNav.shouldShowBottomNav()`가 같은 경로 계약을 사용한다. 환전처럼 하단탭이 없는 거래 화면은 전역 푸터를 유지한다.

## 3. 친구 관계 방향 계약

정본은 `docs/design/standard-friend-relationship-direction.md`다. `friend_connection`의 UUID low/high 순서는 방향 의미가 아니므로 사용하지 않는다.

| viewer→friend 유효 응원 | friend→viewer 유효 응원 | API | 라벨 |
|---:|---:|---|---|
| 참 | 거짓 | `I_CHEERED` | 내가 응원함 |
| 거짓 | 참 | `CHEERED_ME` | 응원받음 |
| 참 | 참 | `MUTUAL` | 서로 응원 |
| 거짓 | 거짓 | `INVITED` | 초대로 연결 |

유효 응원은 `social_cheer_member_attribution.supporter_member_id`와 `goal.member_id`를 잇고, welcome 응원을 제외한다. 현재 `CONFIRMED`이거나 `payment_log.to_status='DONE'` 이력이 있으면 과거 확정 관계로 인정한다.

## 4. “응원자에게만 보이는 근황” 조사

| 조사 대상 | 결과 |
|---|---|
| `friend_goal_detail()` | 목표 `reason`, 커버, 확정 응원 수, 워드맵만 반환 |
| 근황 데이터 모델 | 없음 |
| 근황 작성 RPC | 없음 |
| 근황 작성 화면 | 없음 |
| 기존 UI 데이터 | `goal.reason`을 근황처럼 재사용 |

실제 출처와 작성 경로가 없으므로 화면 설명을 덧붙이지 않고 제거했다. 향후 도입은 작성 주체, 가시성, 수정·삭제, 신고·차단을 plan 단계에서 먼저 합의해야 한다.

## 5. 실제 렌더 증거

| 검증 | 결과 | 증거 |
|---|---|---|
| 제품 full-page 캡처 | 8/8 HTTP 200, console 0, page error 0, overflow X 0 | `docs/qa/evidence/v2-design-revision-v1-gpt-codex/capture-results.json` |
| 캡처 배율 | CSS 폭 390, 물리 폭 780 전 화면 | `*-390-full.png` |
| 프로토타입 핵심 프레임 | 공개 목표·친구·친구 상세·업적 4개, 390×844, console 0 | `prototype-*-390.png` |
| 결정 보드 | HTTP 200, 화면 8, radio 24, textarea 8, broken image 0 | `board-render.png` |
| 비교 보드 검사 | 크기 대조 7쌍, 통짜 덤프 0, 좌우 순서 위반 0 | `/tmp/haenael-v2-revision-compare-verify.log` |
| Higgsfield 자산 | 2048×2048 원본, 제품 crop에서 생성 문자 0 | `docs/design/assets/v2-design-revision-v1/achievement-higgsfield-d.png` |

### 모바일 사용성 원문 요약

local fixture의 공개 목표에서 목표 카드, 워드맵 13개, 오류 문구 부재를 먼저 확인했다.

| 폭 | 본문 토큰 | 13px 미만 | 44px 미만 누름 | 눌림 상태 | 가로 넘침 | 판정 |
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

## 6. 회귀 증거

| 검증 | 결과 | 로그 |
|---|---|---|
| Vitest 전체 | 60파일, 349/349 PASS | `/tmp/haenael-v2-revision-vitest.log` |
| pgTAP 전체 | 20파일, 342/342 PASS | `/tmp/haenael-v2-revision-pgtap.log` |
| Next.js production build | PASS, 정적 생성 17/17 | `/tmp/haenael-v2-revision-next-build.log` |
| 환전 Chromium E2E | 12/12 PASS | `/tmp/haenael-v2-revision-cashout-e2e.log` |
| 디자인 토큰 | 174파일, 기존 위반 58, 신규 0, 기준선 대비 12 감소 | `/tmp/haenael-v2-revision-design-tokens.log` |
| design-lint | 실행 완료. 기존 8pt·inline style·hex 경고 3종 | `/tmp/haenael-v2-revision-design-lint.log` |
| pipeline artifact lint | 핀 실체·슬롯키·버전 정합 PASS, 기존 README STAMP 경고 1건 | `/tmp/haenael-v2-revision-artifact-lint.log` |

## 7. 벤치마크와 판단

**Design Score: A-**. 390px, deviceScaleFactor 2 원본 8화면과 프로토타입 핵심 프레임 4종을 직접 렌더해 확인했고, 데이터가 채워진 공개 목표 화면은 9개 모바일 폭에서 타이포·터치·가로 넘침 기준을 전부 통과했다. 기존 design-lint 경고 3종은 이번 변경의 신규 위반이 아니지만 저장소 전체 기준선이 0은 아니므로 A로 올리지 않았다.

- [Apple Activity Rings](https://developer.apple.com/design/human-interface-guidelines/activity-rings)의 기록 시각화가 장식이 아니라 실제 진행 데이터와 연결돼야 한다는 원칙을 채택했다. Apple 고유 ring 표현은 복제하지 않았다.
- [Duolingo Achievement Badges](https://blog.duolingo.com/achievement-badges/)의 개인 기록을 명확한 수집 대상으로 만드는 방식을 참고했다. streak·XP·희소 badge를 가져오지 않고, 해낼게 DB에서 반증 가능한 완료 목표·확정 응원·친구만 남겼다.
- BRAIN의 유저심리 6단계 중 반응·충성 단계의 인정과 축적을 사용했다. 거짓 희소성, 금액 순위, 출처 없는 활동 피드는 거부했다.

셀프심문: 관계 방향이 틀릴 가장 그럴듯한 이유는 환불·삭제 뒤 현재 상태만 보고 과거 확정 관계를 잃는 것이다. 현재 상태와 `payment_log DONE` 이력을 함께 보고 네 방향을 pgTAP으로 고정했다.

레드팀: 까다로운 사용자는 업적 화면이 실사 장식만 바꾸고 검증 불가능한 성취를 늘렸다고 공격할 수 있다. 비주얼은 Higgsfield로 바꿨지만 숫자는 기존 DB 집계 세 가지로 제한하고 금액·순위·streak를 추가하지 않았다.

## 8. 남은 경계

- 현재 단계는 `design`이며 회장 승인 전이다. 이 보고의 “일치”는 로컬 프로토타입·제품 코드·브라우저 관찰에 대한 판정이지 운영 완료가 아니다.
- 신규 migration은 local Supabase에만 적용했다. 운영 DB migration과 웹 배포는 0건이다.
- `docs/design/README.md`의 기존 STAMP 경고 1건과 design-lint 기존 경고 3종은 이번 변경의 신규 위반이 아니며 별도 정비 대상이다.

🏷 STAMP | line: v2 | 생성: 2026-10-16 02:39 KST | model: gpt-codex/gpt-6.1-sol | agent: code-builder | skills: store-visual, haenael-supabase-build | 근거: D-026-A~H, 승인 프로토타입, v1 캡처, local Supabase, Next production 렌더, Apple·Duolingo 공식 자료 | 고민: design 단계를 build 완료로 오표시하지 않으면서 프로토타입을 먼저 고치고 제품 코드를 같은 증거 계약으로 뒤따르게 했다.

SKILLS_USED: store-visual, Higgsfield 실사 자산 생성·크롭·육안 검수에 사용 / haenael-supabase-build, local migration·계약 테스트·실제 렌더 증거 순서에 사용
SKILLS_SKIPPED: review, PR landing이나 push 요청이 아니고 현재 단계가 디자인 승인 대기이므로 별도 pre-landing 리뷰는 실행하지 않음
SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/chairman-directives-v2-20261015.md` | `docs/design/prototypes/social-viral-loop-v2-opus48.html` | `docs/design/standard-bottom-tab.md` | `docs/design/standard-ux-writing.md` | `docs/qa/evidence/v1-vs-v2-decision-v1-gpt-codex/v1-goal-390.png` | Apple Activity Rings | Duolingo Achievement Badges | BRAIN business·유저심리 정본
PRESENTATION_CHECK: 내부 태그 잔재 없음, 제품 8화면·프로토타입 4화면·결정 보드를 Chromium에서 렌더하고 육안 확인함
KNOWLEDGE_QUERY: BRAIN에서 해낼게 인정·소속감·응원 축적 원칙을 조회하고, Apple Activity Rings와 Duolingo Achievement Badges의 데이터 기반 성취 시각화를 조사
HITS_USED: BRAIN의 인정·축적 원칙, Apple의 장식 아닌 기록 시각화, Duolingo의 개인 기록 중심 수집 구조를 채택
HITS_REJECTED: Apple 고유 ring 표현, Duolingo XP·streak·희소 badge, 가짜 활동 피드는 해낼게 데이터 계약과 충돌해 미채택
CONFLICTS: 이전 승인 프로토타입의 출처 없는 근황과 워드맵 무탭 분류가 D-026-E·H와 충돌해 최신 회장 지시를 우선하고 변경 사유를 정본에 기록
판단: 친구 관계는 세 방향만 강제하지 않고 실제 응원 이력이 없는 초대 관계를 `초대로 연결`로 분리했다. DB로 반증 가능한 표현을 보존하기 위해서다.
병목: Higgsfield 원본의 생성 문자를 제품 크롭에서 제거하고, 개발 서버 표시와 sticky 검수 콘솔이 섞이지 않은 순수 화면 증거를 다시 만드는 데 가장 오래 걸렸다.
