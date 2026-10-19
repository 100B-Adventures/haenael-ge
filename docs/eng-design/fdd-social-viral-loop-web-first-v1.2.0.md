# 해낼게 V2 소셜 바이럴 루프 웹 우선 FDD

| 항목 | 값 |
|---|---|
| 버전 | **v1.2.0** (v1.1.0 의 개정. 신규 작성이 아니다) |
| 작성일 | v1.1.0 2026-10-13 02:42 KST · **v1.2.0 개정 2026-10-19 16:2x KST** |
| 작성자/모델 | v1.1.0 tech-architect / gpt-5-codex · **v1.2.0 tech-architect / claude-opus-5[1m]** |
| 작업 라인 | v2 |
| 상태 | 웹 1차 슬라이스 구현 계약. 모바일은 2차. **§A 의 결정 4건은 회장 합의 대기(추천안이 기본값으로 배선됨)** |
| 상류 핀 | `pipeline-state.v2.md` D-018 · `docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md` · **`DESIGN.md` sha256 `0ddeed8caff7…`** · **`docs/design/prototypes/social-viral-loop-v3-opus5.html` 3.0.0 sha256 `f9398150755d…`**(종전 핀 v2-opus48 은 superseded) · `docs/design/standard-ux-writing.md` sha256 `06e4ba100783…` |
| 관련 설계 | `erd-…-v1.2.0.md`, `api-contract-…-v1.2.0.md`, `architecture-…-v1.2.0.md`, `test-plan-…-v1.2.0.md`, `test-cases-…-v1.2.0.md`, `folder-structure-…-v1.2.0.md`, `design-patterns-…-v1.2.0.md`, **결정 선택지 `eng-design-v2-r6-decision-options-v1.0.0-opus5.md`** |
| 기반 포맷 | `docs/eng-design/fdd-social-viral-loop-web-first-v1.1.0.md`(v1.1.0, sha256 `13d9b717e839…`) |

> STAMP: 생성 2026-10-13 02:42 KST. 모델 gpt-5-codex. 에이전트 tech-architect. 스킬 docs 방법론을 적용하되 로컬 Markdown을 직접 작성했다. 근거는 승인 디자인, 현재 Next.js와 Supabase 구현, 운영 실물 조회 결과, Supabase·PostgreSQL·OWASP·앱인토스 공식 문서다. 가장 오래 고민한 지점은 기존 공개 목표의 도달성을 보존하면서 친구 공개범위를 여는 일과 커스텀 커버를 외부 모더레이션 공급자 결정 없이 안전하게 출시하는 일이었다.

> PATCH v1.0.1 사유: D-019를 반영해 FRIENDS 커스텀 커버가 public bucket에 복사되지 않고 ACTIVE 친구 확인 뒤 120초 Presigned URL로만 노출되도록 기능 계약을 명확히 했다.

> v1.1.0 사유: D-022에 따라 마이페이지, DB 집계형 업적, 미응원 친구 목표 큐를 2차 build 슬라이스로 승격했다. 허위 성취 방어 기준은 "DB 원장에서 반증 가능한가"이며, 달성 목표 수·받은 확정 응원 수·ACTIVE 친구 수만 허용한다. 자기신고·사용자 간 순위·연속 접속 기록은 금지한다.

> **v1.2.0 개정 사유**: design 이 2026-10-14 에 재오픈돼 6차까지 개정됐다(R1~R10, D-036 으로 승격). 이 문서는 그 개정과 D-024·D-032·D-034 를 반영해 **어긋난 지점만 고친 개정본**이다. v1.1.0 의 구조·스키마·RPC 이름·금액 비공개 계약은 그대로 유지한다. 바뀐 것은 §A 가 전수로 적는다. **v1.1.0 § 1.3 의 친구 정의가 D-024 로 뒤집혔다는 것이 가장 큰 교정이다.**

## 목차

- [A. v1.2.0 개정 (6차 개정 반영)](#a-v120-개정-6차-개정-반영)
  - [A.1 전제 실측표](#a1-전제-실측표)
  - [A.2 상류 핀 교체](#a2-상류-핀-교체)
  - [A.3 v1.1.0 이 틀렸던 것](#a3-v110-이-틀렸던-것)
  - [A.4 신규 요구 7건 추적성 매트릭스 (갭 0)](#a4-신규-요구-7건-추적성-매트릭스-갭-0)
  - [A.5 신규 기능 요구 FR-W12 ~ FR-W18](#a5-신규-기능-요구-fr-w12--fr-w18)
  - [A.6 데이터 구조 다이어그램](#a6-데이터-구조-다이어그램)
  - [A.7 합의 대기 결정 4건](#a7-합의-대기-결정-4건)
- [0. 한 줄 결론](#0-한-줄-결론)
- [1. 목적·범위·용어](#1-목적범위용어)
- [2. 현재 실물과 변경 경계](#2-현재-실물과-변경-경계)
- [3. 웹 우선 아키텍처](#3-웹-우선-아키텍처)
- [4. 화면·컴포넌트 계약](#4-화면컴포넌트-계약)
- [5. 기능 요구와 수용기준](#5-기능-요구와-수용기준)
- [6. 핵심 시퀀스](#6-핵심-시퀀스)
- [7. 유저플로우 1:1 매핑](#7-유저플로우-11-매핑)
- [8. 데이터 공개범위와 RLS](#8-데이터-공개범위와-rls)
- [9. 기존 UI·금전 경로 보존 계약](#9-기존-ui금전-경로-보존-계약)
- [10. 모바일 2차 전환](#10-모바일-2차-전환)
- [11. 배포 순서·관측·롤백](#11-배포-순서관측롤백)
- [12. 비범위와 후속 슬라이스](#12-비범위와-후속-슬라이스)
- [13. 추적성·갭 판정](#13-추적성갭-판정)
- [14. 벤치마크·자기심문·레드팀](#14-벤치마크자기심문레드팀)
- [15. 개정 이력](#15-개정-이력)

## A. v1.2.0 개정 (6차 개정 반영)

> 이 장은 v1.1.0 에 없던 내용이고, 아래 §0~§15 는 v1.1.0 본문을 유지한 뒤 어긋난 지점만 고친 것이다. **§A 와 본문이 충돌하면 §A 가 이긴다.**

### A.1 전제 실측표

품질헌법 `standard-eng-design.md` §1-7 요구. 추정 칸 0. 명령과 날짜를 함께 적는다.

| 전제 | 확인 명령 | 실측 결과 | 등급 | 날짜 |
|---|---|---|---|---|
| V2 소셜 테이블 운영 존재 | `GET /rest/v1/<t>?select=id&limit=0` (anon) | `friend_invite`·`friend_connection`·`goal_cover_asset`·`member_preference`·`social_cheer_member_attribution` **5종 실재**(42501/42703 = 테이블 있음) | 관찰됨 | 2026-10-19 |
| V2 RPC 운영 존재 | QA 계정 로그인 후 `POST /rest/v1/rpc/<f>` 정규 인자 | **8종 직접 관찰**: `my_friend_goals` 200 · `my_social_dashboard` 200 · `friend_goal_detail` P0002 `goal_not_found` · `friend_invite_preview` P0008 `invite_not_found` · `accept_friend_invite` P0008 · `set_goal_visibility` P0005 `goal_forbidden` · `get_wordmap` 200 · `admin_list_goal_covers` 403 `admin_forbidden`. `set_goal_cover_preset`·`remove_friend` 는 PostgREST 시그니처 응답으로 확인 | 관찰됨(8) | 2026-10-19 |
| `create_friend_invite`·`update_member_preferences` | 호출하면 운영 데이터를 쓰므로 호출하지 않음 | 같은 migration 의 형제 함수 8종이 전부 실재하고 제품 코드가 운영에서 이 둘을 호출한다 | **근거 확인**(관찰 아님) | 2026-10-19 |
| 커버 엣지 함수 운영 존재 | `OPTIONS/POST /functions/v1/<fn>`, 대조군 `zz-does-not-exist` → 404 `NOT_FOUND` | **3종 전부 배포됨.** `goal-cover-sign-upload` 인증 후 404 `goal_not_found` · `goal-cover-finalize` 422 `invalid_request` · `admin-review-goal-cover` 204 | 관찰됨 | 2026-10-19 |
| Storage 버킷 | `GET /storage/v1/object/public/<b>/probe.png` | `goal-cover-public` → `NoSuchKey` = **버킷 실재**. `goal-cover-quarantine` → `NoSuchBucket` 이나 **비공개 버킷은 공개 경로에서 같은 응답**이라 판정 불가 | 공개 버킷 관찰됨 / 격리 버킷 **미검증** | 2026-10-19 |
| 비로그인 보호 라우트 | `curl -o /dev/null -w '%{http_code}'` 운영 5경로 | `/my`·`/friends`·`/invite` **307** · `/me` **200**(셸 25,241바이트 + 클라이언트 리다이렉트 태그) · `/me/goal/1` **200**(의도된 권한없음 화면, 타인 데이터 0) | 관찰됨 | 2026-10-19 |
| `redirect()` 가 200 을 내는 이유 | Next.js `redirect` 공식 레퍼런스 | "When used in a streaming context, this will insert a meta tag to emit the redirect on the client side." 비스트리밍은 307 | 근거 확인 | 2026-10-19 |
| `proxy.ts` 존재와 역할 | `ls -la web/src/proxy.ts`, 본문 Read | **있다**(3,333바이트, 2026-07-19). canonical 도메인 308 강제 전용. `matcher` 는 정적 자산만 제외해 전 경로를 덮는다. **인증 판정은 안 한다** | 관찰됨 | 2026-10-19 |
| Next 설치본과 경계 파일명 | `grep PROXY_FILENAME web/node_modules/next/dist/lib/constants.js` | **16.4.0**. `middleware`·`proxy` 둘 다 인식. `@supabase/ssr` ^0.12.0 설치됨 | 관찰됨 | 2026-10-19 |
| 간격 토큰 제품 존재 | `sed -n '100,130p' web/src/app/globals.css` | `--space-mobile-gutter`·`--space-page-y`·`--space-bottom-safe` 만 있고 **`--sp-0`~`--sp-6` 없음**. R2 로 폐지된 `--tabbar-lock-size: 11px` 잔존 | 관찰됨 | 2026-10-19 |
| 응원 메시지 클램프 현황 | `grep -rn "line-clamp\|truncate" web/src` | `CheerList.tsx:50` **`truncate`(1줄)** · `MyPageOverview.tsx` 클램프 없음. **D-030-C 의 2줄+더보기가 4경로 중 0곳** | 관찰됨 | 2026-10-19 |
| 홈 카드 응원 집계의 N+1 | `me/page.tsx:87` Read | `.select("goal_id, created_at").in("goal_id", goalIds)` **단일 일괄 조회. 현재 N+1 없음** | 관찰됨 | 2026-10-19 |
| FRIENDS 커버 서명 발급 | `web/src/lib/social/server.ts:103` Read | `createSignedUrls([...new Set(paths)], TTL)` **1회 일괄**. D-019 경계가 코드에 서 있다 | 관찰됨 | 2026-10-19 |
| 운영 랜딩의 R1 반영 | `curl -s https://haenael-ge.vercel.app/` grep | 사업자등록번호 2·이용약관 2·개인정보처리방침 2·**이용안내 0**. R1 **미반영** | 관찰됨 | 2026-10-19 |
| 운영·시안 법정 기재사항 차이 | 운영 `/me/goal/1` 본문 대 프로토타입 `LEGAL_EXPOSURE.how` | 운영에는 **주소·개인정보보호책임자**가 있고 시안 `biz` 블록에는 **없다** | 관찰됨 | 2026-10-19 |
| 기존 구현 존재 | `ls web/src/components/social` | 12파일 실재(`FriendRelationshipBadge.tsx` 포함). **이 문서는 확장 설계이고 재창조가 아니다** | 관찰됨 | 2026-10-19 |

**아키텍처 v1.1.0 §7 의 "운영 0건" 기록은 낡았다.** 그 수치는 2026-10-13 시점이고 그 뒤 build·ship 이 돌았다. 위 표가 현재 정본이다.

### A.2 상류 핀 교체

| 항목 | v1.1.0 핀 | v1.2.0 핀 |
|---|---|---|
| 프로토타입 | `social-viral-loop-v2-opus48.html` | **`social-viral-loop-v3-opus5.html` 3.0.0** sha256 `f9398150755d42b2afbf5bdd7b6d982fd52b10ba8b6dd7da9b1ff72b3b9dca0c` |
| 디자인 시스템 | `DESIGN.md v2.0.1` (문자열 인용) | **`DESIGN.md`** sha256 `0ddeed8caff763de7b91ed5a0c178bf406c59a6ccefa65dcf5f057929e04c24a` |
| 말투 정본 | 없음 | **`docs/design/standard-ux-writing.md`** sha256 `06e4ba1007bbb37c552d6c56a4fdfe4abbe86bcc06c9776dc4579b009fe26ece` |
| 거버넌스 | D-018·D-019·D-022 | **+ D-024·D-032·D-033·D-034·D-035·D-036·D-037** |

### A.3 v1.1.0 이 틀렸던 것

| # | v1.1.0 서술 | 무엇이 틀렸나 | v1.2.0 처리 |
|---|---|---|---|
| 1 | §1.3 "친구 = 한 사용자의 초대를 다른 사용자가 명시적으로 수락해 생성된 양방향 관계" | **D-024(2026-10-14)가 뒤집었다.** 응원이 확정되면 그 순간 서로 친구가 된다. 초대는 미가입자를 데려오는 통로이고 친구 맺기의 필수 조건이 아니다. 레포에 migration 2건(`20261015010000_cheer_friendship_backfill.sql`·`20261016021000_friend_relationship_direction.sql`)과 `FriendRelationshipBadge.tsx` 가 이미 있다. **설계가 코드보다 낡았다** | §1.3 용어 교체 + FR-W17 신설 |
| 2 | §7 WF-01 "기존 SSR query" | R6 응원 요약(아바타 스택·인원수·최근 응원 한 줄)의 공급 계약이 없다 | FR-W14 + WF-18 |
| 3 | §9.1 "22px 여백과 색 토큰만 유지" | R10 수직 간격 토큰 `--sp-0`~`--sp-6` 이 생겼고 선언 위치가 없다 | FR-W16 + `design-patterns-…-v1.2.0.md` §4 |
| 4 | §4 라우트 표 | `/how`·`legal` 이 없다. R1 로 그 두 화면이 법적 고지를 소유하게 됐다 | §4 표에 2행 추가 + FR-W12 |
| 5 | §4 마지막 문단 "비로그인 `/me/goal/[id]` 는 빈 셸을 렌더하지 않는다" | `/me` 자체가 셸을 먼저 그리는 것을 다루지 않았다(D-034) | FR-W15 |
| 6 | §12 비범위에 "자동 이미지 모더레이션" | 유지. 단 `PENDING_UPLOAD` 중단 상태를 누가 치우는지가 빠져 있었다 | FR-W13 |
| 7 | 전제 실측표 없음 | 품질헌법 §1-7 위반 | §A.1 |
| 8 | 비회원에게 보낼 수 없는 필드 계약 없음 | R2 티저가 타인 데이터를 그릴 자리를 만들었는데 금지 필드가 없다(OWASP Excessive Data Exposure) | FR-W18 + api-contract §A.2 |

### A.4 신규 요구 7건 추적성 매트릭스 (갭 0)

Codex 교차리뷰가 짚은 미매핑 7건이다. 각 행이 **요구 → 기능요구 → 라우트·컴포넌트 → 서버 계약 → 테이블·Storage → 테스트 케이스**로 끝까지 닿는다.

| 요구 ID | 요구(출처) | 기능요구 | 라우트·컴포넌트 | 서버 계약 | 테이블·Storage | 테스트 |
|---|---|---|---|---|---|---|
| **R1** | 랜딩 법적 고지 제거, 이용안내·마이페이지가 소유 (`DESIGN.md` 법적 노출 표 · 프로토타입 `LEGAL_EXPOSURE` 4443행 · D-030-B) | FR-W12 | `/`·`/how`·`/g/[slug]`·`/my`(→`legal`) · `LegalFooter.tsx`(신규, 표를 읽고 표에 없으면 DOM 미생성) | 없음(정적) · 노출 표는 `web/src/lib/legal/exposure.ts` 상수 | 없음 | LG-01~05 |
| **R2** | 비회원 하단탭 잠금 폐지, 가치 미리보기 + 카카오 시작 (프로토타입 `GUEST_TEASER` 4487행 · 1026~1059행) | FR-W18 | `/`·`/g/[slug]` · `GuestTeaserSheet.tsx`(신규, `role="dialog"`) | **D-OPEN-1 종속.** A안=서버 호출 0 / B안=`platform_social_stats()` 신설(집계 정수 1개, anon 실행) | 없음 또는 집계 전용 | GT-01~03 |
| **R3** | 고정 CTA 를 떠 있는 레이어에서 흐름 안으로. 높이 정본 `--cta-h` 하나 (프로토타입 15~17행) | FR-W16 | `/g/[slug]` · `GoalPublicCtaBar.tsx` | 없음 | 없음 | SP-03 |
| **R5** | 배너 선택기: 업로드 버튼 항상 도달 가능 · 선택 상태 단일 변수(SSOT) · 체크 정확히 1개 (프로토타입 21~25행 · D-032) | FR-W13 | `/me/goal/[id]`·`/my` · `GoalCoverPicker.tsx` | `goal-cover-sign-upload` → `PUT` → `goal-cover-finalize` → `admin-review-goal-cover` (**전부 배포됨**) | `goal_cover_asset` · `goal-cover-quarantine` · `goal-cover-public` | CV-01~06 |
| **R6** | 홈 목표 카드 응원 요약 = 아바타 스택(+N) · 인원수 · 최근 응원 한 줄. 금액·순위 금지 (프로토타입 26~28행 · `DESIGN.md` · D-003) | FR-W14 | `/me`·`/my` · `MyGoalListCard.tsx`·`CheerSummaryBar.tsx`(신규) | `my_social_dashboard()` 확장(`goals[].supporter_avatars` 최대 3 · `goals[].recent_cheer` 1건 · `is_anonymous`). **단일 호출 유지** | `cheer`·`member`·`goal` | CS-01~04 |
| **R9·R10** | 수직 간격 관계 토큰 `--sp-0`~`--sp-6`, 카드 상하 대칭 (`DESIGN.md` 579~599행) | FR-W16 | 전 화면 · `globals.css :root` 선언 | 없음 | 없음 | SP-01~04 |
| **D-034** | 비로그인 `/me` 가 회원 셸을 먼저 그리지 않게 한다 (결정 원장 · 운영 실측 200) | FR-W15 | 보호 라우트 전체 · **기존** `web/src/proxy.ts` 확장 | 없음(경계 판정) · 보호 라우트 목록은 `qa/contracts/protected-routes.json` | 없음 | AU-01~04 |
| **(미반영 백로그)** | 응원 메시지 1줄 → 2줄 말줄임 + 더 보기 (D-030-C) | FR-W14 | `CheerList.tsx`·`MyPageOverview.tsx`·`FriendGoalList.tsx`·`FriendGoalDetail.tsx` | 없음 | 없음 | CL-01~04 |
| **(D-024)** | 응원으로 친구가 된다 + 관계 방향 표시 | FR-W17 | `/friends`·`/friends/[friendId]` · `FriendRelationshipBadge.tsx`(실재) | `my_friend_goals()`·`friend_goal_detail()` 의 `relationship_direction` | `friend_connection`·`cheer` | FD-01~03 |

**매핑 결과: 9/9. 갭 0.** v1.1.0 의 WF-01~17 매핑 17건은 그대로 유효하므로 총 26건이 끝까지 닿는다.

### A.5 신규 기능 요구 FR-W12 ~ FR-W18

#### FR-W12. 법적 고지 노출 (R1)

Given 법적 고지 노출 표가 `web/src/lib/legal/exposure.ts` 의 단일 상수다. When 어떤 화면이 렌더된다. Then 표에 그 화면 키가 없으면 **법적 고지 DOM 을 만들지 않는다**(마크업이 남아 있어도 렌더 시점에 제거). 표에 `biz` 면 사업자 정보 전문, `link` 면 한 줄 링크, `page` 면 상시 전문을 그린다. 하단탭이 있는 회원 화면에는 어떤 모드도 두지 않는다.

- **집행 주체는 코드다**(D-032). 화면마다 사람이 다시 판단하지 않는다.
- `landing` 값은 **회장 결정 대기**(§A.7 D-OPEN-4). 값 한 줄로 두 경우를 다 수용한다.
- **법정 기재사항은 노출 위치와 분리한다.** 상호·대표·사업자등록번호·주소·이메일·개인정보보호책임자를 모두 포함한다. 운영 배포본에 있던 주소와 개인정보보호책임자를 시안이 빠뜨렸으므로 되살린다.

#### FR-W13. 커버 업로드 상태기계 (R5)

Given 소유자가 커버를 올린다. When 서명 발급 → 업로드 → 확정 3단을 지난다. Then 자산 상태는 `PENDING_UPLOAD → REVIEW → APPROVED | REJECTED` 로만 전이하고, 각 전이의 주체는 각각 소유자·소유자·관리자다. **`PENDING_UPLOAD` 로 24시간 이상 머문 행과 그 격리 객체는 정리 작업이 제거한다.** 중단된 업로드가 기존 활성 커버를 바꾸지 않는다.

Given 선택기가 열린다. Then 업로드 버튼은 **스크롤 영역 밖**에 있어 가로 스크롤 위치와 무관하게 항상 눌린다. 선택 상태는 단일 변수가 소유하고 화면의 체크 표시는 **정확히 1개**다.

#### FR-W14. 응원 요약과 2줄 말줄임 (R6 · D-030-C)

Given 회원이 `/me` 또는 `/my` 를 연다. When 목표 카드가 그려진다. Then 카드마다 아바타 최대 3개와 `+N`, 응원 인원수, 가장 최근 응원 1건(이름 + 메시지)이 보인다. **금액·클로버 수·상위 후원자 순위는 응답 스키마에 존재하지 않는다**(D-003). 익명 응원은 아바타 자리표시를 쓰고 프로필 링크를 걸지 않으며 그 이유를 그 자리에서 알린다.

Given 목표 수가 1개든 20개든. Then 이 요약을 위한 서버 질의 횟수는 **변하지 않는다**(단일 `my_social_dashboard()` 호출).

Given 응원 메시지가 길다. Then 목표 관리·해낼게 관리·친구 목록·친구 상세 **네 경로 모두** 2줄에서 말줄임하고 꺾쇠 하나로 펼친다. 클램프 줄 수는 CSS 변수 한 곳이 소유한다.

#### FR-W15. 인증 판정 층 (D-034)

Given 비로그인 방문자가 보호 라우트를 연다. When 응답이 온다. Then **회원 셸 HTML 이 전송되지 않고** 3xx 로 끝난다. 보호 라우트 목록은 데이터 파일이 소유하고, 목록에 없는 신규 보호 라우트는 린트가 반려한다. **경계 판정은 추가이고 대체가 아니다**: 페이지의 인증 검사와 RLS 는 그대로 둔다(Server Action 은 경계가 덮지 않는다).

구현 층은 **합의 대기**(§A.7 D-OPEN-2).

#### FR-W16. 간격 토큰과 고정 CTA 높이 (R3 · R9 · R10)

Given 제품이 렌더된다. Then `--sp-0`~`--sp-6`(2·4·8·12·16·24·32px)가 `web/src/app/globals.css` 의 `:root` 한 곳에 선언돼 있다. 카드 컴포넌트의 **안쪽 상하 여백은 같은 토큰**을 쓴다. 적용 범위는 카드 우선이고, 본문 문단·목록 행의 개별 여백은 `DESIGN.md` 가 미적용으로 명시했으므로 넓히지 않는다. 기존 `--space-*` 는 페이지 레벨 여백 전용으로 남기고 두 계열을 섞지 않는다.

Given `/g/[slug]` 에 고정 액션 바가 있다. Then 자리 예약 높이는 `--cta-h` 하나가 소유하고 손으로 적은 픽셀 값을 쓰지 않는다. 바 밑으로 본문이 비쳐 보이지 않는다.

#### FR-W17. 응원으로 맺어지는 친구와 관계 방향 (D-024)

Given 응원이 `CONFIRMED` 로 확정된다. When 그 시점. Then 응원한 사람과 받은 사람이 **서로 친구가 된다**(양방향, 1건). 과거 확정 응원 이력에도 소급 적용한다. 초대 링크 수락은 친구가 되는 또 하나의 경로로 남고 **필수 조건이 아니다**. 금액은 여전히 공개되지 않고 차단·해제는 사용자가 할 수 있다.

Given 친구 목록·상세를 연다. Then 관계 방향이 `내가 응원함 | 응원받음 | 서로 응원` 중 하나로 보인다. 판정은 DB 의 확정 응원 기록으로 한다.

#### FR-W18. 비회원 티저의 노출 경계 (R2)

Given 비회원이 회원 전용 탭을 누른다. When 가치 미리보기 시트가 열린다. Then 그 시트를 그리기 위해 서버가 보내는 응답에 **타인의 이름·프로필 사진 주소·목표 제목·클로버 수·금액·순위가 없다.** CSS 흐림은 인가 수단이 아니다. 가린다는 것은 **보내지 않는다**는 뜻이다.

Given 시트에 수치가 적힌다. Then 그 수치는 실측값이어야 하고, 실측할 수 없으면 수치를 쓰지 않는다. 샘플 데이터를 사회적 증거로 제시하지 않는다.

데이터 범위는 **합의 대기**(§A.7 D-OPEN-1).

### A.6 데이터 구조 다이어그램

Codex 지적(FDD 에 `erDiagram` 없음) 반영. 상세 정의는 `erd-social-viral-loop-web-first-v1.2.0.md`.

```mermaid
erDiagram
  member ||--o{ goal : owns
  member ||--o| member_preference : has
  member ||--o{ friend_invite : creates
  member ||--o{ friend_connection : "member_a / member_b"
  goal   ||--o{ cheer : receives
  goal   ||--o{ goal_cover_asset : "uploaded covers"
  goal   ||--o| goal_cover_asset : "active_cover_asset_id"
  goal   ||--o{ friend_invite : "optional target"
  cheer  ||--o| social_cheer_member_attribution : "attributed to"
  member ||--o{ social_cheer_member_attribution : "cheered by"
  cheer  }o--o{ friend_connection : "CONFIRMED creates (D-024)"

  member {
    uuid id PK
    text nickname
    text profile_image
  }
  goal {
    bigint id PK
    uuid member_id FK
    text slug
    text title
    text visibility "PUBLIC / FRIENDS / PRIVATE"
    text cover_preset_key
    uuid active_cover_asset_id FK
    date due_date
    text status
  }
  cheer {
    bigint id PK
    bigint goal_id FK
    text message
    text status "CONFIRMED"
    timestamptz created_at
  }
  friend_invite {
    uuid id PK
    uuid inviter_member_id FK
    bigint goal_id FK "nullable"
    bytea token_sha256 UK
    text channel "WEB / APPINTOSS"
    timestamptz expires_at
    uuid accepted_by_member_id FK
  }
  friend_connection {
    uuid id PK
    uuid member_a_id FK
    uuid member_b_id FK
    text status "ACTIVE / REMOVED / BLOCKED"
    text origin "CHEER / INVITE"
  }
  goal_cover_asset {
    uuid id PK
    bigint goal_id FK
    text status "PENDING_UPLOAD / REVIEW / APPROVED / REJECTED"
    text quarantine_path
    text public_path
    text mime_type
    bigint byte_size
    text content_sha256
  }
  member_preference {
    uuid member_id PK
    boolean notify_cheer
    boolean notify_marketing
  }
  social_cheer_member_attribution {
    bigint cheer_id PK
    uuid member_id FK
  }
```

### A.7 합의 대기 결정 4건

되돌리기 비싼 것은 합의 전에 확정하지 않는다(CLAUDE.md §4.4). 선택지와 트레이드오프 전문은 **`eng-design-v2-r6-decision-options-v1.0.0-opus5.md`** 다. 네 건 모두 **추천안이 이 문서의 기본값으로 배선돼 있어 build 는 멈추지 않는다.**

| ID | 결정 대상 | 추천안 | 바뀌면 영향 받는 범위 |
|---|---|---|---|
| D-OPEN-1 | 비회원 티저가 보여줄 데이터 | A 설명형(서버 호출 0). 사회적 증거를 원하면 B 집계 정수 1개 | api-contract RPC 0~1건 · FR-W18 · GT-01~03 |
| D-OPEN-2 | 인증 판정을 올릴 층 | A 기존 `proxy.ts` 확장 + 페이지 검사 유지 | architecture 인증 구성 · folder-structure · AU-01~04 |
| D-OPEN-3 | 커버 업로드 경로 구조 | A 현 3단 유지 + 상태기계 명시 (서버 변경 0) | api-contract §5 · erd §4.4 · CV-01~06 |
| D-OPEN-4 | 랜딩 법적 고지 노출과 기재 항목 | 노출 표를 코드 데이터로. `landing` 값은 회장 결정. 기재 항목은 주소·개인정보보호책임자 **되살림** | `exposure.ts` 한 줄 · LG-01~05 |

## 0. 한 줄 결론

V2 1차는 기존 Next.js 웹에 목표 상세·커버·초대·친구 목록을 추가하고 Supabase 공통 계약을 먼저 완성한다. 앱인토스 미니앱은 같은 RPC와 테이블을 재사용하는 2차 채널로 둔다.

## 1. 목적·범위·용어

### 1.1 목적

현재 운영에서 실재하는 V2는 다중 목표뿐이다. 웹에는 `/friends`, `/invite`, 하단 탭이 없고, 미니앱은 화면만 있으나 `auth-toss`와 RPC 5종이 없어 동작하지 않는다. 이 문서는 화면만 있는 상태를 끝내기 위해 웹에서 먼저 완주할 수 있는 최소 소셜 루프를 개발 계약으로 고정한다.

### 1.2 이번 슬라이스

| 포함 | 제외 |
|---|---|
| 본인 목표 상세 `/me/goal/[id]` | 활동 타임라인 |
| 프리셋 6종과 커스텀 목표 커버 | 활동 타임라인 |
| 마이페이지 `/my`: 프로필 요약·내 목표·친구 수 | 자기신고·사용자 간 순위·연속 접속 기록 |
| DB 집계 업적: 달성 목표·받은 응원·연결 친구 | 부스트 클로버 |
| 소속감 큐: 친구 목표 중 본인이 확정 응원하지 않은 목표 | 친구 추천·연락처 동기화 |
| 7일 만료 초대 링크 생성·미리보기·1회 수락 | 부스트 클로버 |
| 친구 목록과 친구 목표 상세 | 소셜 랭킹·금액 순위 |
| 공개범위 `PUBLIC|FRIENDS|PRIVATE` | 앱인토스 출시·심사·현금 기능 |
| 회원 환경설정 RPC의 공통 계약 | 자동 이미지 모더레이션 공급자 |
| 기존 관리자 화면의 커버 수동 검수 큐 | 연락처 동기화·친구 추천 |

### 1.3 용어

| 용어 | 정의 |
|---|---|
| 친구 | **확정된 응원으로 맺어진 양방향 관계**(D-024). 초대 링크 수락도 같은 관계를 만들지만 필수 조건이 아니다. 상태는 `ACTIVE|REMOVED|BLOCKED` |
| 친구공개 | `ACTIVE` 친구에게만 보이는 목표. 초대 토큰 소지자는 수락 전 상세를 볼 수 없음 |
| 관계 방향 | 확정 응원 기록으로 판정하는 `내가 응원함 | 응원받음 | 서로 응원` 셋 중 하나(D-026) |
| 비회원 티저 | 회원 전용 탭을 누른 비회원에게 그 탭의 가치를 보여주는 바텀시트(R2). 자물쇠 배지는 폐지됐다 |
| 법적 고지 노출 표 | 어느 화면이 어떤 법적 고지를 소유하는지 정한 코드 상수. 표에 없는 화면은 렌더 시점에 DOM 이 제거된다(D-032) |
| 초대 토큰 | 32바이트 CSPRNG 결과를 base64url로 인코딩한 256비트 bearer token |
| 커버 프리셋 | 승인 프로토타입의 `c1`부터 `c6`. 새 색 토큰을 만들지 않음. 목표를 시각화하는 자리이고 단색 띠나 목표와 무관한 사진은 쓰지 않는다(D-028-A) |
| 승인 커버 | 격리 Storage에서 관리자 검수를 통과해 공개 Storage로 복사된 이미지 |

## 2. 현재 실물과 변경 경계

### 2.1 기존 구현 확인

| 실물 | 관찰 결과 | 설계 판정 |
|---|---|---|
| `goal`, `member`, `cheer`, `notification` | 운영·migration에 존재 | 재사용 |
| `create_goal` | 운영 RPC 존재, 목표 15행 확인 | 변경 금지. 커버는 생성 뒤 별도 설정 |
| `/me` | 다중 목표, 링크, 응원 목록, 환전 진입 존재 | 구조 보존 후 연결만 추가 |
| `/g/[slug]` | 비로그인 SSR, 금액 없는 공개 목표 | 커버와 공개범위 필터만 확장 |
| `ReceiverPageShell`, `ReceiverTopBar` | 현재 수신자 공통 셸 | 신규 인증 화면 전부 재사용 |
| `GoalEditSheet`, `CheerList`, `SplitBalanceCard`, `MyLinkCard` | 목표 관리의 기존 부품 | `/me/goal/[id]`에서 재조합 |
| 웹 소셜 라우트 | `/friends`, `/invite` 없음 | 신규 |
| 미니앱 RPC 5종 | 호출 코드만 있고 DB 함수 0건 | 이름 유지 후 백엔드 선구현 |
| 친구·초대 테이블 | 0건 | 신규 |

### 2.2 기존 앱인토스 FDD의 위치

`fdd-core-social-viral-loop-appintoss-v0.1.0-gpt-codex.md`는 폐기하지 않는다. 그 문서의 채널 제약, 토스 로그인, CSR 분리, 다중 신원 설계는 모바일 2차 입력으로 유지한다. 이번 문서는 구현 순서와 1차 표면만 웹으로 바꾼다.

### 2.3 보존과 변경 계약

| 보존 | 변경 |
|---|---|
| 기존 `/me` 정보 위계와 상단 알림 | 목표 카드에 커버와 관리 링크 추가 |
| `/g/[slug]`의 비로그인 SSR과 응원 결제 | 승인 커버와 PUBLIC 필터 추가 |
| 환전 화면·RPC·원장·계좌 마스킹 | 변경 없음 |
| 브랜드 색·Pretendard·22px 여백·390/1024 대응 | 승인된 4탭 `ReceiverBottomNav` 추가 · **수직 간격 토큰 `--sp-0`~`--sp-6` 신설**(R10) · **응원 메시지 2줄 말줄임**(D-030-C) · **고정 CTA 높이 `--cta-h` 단일화**(R3) |
| 금액 비공개 D-003 | 친구 응답에서도 금액 필드 자체를 금지 |

## 3. 웹 우선 아키텍처

### 3.1 시스템 아키텍처

```mermaid
flowchart LR
  U[웹 사용자] --> W[Next.js App Router]
  W --> S[Supabase SSR Client]
  W --> E[Cover Edge Functions]
  S --> R[Social RPC]
  R --> G[(goal member cheer)]
  R --> F[(friend_invite friend_connection)]
  R --> P[(member_preference)]
  E --> Q[(goal-cover-quarantine)]
  A[기존 관리자 화면] --> E
  E --> C[(goal_cover_asset)]
  E --> B[(goal-cover-public)]
  M[앱인토스 CSR 2차] -. 같은 RPC 재사용 .-> R
```

### 3.2 레이어 책임

| 레이어 | 책임 | 금지 |
|---|---|---|
| Next.js route | 인증 경계, SSR 데이터 조립, 상태별 화면 | service role 사용, RLS 우회 |
| Client component | 탭·복사·업로드·토글·오류 복구 | 공개범위 판정, 금액 계산 |
| RPC | 관계·소유권·공개범위·동시성의 최종 판정 | 호출자 입력을 신뢰 |
| Edge Function | Storage signed upload, MIME·해시 검증, 관리자 승인 | 승인 전 public URL 발급 |
| DB/RLS | 기본 거부, 무결성, 데이터 최소 노출 | anon에게 기반 테이블 직접 권한 부여 |

### 3.3 폴더 배치

```text
web/src/app/(receiver)/
  me/goal/[id]/page.tsx
  friends/page.tsx
  friends/[friendId]/page.tsx
  invite/page.tsx
web/src/app/invite/[token]/page.tsx
web/src/components/social/
  ReceiverBottomNav.tsx
  FriendGoalList.tsx
  FriendGoalDetail.tsx
  FriendInviteCard.tsx
  InviteAcceptCard.tsx
  GoalCoverPicker.tsx
  GoalVisibilityControl.tsx
web/src/components/admin/GoalCoverReviewQueue.tsx
supabase/migrations/<timestamp>_social_web_first.sql
supabase/functions/goal-cover-sign-upload/
supabase/functions/goal-cover-finalize/
supabase/functions/admin-review-goal-cover/
```

현재 `folder-structure.md`와 `design-patterns.md`의 App Router, feature component, RPC/EF 경계를 바꾸지 않는다.

## 4. 화면·컴포넌트 계약

| 라우트 | 화면 목적 | 재사용 | 신규 | 상태 |
|---|---|---|---|---|
| `/me` | 내 목표 홈 | 기존 전체 | `ReceiverBottomNav`, 커버 썸네일, 관리 링크 | 목표 0·정상·3개·오류 |
| `/me/goal/[id]` | 목표별 응원자·잔액·편집·커버 | `ReceiverPageShell`, `ReceiverTopBar`, `CheerList`, `SplitBalanceCard`, `GoalEditSheet`, `MyLinkCard` | `GoalCoverPicker`, `GoalVisibilityControl` | 빈·정상·과다·권한없음 |
| `/friends` | 친구와 친구 목표 목록 | 공통 셸·상단바 | `FriendGoalList` | 친구 0·정상·과다·오류 |
| `/friends/[friendId]` | 선택한 친구의 공개 가능한 목표 상세 | 공통 셸 | `FriendGoalDetail` | PUBLIC·FRIENDS·없음·관계해제 |
| `/invite` | 목표를 선택해 초대 링크 생성 | 공통 셸 | `FriendInviteCard` | 생성 전·생성됨·복사됨·rate limit |
| `/invite/[token]` | 초대 미리보기와 로그인·수락 | 비회원 경계 | `InviteAcceptCard` | 유효·로그인필요·만료·사용됨·자기초대 |
| `/my` | 프로필·내 목표·친구 수·업적·소속감 큐 | 공통 셸·상단 알림 | `MyPageOverview` | 정상·빈 목표·빈 큐·오류 |
| `/g/[slug]` | 공개 목표 | 기존 전체 | 승인 커버 배너 | PUBLIC만 200 |
| `/admin` | 커버 검수 | 기존 관리자 인증·셸 | `GoalCoverReviewQueue` | 대기·승인·반려 |
| `/how` | 이용안내. **사업자 정보를 소유**(R1) | 기존 정적 화면 | `LegalFooter` (`biz` 모드) | 상시 |
| `/my` → 약관 및 정책 | 약관·개인정보처리방침 전문 상시(R1) | 공통 셸 | `LegalFooter` (`page` 모드) | 상시 |

4탭은 `홈·친구·초대·마이`를 사용한다. `홈`은 `/me`, `마이`는 `/my`로 분리하며 실제 pathname으로 활성 상태를 판정한다.

**비회원 하단탭(R2 개정)**: 비회원에게도 4탭을 노출하되 회원 전용 탭을 누르면 **자물쇠 배지가 아니라 가치 미리보기 시트**가 열린다(FR-W18). 자물쇠를 그리는 스타일은 남기지 않는다. `globals.css` 의 `--tabbar-lock-size` 는 폐지 대상이다.

**비로그인 보호 라우트(FR-W15)**: 회원 셸 HTML 이 전송되지 않고 3xx 로 끝난다. `/me/goal/[id]` 처럼 의도적으로 권한없음 화면을 보여주는 경로는 예외로 목록에 명시하고, 그 화면에도 법적 고지 블록을 두지 않는다(운영 현재는 두고 있다 — 교정 대상).

## 5. 기능 요구와 수용기준

### FR-W1. 목표 상세

Given 로그인한 목표 소유자가 `/me`에서 관리 버튼을 누른다. When `/me/goal/[id]`를 연다. Then 기존 응원자 목록·잔액·링크·편집 기능이 동일한 데이터로 보이고 다른 회원의 목표 ID는 404로 수렴한다.

### FR-W2. 프리셋 커버

Given 목표 소유자가 `c1`부터 `c6` 중 하나를 고른다. When 저장한다. Then `set_goal_cover_preset`이 소유권을 검사해 즉시 반영하고 `/me`, `/me/goal/[id]`, `/g/[slug]`, 친구 목표 카드가 같은 프리셋을 렌더한다.

### FR-W3. 커스텀 커버

Given 소유자가 5MB 이하 jpg/png/webp를 업로드한다. When MIME·크기·해시 검증을 통과한다. Then 이미지는 비공개 격리 버킷과 `REVIEW` 상태에만 남고 기존 공개 커버는 유지된다. When 관리자가 승인한다. Then 승인본만 공개 버킷으로 복사되고 활성 커버가 원자적으로 교체된다.

### FR-W4. 공개범위

Given 목표 공개범위가 PUBLIC, FRIENDS, PRIVATE 중 하나다. When 비회원·친구·소유자가 각 경로로 조회한다. Then 허용 행렬과 정확히 일치하고, 금지된 경우 제목·이유·커버·워드맵·응원자 메타가 0건이다.

| 조회자 | PUBLIC | FRIENDS | PRIVATE |
|---|---:|---:|---:|
| 비회원·비친구 | 허용 `/g/[slug]` | 거부 | 거부 |
| ACTIVE 친구 | 허용 | 허용 `/friends/[friendId]` | 거부 |
| 소유자 | 허용 | 허용 | 허용 `/me/goal/[id]` |

### FR-W5. 초대 링크

Given 로그인 회원이 PUBLIC 또는 FRIENDS 목표를 선택해 초대를 만든다. When `create_friend_invite`를 호출한다. Then 32바이트 무작위 토큰, 7일 만료, 웹·앱인토스 경로가 반환되고 DB에는 SHA-256 해시만 저장된다. PRIVATE 목표에는 goal 연결 초대를 만들 수 없고, 요청자는 시간당 10개를 넘길 수 없다.

### FR-W6. 초대 수락

Given 유효한 미사용 초대 링크를 다른 로그인 회원이 연다. When 수락한다. Then 초대 행을 잠그고 정렬된 회원 쌍의 친구 관계를 1건만 만든다. 같은 회원의 재시도는 같은 관계를 반환하며, 다른 회원의 재사용·자기초대·만료·차단 관계는 거부한다.

### FR-W7. 친구 목록과 상세

Given ACTIVE 친구 관계가 있다. When `/friends`를 연다. Then 친구별 PUBLIC 또는 FRIENDS 목표만 보인다. When 목표를 연다. Then 제목·이유·커버·응원 인원·워드맵만 보이고 응원 금액·클로버 수·순위는 응답 스키마에 존재하지 않는다.

### FR-W8. 관계 해제

Given ACTIVE 친구가 상세 메뉴에서 친구 끊기를 확정한다. When `remove_friend`가 완료된다. Then 두 사용자 모두 즉시 상대의 FRIENDS 목표를 조회할 수 없고 재연결에는 새 초대 수락이 필요하다.

### FR-W9. 환경설정 호환 계약

Given 인증 회원이 `update_member_preferences`를 호출한다. When 알림·마케팅 동의를 갱신한다. Then 본인 행만 upsert되고 마케팅은 기본 false다. 웹 UI는 이번 슬라이스 비범위지만 RPC는 미니앱 2차 호환을 위해 먼저 제공한다.

### FR-W10. 마이페이지와 반증 가능한 업적

Given 인증 회원이 `/my`를 연다. When `my_social_dashboard`가 본인 데이터를 집계한다. Then 프로필 요약, 삭제되지 않은 내 목표, ACTIVE 친구 수, 달성 목표 수, 받은 확정 응원 수, 연결 친구 수를 반환한다. 업적은 DB 행으로 다시 계산해 같은 값이 나와야 하며 자기신고·금액·순위·연속 기록 필드는 응답에 존재하지 않는다.

### FR-W11. 소속감 큐

Given ACTIVE 친구에게 PUBLIC 또는 FRIENDS 진행 목표가 있다. When 현재 회원의 CONFIRMED 응원 귀속이 없으면 Then `/my` 소속감 큐에 최대 20개를 마감일순으로 보여준다. 비친구·REMOVED·BLOCKED·PRIVATE·종료 목표와 이미 확정 응원한 목표는 0건이다. 귀속 원본은 클라이언트가 직접 읽을 수 없는 `social_cheer_member_attribution`에만 저장한다.

## 6. 핵심 시퀀스

### 6.1 초대 수락

```mermaid
sequenceDiagram
  participant O as 초대한 회원
  participant W as 웹
  participant D as Supabase RPC
  participant N as 초대받은 회원
  O->>W: /invite에서 링크 생성
  W->>D: create_friend_invite(goal_id, WEB)
  D-->>W: token, web_path, expires_at
  O->>N: 선언형 초대 링크 공유
  N->>W: /invite/[token]
  W->>D: friend_invite_preview(token)
  D-->>W: 최소 미리보기
  N->>W: 로그인 후 수락
  W->>D: accept_friend_invite(token)
  D->>D: invite FOR UPDATE, 만료·사용·자기초대 검사
  D->>D: unique ordered pair upsert
  D-->>W: connection_id, friend_member_id
  W-->>N: /friends 복귀
```

### 6.2 커스텀 커버 승인

```mermaid
sequenceDiagram
  participant U as 목표 소유자
  participant W as 웹
  participant E as Edge Function
  participant Q as Quarantine Storage
  participant A as 관리자
  participant P as Public Storage
  U->>W: 이미지 선택
  W->>E: goal-cover-sign-upload
  E-->>W: signed URL, asset_id
  W->>Q: 파일 업로드
  W->>E: goal-cover-finalize
  E->>E: MIME·크기·해시 검증
  E-->>W: REVIEW, 기존 커버 유지
  A->>E: admin-review-goal-cover(APPROVE)
  alt PUBLIC 목표
    E->>P: 승인본 복사
  else FRIENDS 목표
    E->>Q: private 승인본 유지
  end
  E->>E: active_cover_asset_id 원자 교체
  E-->>A: APPROVED
```

## 7. 유저플로우 1:1 매핑

| Step | 사용자 행동 | 라우트 | 엔드포인트·RPC | 프론트 컴포넌트 | 테이블·Storage | 테스트 |
|---|---|---|---|---|---|---|
| WF-01 | 로그인 후 내 목표 홈 진입 | `/me` | 기존 SSR query | `ReceiverPageShell`, `MyGoalListCard`, `ReceiverBottomNav` | `goal`, `member`, `notification` | PW-01 |
| WF-02 | 목표 관리 열기 | `/me/goal/[id]` | owner detail SSR query | 기존 4개 관리 컴포넌트 | `goal`, `cheer`, `clover_balance` | PW-02 |
| WF-03 | 프리셋 커버 선택 | `/me/goal/[id]` | `set_goal_cover_preset` | `GoalCoverPicker` | `goal` | PG-11, PW-03 |
| WF-04 | 커스텀 이미지 업로드 | `/me/goal/[id]` | `goal-cover-sign-upload`, `goal-cover-finalize` | `GoalCoverPicker` | `goal_cover_asset`, quarantine | PG-12, PW-04 |
| WF-05 | 관리자 커버 승인·반려 | `/admin` | `admin-review-goal-cover` | `GoalCoverReviewQueue` | `goal_cover_asset`, 두 bucket, `goal` | PG-13, PW-05 |
| WF-06 | 목표 공개범위 변경 | `/me/goal/[id]` | `set_goal_visibility` | `GoalVisibilityControl` | `goal`, `wordmap_render_cache`, Storage cleanup queue | PG-20, PW-06 |
| WF-07 | 공개 목표에서 승인 커버 확인 | `/g/[slug]` | `goal_public`, `get_wordmap` | 기존 goal public + cover banner | `goal`, approved cover | PG-21, PW-07 |
| WF-08 | 친구 탭 열기 | `/friends` | `my_friend_goals` | `FriendGoalList`, `ReceiverBottomNav` | `friend_connection`, `member`, `goal` | PG-30, PW-08 |
| WF-09 | 친구 0명 상태에서 초대 이동 | `/friends` → `/invite` | Next route navigation | `FriendGoalList` empty state | 없음 | PW-09 |
| WF-10 | 초대 링크 생성·복사 | `/invite` | `create_friend_invite` | `FriendInviteCard` | `friend_invite` | PG-31, PW-10 |
| WF-11 | 비회원이 초대 미리보기 | `/invite/[token]` | `friend_invite_preview` | `InviteAcceptCard` | `friend_invite`, `member`, `goal` 최소 필드 | PG-32, PW-11 |
| WF-12 | 로그인 경계 통과 | `/invite/[token]` | 기존 Kakao auth | 기존 로그인 시트 + `InviteAcceptCard` | `auth.users`, `member` | PW-12 |
| WF-13 | 초대 수락 | `/invite/[token]` | `accept_friend_invite` | `InviteAcceptCard` | `friend_invite`, `friend_connection` | PG-33, CC-01, PW-13 |
| WF-14 | 친구 목록 복귀 | `/friends` | `my_friend_goals` | `FriendGoalList` | `friend_connection`, `goal` | PW-14 |
| WF-15 | 친구 목표 상세 확인 | `/friends/[friendId]?goal=[goalId]` | `friend_goal_detail` | `FriendGoalDetail` | `friend_connection`, `goal`, `cheer` 메시지 투영 | PG-34, PW-15 |
| WF-16 | 친구 관계 해제 | `/friends/[friendId]` | `remove_friend` | detail overflow confirmation | `friend_connection` | PG-35, PW-16 |
| WF-17 | 만료·사용됨·자기초대 복구 | `/invite/[token]` | preview/accept error contract | `InviteAcceptCard` error states | `friend_invite` | PG-36, PW-17 |

매핑 결과: 17/17. 라우트 17/17, 엔드포인트 17/17, 컴포넌트 17/17, 테이블 또는 명시적 무상태 전이 17/17. **매핑 갭 0.**

## 8. 데이터 공개범위와 RLS

1. 새 테이블은 생성과 동시에 RLS를 켜고 정책 부재 시 기본 거부를 유지한다.
2. `friend_connection`과 `friend_invite`는 클라이언트 직접 write를 허용하지 않는다. 상태 변경은 RPC만 수행한다.
3. 친구 조회 RPC는 `auth.uid()`가 관계 당사자인지 내부에서 재검사한다.
4. `SECURITY DEFINER` 함수는 `search_path=''`, 완전 수식 이름, `PUBLIC`·`anon` 실행권 회수, 필요한 role만 grant한다.
5. `goal_public`, `cheer_public`, `get_wordmap`, `wordmap_render_cache`, 렌더 Storage를 공개범위 한 단위로 변경한다. 한 군데라도 늦게 배포하지 않는다.
6. FRIENDS와 PRIVATE 전환 시 캐시 행을 동기 삭제하고 Storage 삭제 작업을 큐에 넣는다. PRIVATE 전환은 해당 목표의 미사용 초대도 같은 transaction에서 revoke한다. 삭제 실패는 설정 성공으로 숨기지 않고 재시도 상태를 반환한다.
7. 소셜 응답에는 `clover_amount`, `amount_krw`, `net_krw`, supporter rank가 없다. 본인 `/me/goal/[id]`만 기존 receiver 권한으로 응원별 클로버 개수를 본다.
8. `/invite/[token]`은 `Referrer-Policy: no-referrer`, 제3자 스크립트 0, 토큰 analytics·server log 0을 강제한다.

## 9. 기존 UI·금전 경로 보존 계약

### 9.1 UI 계승

- `ReceiverPageShell`, `ReceiverTopBar`, 390/1024 반응형 폭, 22px 가로 여백을 유지한다.
- 색은 `#14613A`, `#1B8A4F`, `#1F9E5A`, `#16140F`, `#6F6A60`, `#9C968B`와 기존 background/border 토큰만 사용한다.
- 신규 하단 탭은 기존 상단 알림·로그아웃을 제거하지 않는다.
- 목표 상세는 `/me` 기능을 삭제하지 않고 목표별 경로로 재조합한다. `/me`의 기존 진입점도 유지한다.
- 공개 목표의 게스트 결제, 신고, owner bar, 워드맵을 유지한다.

### 9.2 환전 불변식

이 슬라이스의 migration과 코드는 cashout 테이블·함수·컴포넌트를 수정하지 않는다. 회귀 테스트는 다음을 고정한다.

```text
fee = floor(gross * 10 / 100)
vat = floor(fee * 10 / 100)
withhold = floor((gross - fee - vat) * 33 / 1000)
net = gross - fee - vat - withhold
```

A안 잠금 로직, advisory lock, `status='REQUESTED'` 조건, 진행 중 신청 유니크 제약을 유지한다. `web/e2e/cashout-manual.spec.ts`와 `supabase/tests/cashout_security_hardening.test.sql`은 삭제·약화 금지다. 운영 DB에는 테스트 환전 신청을 만들지 않는다.

## 10. 모바일 2차 전환

### 10.1 그대로 재사용

| 자산 | 재사용 이유 |
|---|---|
| 5개 RPC 이름과 JSON 필드 | 미니앱 `gateway.ts`가 이미 호출 |
| 친구·초대·커버·선호 테이블 | 채널 독립 도메인 |
| RLS·공개범위·금액 비공개 | 모든 채널 공통 보안 경계 |
| 커버 Storage와 승인 수명주기 | 승인된 공개 자산만 소비 |
| 에러 코드 | 웹·모바일 동일 복구 분기 |

### 10.2 모바일에서 다시 만드는 것

| 대상 | 이유 |
|---|---|
| CSR 화면·내비게이션 | 앱인토스는 SSR 금지. Next.js Server Component 재사용 불가 |
| `auth-toss`와 `member_identity` | 미니앱 내부는 토스 로그인만 허용 |
| 공유 어댑터 | intoss share link 사용. 자사 웹 fallback 의존 금지 |
| Toss lifecycle·back handler | 외부 사이트 WebView 중첩 금지, 플랫폼 규격 준수 |

모바일 2차에는 결제·환전·현금 응원을 포함하지 않는다. 앱인토스 정책상 현금 또는 유사자산 교환·전환과 외부 결제 이동은 출시 불가 또는 고위험이므로 서면 사전검토 없이는 범위를 넓히지 않는다.

## 11. 배포 순서·관측·롤백

1. DB additive migration과 pgTAP을 먼저 적용한다. UI는 아직 노출하지 않는다.
2. 기존 호환 5종과 웹 추가 4종을 합친 공통 RPC 9종의 계약을 smoke한다.
3. 커버 Edge Function과 private/public bucket 정책을 적용한다. PUBLIC 승인 커버만 public bucket으로 복사하고, FRIENDS 승인 커버는 private object로 유지한 뒤 ACTIVE 친구 확인 후 120초 Presigned URL로만 제공한다.
4. 웹을 배포하고 feature flag로 내부 계정에만 연다.
5. Playwright 17경로와 기존 cashout 회귀를 통과한다.
6. 웹 일반 사용자에게 연다.
7. 모바일은 별도 build·QA·심사 게이트로 진행한다.

관측 이벤트: `friend_invite_created`, `friend_invite_previewed`, `friend_invite_accepted`, `friend_list_viewed`, `friend_goal_viewed`, `goal_cover_submitted`, `goal_cover_approved`. 토큰·회원 원문 식별자·금액은 이벤트 속성에서 제외한다.

롤백은 웹 feature flag를 먼저 닫고 함수 execute grant를 회수한다. 신규 테이블과 컬럼은 운영 데이터 보존을 위해 즉시 drop하지 않는다. PUBLIC backfill을 되돌리지 않고 기존 웹 동작을 유지한다.

## 12. 비범위와 후속 슬라이스

| 항목 | 다음 슬라이스로 미루는 이유 |
|---|---|
| 활동 타임라인 | 이벤트 모델과 보존기간이 추가로 필요 |
| 자기신고·사용자 간 순위·연속 접속 기록 | DB 집계로 반증할 수 없어 허위 성취·랭킹 인상을 만들 수 있음 |
| 부스트 클로버 | 환전 불가 자산과 기존 클로버 혼동 위험 |
| 자동 이미지 모더레이션 | 공급자·비용·오탐 정책 결정 필요. 현재는 수동 검수로 기능 완결 |
| 친구 추천·연락처 | 개인정보와 권한 부담이 1차 가치보다 큼 |
| 앱인토스 출시 | CSR·토스 로그인·심사라는 별도 제품 작업 |

## 13. 추적성·갭 판정

| 요구 | 설계 | API | 테스트 | 판정 |
|---|---|---|---|---|
| 목표 상세 | §4 `/me/goal/[id]` | owner SSR + 기존 RPC | PW-02 | 완결 |
| 목표 커버 | §5 FR-W2·W3 | preset + 3 EF | PG-11~13, PW-03~05 | 완결 |
| 공개범위 | §5 FR-W4, §8 | visibility RPC + 조회 RPC | PG-20~21, PW-06~07 | 완결 |
| 초대 링크 | §5 FR-W5·W6 | create/preview/accept | PG-31~33, CC-01 | 완결 |
| 친구 목록·상세 | §5 FR-W7·W8 | list/detail/remove | PG-30, PG-34~35 | 완결 |
| 미니앱 호환 | §10 | 5개 이름 유지 | CT-01 | 완결 |
| 돈 경로 보존 | §9.2 | 변경 없음 | REG-CASH-01~02 | 완결 |
| 마이페이지·업적 | §5 FR-W10 | `my_social_dashboard` | PG-MY-01~08, CT-MY-01~02, MY-01 | 완결 |
| 소속감 큐 | §5 FR-W11 | attribution + `my_social_dashboard` | PG-MY-06~08, MY-01 | 완결 |

**v1.2.0 추가 추적 (신규 요구 7건 + 2건)**

| 요구 | 설계 | API·경계 | 테스트 | 판정 |
|---|---|---|---|---|
| R1 법적 고지 이동 | §A.5 FR-W12, §4 라우트 표 | `exposure.ts` 상수(서버 호출 0) | LG-01~05 | 완결 (랜딩 값은 D-OPEN-4) |
| R2 비회원 티저 | §A.5 FR-W18 | api-contract §A.2 금지 필드 계약 | GT-01~03 | 완결 (데이터 범위는 D-OPEN-1) |
| R3 고정 CTA 흐름 편입 | §A.5 FR-W16 | 없음 | SP-03 | 완결 |
| R5 배너 선택기 SSOT·상태기계 | §A.5 FR-W13 | api-contract §5 + §A.4 상태기계 | CV-01~06 | 완결 (구조는 D-OPEN-3) |
| R6 응원 요약 바 | §A.5 FR-W14 | `my_social_dashboard()` 확장 | CS-01~04 | 완결 |
| R9·R10 간격 토큰 | §A.5 FR-W16 | 없음 | SP-01~04 | 완결 |
| D-034 비로그인 셸 차단 | §A.5 FR-W15 | `proxy.ts` 확장 + `protected-routes.json` | AU-01~04 | 완결 (층은 D-OPEN-2) |
| D-030-C 2줄 말줄임 | §A.5 FR-W14 | 없음 | CL-01~04 | 완결 |
| D-024 응원=친구·관계 방향 | §A.5 FR-W17, §1.3 | `my_friend_goals()`·`friend_goal_detail()` 의 `relationship_direction` | FD-01~03 | 완결 |

**설계 갭은 0이다.** v1.1.0 의 17건 + v1.2.0 의 9건 = 26건이 요구에서 테스트까지 끊기지 않는다. 자동 이미지 모더레이션과 앱인토스 출시는 비범위이며, 1차 기능은 수동 검수와 웹 경로로 독립 완결된다.

**합의 대기 4건은 갭이 아니다.** 각 건에 추천안이 기본값으로 배선돼 있고 바뀔 때의 영향 범위가 §A.7 에 적혀 있다. 열어 둔 것은 판단이고 멈춰 둔 것은 없다.

**build stage 진입 판정: 가능.** 조건은 이 문서와 동반 ERD·API·test-plan이 eng-design 게이트에서 승인되고, additive migration을 코드 리뷰하는 것이다. 이 판정은 구현·배포 완료를 뜻하지 않는다.

## 14. 벤치마크·자기심문·레드팀

### 14.1 차용과 변경

| 근거 | 차용 | 해낼게에서 다르게 한 것 |
|---|---|---|
| Supabase RLS·Database Functions | `SECURITY DEFINER` search path 고정, execute 최소권한 | 공개 데이터도 기반 테이블을 열지 않고 필드가 제한된 RPC·view 사용 |
| PostgreSQL pgcrypto | CSPRNG 32바이트와 SHA-256 digest | 원문 토큰을 DB에 저장하지 않음 |
| OWASP URL token 지침 | 무작위·충분한 길이·만료·1회성·안전 저장 | 7일 TTL, 같은 수락자의 재시도만 멱등 허용 |
| 앱인토스 공식 정책 | Toss 로그인, 외부 이동·현금 전환 제한 | 모바일을 2차로 격리하고 웹 백엔드 계약만 공유 |
| BRAIN 공유장벽 | 요청이 아니라 선언을 공유 | 초대 메시지에 돈·도움을 요구하는 문구를 넣지 않음 |

### 14.2 셀프심문

**이 결론이 틀렸다면 가장 그럴듯한 이유는?** 프리셋과 초대만으로도 검증할 수 있는데 수동 커버 검수 큐까지 넣어 첫 슬라이스가 커졌을 수 있다. 그러나 커스텀 업로드는 승인 디자인의 명시 요구이고, 승인 전 공개를 허용하면 보안 결함이 된다. 유료 공급자를 고르지 않고 기존 관리자 화면에 최소 큐를 붙이는 것이 요구와 비용 제약을 함께 만족하는 가장 작은 완결안이다.

가장 load-bearing한 가정은 친구공개가 공개 목표와 별도 가치를 만든다는 것이다. 이 가정이 틀려도 `PUBLIC` 기본값으로 기존 경로는 유지되고, FRIENDS는 데이터 유출을 막는 옵션으로 남는다. 스키마를 제거하지 않고 UI flag만 닫을 수 있다.

### 14.3 레드팀

회의적 보안 리뷰어는 “토큰 링크 하나로 사용자와 목표 이름을 보여주면 토큰 유출 자체가 개인정보 유출”이라고 공격할 수 있다. 그래서 미리보기는 inviter nickname, 선택한 goal title, 승인 cover만 반환하고 응원자·메시지·금액·프로필 식별자는 반환하지 않는다. token route는 no-referrer, 제3자 스크립트 0, 로그 0으로 제한한다. 수락 전에는 친구공개 데이터에 접근할 수 없다.

## 15. 개정 이력

| 버전 | 일자 | 변경 | 작성자 |
|---|---|---|---|
| **v1.2.0** | **2026-10-19** | **design 6차 개정(R1~R10)·D-024·D-032·D-034·D-037 반영. 상류 핀을 v3-opus5 로 교체. 전제 실측표 신설(운영 RPC 10종·엣지 함수 3종·테이블 5종 직접 확인). 신규 요구 9건 추적성 매트릭스로 갭 0 복구. FR-W12~W18 신설. `erDiagram` 추가. §1.3 친구 정의를 D-024 로 교정. 합의 대기 결정 4건을 선택지로 분리** | **tech-architect / claude-opus-5[1m]** |
| v1.1.0 | 2026-10-13 | D-022 마이페이지·DB 집계 업적·소속감 큐 승격, 비로그인 목표 관리와 `/my` 탭 결함 수정 계약 | code-builder / gpt-5-codex |
| v1.0.1 | 2026-10-13 | D-019 FRIENDS private Storage와 120초 Presigned URL 계약 반영 | code-builder / gpt-5-codex |
| v1.0.0 | 2026-10-13 | 앱인토스 중심 v0.1.0을 웹 우선 1차 슬라이스로 재구성 | tech-architect / gpt-5-codex |

### v1.2.0 종료 보고

KNOWLEDGE_QUERY: BRAIN `wiki/business/마케팅/` 목록 확인 후 유저심리 6단계 정본·공유장벽 선언vs요청·전환 마찰 3건을 지명 조회. 웹은 ①Next.js 16 `proxy.ts` 와 Supabase 인증 경계 ②App Router `redirect()` 의 스트리밍 동작 2건 실조사. 레포는 결정 원장 D-003~D-037, 요청 원장 최근 40건, 실수 원장 2종, 승인 산출물 7종 sha256 대조, 운영 Supabase 실측 5회, 운영 웹 실측 2회, 제품 코드 9파일.

HITS_USED: `synthesis-유저심리-6단계-정본.md` 윤리 1선(거짓·가짜 희소성 금지) → FR-W18 "실측할 수 없으면 수치를 쓰지 않는다" 의 근거. `concept-공유장벽-선언vs요청-UGC바이럴.md` → 티저 문안을 선언형으로 둔 근거. Next.js `redirect` 공식 레퍼런스 → D-034 원인을 문서 근거로 승격. Next.js Authentication 가이드 → proxy 를 "추가" 로 규정. OWASP Excessive Data Exposure → FR-W18 의 서버 응답 필드 제한.

HITS_REJECTED: BRAIN 의 공격적 전환·가격 부양 계열은 이번 과업(노출 경계·인증 층)과 무관해 미채택. `question-전환-마찰-…` 은 가입 마찰 설계라 적용점 없음. Smithery·skills.sh 의 Next 16 페이지는 출처 신뢰도 미확인이라 근거로 쓰지 않음. `vendor_selection` 표는 외부 공급자를 하나도 추천하지 않으므로(자동 모더레이션 비범위 유지) 작성 대상 아님.

CONFLICTS: ①승인 시안의 `GUEST_TEASER.friends` 수치·흐림 처리와 회장 정본의 윤리 1선, D-003, OWASP 가 충돌 → D-OPEN-1 로 올림(D-023 "하한이 이기고 그때 시안 정본을 고친다" 의 연장). ②시안 `biz` 블록 기재 항목이 운영 배포본보다 적음 → D-OPEN-4. ③D-034 의 "`/my`·`/friends` 와 같은 처리로 맞춰라" 는 실측상 세 라우트 코드가 동일하므로 따르면 재발 → 층을 올리는 쪽으로 다시 냄. ④아키텍처 v1.1.0 의 "운영 0건" 과 실측이 충돌 → 실측이 이김.

SKILLS_USED: 없음.

SKILLS_SKIPPED: `diagram`·`document-generate` = 승인된 기존 설계의 개정이고 신규 다이어그램 파일·문서 생성이 아니다(mermaid 는 문서 내 작성). `spec` = 대화형이라 서브에이전트 금지.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "회장이 겪은 배너 업로드 오류의 운영 쪽 원인은 확정하지 못했다. 프로토타입 결함과 같은 원인인지는 미검증이고 build 첫 항목으로 넘겼다."

SOURCES/MODEL: claude-opus-5[1m] | `~/.claude/pipeline/product-lane.yaml` · `~/.claude/standards/standard-eng-design.md` · `pipeline-state.v2.md` · `wiki/거버넌스/결정.md` · `wiki/거버넌스/요청.md` · `docs/design/prototypes/social-viral-loop-v3-opus5.html` · `DESIGN.md` · `docs/eng-design/*-v1.1.0.md` 5종 · `web/src/proxy.ts` · `web/src/app/(receiver)/layout.tsx` · `web/src/app/(receiver)/me/page.tsx` · `web/src/app/globals.css` · `web/src/lib/social/server.ts` · `web/src/components/goal/MyGoalListCard.tsx` · `web/src/components/receiver/CheerList.tsx` · `supabase/migrations/2026101*` · 운영 Supabase `ossvejipdivgxzcqszbw` 실측 · `https://haenael-ge.vercel.app` 실측 · https://nextjs.org/docs/app/api-reference/functions/redirect · https://nextjs.org/docs/app/guides/authentication · https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/12-API_Testing/03-Excessive_Data_Exposure/ · https://vercel.com/academy/subscription-store/proxy-and-protected-routes

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 확인 / mermaid 4종(flowchart 1·sequence 2·erDiagram 1) / 컨트롤러 표시용 창은 열지 않음

---

### v1.1.0 종료 보고 (보존)

KNOWLEDGE_QUERY: BRAIN `wiki/business/index.md`에서 유저심리·공유장벽·신뢰·전환마찰을 좁혀 조회. 외부는 Supabase RLS·보안 함수, PostgreSQL pgcrypto, OWASP URL token, 앱인토스 서비스 정책·WebView 제약을 조회.

HITS_USED: `concept-공유장벽-선언vs요청-UGC바이럴.md`의 선언형 공유 원칙, `question-전환-마찰-제거인가-신뢰-마찰-추가인가.md`의 신뢰를 위한 검증 마찰, Supabase의 RLS·함수 권한 최소화, PostgreSQL의 CSPRNG·digest, OWASP의 만료·1회성 token, 앱인토스 공식 로그인·외부이동·현금전환 제약.

HITS_REJECTED: BRAIN의 공격적 전환·가격 부양 프레임은 친구 초대 신뢰를 훼손해 미채택. 외부 자동 이미지 모더레이션 공급자는 비용과 오탐 정책 결정이 필요해 1차에서 미채택. 앱인토스 노출·포인트는 모바일 2차 범위라 미채택.

CONFLICTS: 승인 프로토타입은 소셜 전체 루프를 한 번에 보여주지만 D-018은 웹 1차에서 타임라인·업적·부스트를 제외한다. 앱인토스 정책은 외부 웹 중첩·현금 전환을 제한하므로 웹 완주 후 별도 CSR 채널로 분리했다.

SKILLS_USED: docs. 전달용 문서의 목차·표·다이어그램·추적성·검증 구조에 적용.

SKILLS_SKIPPED: document-generate·diagram은 현재 Codex available-skills에 없어 사용 불가. Mermaid를 문서 안에 작성하고 별도 정적 검증한다.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "수동 이미지 검수의 실제 운영 응답시간은 첫 운영 데이터가 없어 수치 목표를 두지 못했다."

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 PASS / Mermaid 3종 실제 렌더 PASS / 컨트롤러 표시용 창은 열지 않음

SOURCES/MODEL: gpt-5/codex | `pipeline-state.core.md`; `wiki/거버넌스/결정.md`; `docs/구현현황.md`; `docs/plan/haenael-v2-blueprint-v1.0.0-opus48.md`; `DESIGN.md`; `docs/design/README.md`; `docs/design/ui-architecture.md`; `docs/design/user-flow.md`; `docs/design/prototypes/screen-inventory-v3.md`; `docs/design/prototypes/social-viral-loop-v2-opus48.html`; `docs/eng-design/fdd-core-social-viral-loop-appintoss-v0.1.0-gpt-codex.md`; `docs/eng-design/eng-design-goal-visibility-supporter-v1.0.0-claude-opus.md`; `web/src`; `miniapp/src/gateway.ts`; `supabase/migrations`; `~/SJ_BRAIN_wiki/wiki/business/index.md`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/synthesis-유저심리-6단계-정본.md`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/question-전환-마찰-제거인가-신뢰-마찰-추가인가.md`; https://supabase.com/docs/guides/database/postgres/row-level-security; https://supabase.com/docs/guides/database/functions; https://supabase.com/docs/guides/storage/security/access-control; https://www.postgresql.org/docs/current/ddl-rowsecurity.html; https://www.postgresql.org/docs/17/pgcrypto.html; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html; https://developers-apps-in-toss.toss.im/intro/guide.md
