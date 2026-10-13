# session-state.v2.md — V2 소셜 바이럴 루프 라인 핸드오프

> 라인 `v2`. 파이프라인 확정 마일스톤은 `pipeline-state.v2.md`, 이 파일은 진행 중 서사다.
> v1 환전 라인 인계는 `session-state.core.md` 가 소유한다. 서로 덮지 않는다.
> 최신순 역순.

## 목적

목적: 해낼게를 "혼자 쓰는 목표 저금통" 에서 "친구가 응원하러 들어오는 자리" 로 바꾼다. 받는 사람이 목표를 공개 범위로 나누고, 초대 링크로 친구를 연결하고, 친구 목표에 응원을 남기는 루프를 웹에서 먼저 완결한 뒤 앱인토스 미니앱으로 확장한다. 성공 판정은 초대를 받은 사람이 가입하고 응원 1건을 남기는 비율이다. 환전(v1)은 이 라인이 건드리지 않는다.

## 2026-10-13 16:13 KST · build 2차 슬라이스 구현·로컬 검증 완결

**관찰된 결과**

- `/my`에 프로필, 내 목표, 친구 수, DB 집계 업적 3종, 미응원 친구 목표 큐를 구현했다. 비로그인 목표 관리는 권한없음 상태로 분기하고, 마이 탭은 `/my`에서 실제 활성화된다.
- 로컬 DB reset 뒤 pgTAP 18파일 322건 PASS. CT-01 포함 contract 7건 PASS. 전체 단위·통합 52파일 311건 PASS.
- 전체 social Playwright 11/11 PASS. 요구된 PW-02~07·CC-01, AUTH-GOAL-01·MY-01, 전역 SMOKE-01, attribution replay 보안 ORDER-ATTR-01을 포함한다. PW-05·CC-01·ORDER-ATTR-01 단독 묶음도 3/3 PASS.
- 실제 390px `/my`: 13px 미만 0, 본문 중앙값 16px, 44px 미만 누름 0, active 피드백 100%, 가로 넘침 0, 콘솔 오류 0. Storybook 데이터 fixture는 360~1000 아홉 폭 전부 PASS.
- Next production build와 정적 생성 17/17 PASS. 환경변수 인벤토리는 35/35 분류됐다.
- 프로토타입 대 구현 수치 대조표와 증거는 `docs/build-log.md`, 최신 구현 상태는 `docs/구현현황.md`에 기록했다. FDD/ERD/API/architecture/test-plan은 v1.1.0으로 버전업돼 D-022 근거를 포함한다.

**독립 리뷰와 경계**

- 코드리뷰가 탭 라벨 기대값 드리프트, PW-05 순서 의존, CC-01 약한 어서션, replay attribution 선점을 발견했다. 모두 수정하고 실 E2E로 재검증했다. 보안 reviewer 잔존 지적은 0건이다.
- 주문 생성과 attribution insert는 단일 DB transaction이 아니다. 이를 원자화하려면 기존 `create_cheer_order` API 계약 변경이 필요하므로 후속 기술설계 위험으로 남겼다.
- migration 이전 응원은 신뢰 가능한 회원 식별 원본이 없어 backfill하지 않는다. 큐의 응원 제외는 migration 이후 회원 응원부터 정확하다.
- 운영 DB는 미적용이다. `20261013050000`, `20261013060000` 모두 회장 승인 전에는 적용하지 않는다.

**다음**

1. 컨트롤러가 v1.1.0 설계 5종과 `docs/build-log.md`를 재검증한다.
2. `/approve build` 통과 시 qa-verifier가 독립 QA를 수행한다.
3. 운영 migration 적용과 배포는 QA 승인 뒤 별도 승인으로 진행한다.

## 2026-10-13 15:05 KST · 운영 DB 미적용 확인, 업적·마이페이지를 범위로 올려 2차 위임

**회장 지적 4건에 대한 실측과 조치**

1. 운영 DB 적용 여부를 실측했다. `supabase migration list --linked` 결과 `20261013050000` 은 `local` 에만 있고 `remote` 가 공백이다. 즉 1차 build 의 "서버" 는 **마이그레이션 파일과 테스트까지이고 운영 DB 에는 반영되지 않았다.** 적용은 비가역 스키마 변경이라 회장 승인 사항이므로 적용하지 않았다. 직전 인계에 "서버가 생겼다" 로 적은 것은 범위를 좁혀 적어야 한다. 정확히는 **스키마 코드 완성, 운영 미적용** 이다.
2. 웹과 미니앱 공유자산을 파일 단위로 다시 셌다. `web/src/components` tsx 68개 중 `next/*` 를 import 하는 것은 **18개뿐**이다. 나머지는 Next 비의존 React 컴포넌트이므로 공통 패키지로 뽑을 수 있다. 직전 인계의 "공유자산 0" 은 **현재 공유 설정이 0** 이라는 뜻이고 **공유 가능성이 0 은 아니다.** 공통 패키지 추출 선행과제의 난이도를 이 수치로 다시 잡는다.
3. FDD 12절이 업적을 미룬 사유는 "허위 성취 방어 기준 필요" 였다. 기준 없음을 범위 축소로 갈음한 것이 결함이다. 기준을 D-022 로 확정했다: **DB 집계로 반증 가능한 지표만 업적으로 삼는다.** 달성 목표 수, 받은 응원 수, 연결 친구 수. 자기신고·랭킹·연속기록은 제외.
4. 마이페이지(/my), 소속감 큐, 업적, 비로그인 권한 분기 결함, 하단탭 마이 중복 경로 결함을 묶어 2차 build 로 Codex 에 위임했다(로그 `bzmiby102`). 운영 DB 적용은 위임 범위에서 명시적으로 제외했다.

**다음**
- 2차 위임 회수 후 재검증(단위·빌드·라우트·시안 대조표)
- 미완 검증 3종(pgTAP, Playwright, 수치 대조표) 완결 여부 확인
- 마이그레이션 운영 적용 승인 요청. 추가 마이그레이션이 생기면 함께 한 번에 적용


## 2026-10-13 11:55 KST — build 1차 구현 완료, 검증 일부 미완

**무슨 작업의 어디까지**

Codex `code-builder` 위임이 **제한 시간 초과로 두 번 끊겼다**(각 2700초). 원인은 하네스 전역 무거운 작업 세마포어다. 상한 2개인데 다른 세션의 `./gradlew test` 와 또 다른 Codex 가 슬롯을 물고 있어 Next production build 가 대기열에 걸렸고, 워커가 그 대기 중에 시간을 다 썼다. 코드 자체의 문제가 아니다.

구현 커밋 4건은 보존됐다: `6c250dc` 서버 계약, `8607a48` 웹 화면, `f4cfb65` D-019 검증 갭, `d7431ce` 설계문서 D-019 패치 핀. 끊긴 시점의 작업트리는 `fcc649b` 로 보존했다.

**컨트롤러가 직접 돌린 재검증 (관찰됨)**

| 항목 | 결과 |
|---|---|
| web 단위 테스트 | 303/303 통과 · 테스트 파일 50개 · 30.65초 |
| 환전 공제 기준값 | 27000→23238, 40000→34426 어서션 추가 통과. 기존 어서션 삭제·약화 0 |
| Next production build | 통과 |
| 신규 라우트 빌드 포함 | `/friends`, `/friends/[friendId]`, `/invite`, `/invite/[token]`, `/me/goal/[id]` 전부 |
| 프로덕션 서버 라우트 응답 | 7개 전부 200, 서버 로그 오류 0건 |
| 초대 만료·없는 토큰 분기 | `/invite/<없는토큰>` → "이 초대를 사용할 수 없어요 · 초대 링크를 찾을 수 없어요" 정상 |
| 위임 품질 검증 | `verify-agent-quality.sh code-builder` → PASS(Skill 1회 · 참조조회 57회 · 소크라마커 509) |

**마이그레이션 직접 감사 (관찰됨)**

`20261013050000_social_viral_loop_web_first.sql` 536행. 테이블 5개(`member_preference`·`friend_invite`·`friend_connection`·`goal_cover_asset`·`storage_cleanup_queue`), 인덱스 8개, `goal.visibility` 컬럼을 `CHECK (visibility IN ('PUBLIC','FRIENDS','PRIVATE')) DEFAULT 'PUBLIC'` 로 추가. 기존 목표가 전부 PUBLIC 이 되므로 현재 동작이 보존된다.

- 초대 토큰은 `token_hash bytea NOT NULL UNIQUE` 뿐이고 **원문 컬럼이 없다**. 만료 7일.
- 서버 함수 이름 5종(`create_friend_invite`·`friend_goal_detail`·`my_friend_goals`·`set_goal_cover_preset`·`update_member_preferences`) 전부 존재. 미니앱 호환 계약 유지됨.
- **D-019 가 코드로 구현됐다**: 199~200행이 `cover_public_path` 를 `visibility = 'PUBLIC'` 일 때만 주고, `FRIENDS` 는 `quarantine_path`(비공개 버킷)만 준다.
- 환전 스키마·함수·정책은 손대지 않았다. 파일 내 `cashout` 언급은 1행 주석뿐이다.

**디자인 시안 대조 (컨트롤러 직접, 토큰 단위)**

| 항목 | 프로토타입 `social-viral-loop-v2-opus48.html` | 구현 `globals.css` | 판정 |
|---|---|---|---|
| 탭바 높이 | 64px | `--tabbar-height: 64px` | 일치 |
| 아이콘 크기 | 23px | `--tabbar-icon-size: 23px` | 일치 |
| 아이콘 선 굵기 | 1.9 | `stroke-width: 1.9` | 일치 |
| 라벨 | 10px / 700 | `--tabbar-label-size: 10px` · `font-weight: 700` | 일치 |
| 아이콘·라벨 간격 | 3px | `gap: 3px` | 일치 |
| 활성·비활성색 | `--clover` · `--faint` | 동일 | 일치 |
| 비회원 잠금 뱃지 | 11px | `--tabbar-lock-size: 11px` | 일치 |
| 탭 구성 | 홈·친구·초대·마이페이지 | 홈·친구·초대·마이 | 라벨만 축약 |

**남은 것과 결함**

1. pgTAP 재실행, Playwright 실행, 프로토타입 수치 대조표(워커 제출분)가 미완이다. 같은 역할로 재위임해 끝낸다. 컨트롤러가 직접 고쳐 통과시키지 않는다.
2. **P2 결함 1건(컨트롤러 발견)**: 비로그인 상태로 `/me/goal/1` 을 열면 리다이렉트 없이 셸이 렌더된다. 목표 제목·응원 명단·금액은 노출되지 않아(실측: 빈 셸과 로딩 안내만) 데이터 유출은 아니지만, 기능설계 §4 가 정한 "권한없음" 상태로 가지 않는다. 상단바에 "로그아웃" 이 비회원에게 보이는 문제도 같은 자리다.
3. **설계 모순 1건(워커 발견, 해소됨)**: 서버 함수 계약 문서에 "승인하면 항상 공개 버킷으로 복사" 라는 D-019 와 어긋나는 낡은 문장이 있었다. 워커가 D-019 를 우선 적용해 구현하고 문서를 패치했다(`d7431ce`).
4. **세마포어가 위임을 두 번 죽였다.** 무거운 작업 상한 2개와 워커 제한 시간 2700초가 맞지 않는다. 빌드 대기만으로 제한 시간을 다 쓰는 구조다. 하네스 개선 후보로 등록한다.

**다음**

1. 재위임으로 pgTAP·Playwright·대조표 완결. 세마포어 혼잡을 피하려면 다른 세션의 무거운 작업이 끝난 뒤에 던진다.
2. P2 1건 수정.
3. 통과하면 `/approve build` 후 qa 위임. 운영 배포는 qa 승인 후.

---

## 2026-10-13 10:20 KST — 라인 신설과 build 착수

**무슨 작업의 어디까지**

회장 지시로 V2 를 core 라인에서 떼어 이 라인으로 옮겼다(D-020). core 의 v2 디자인 핀 6건과 웹 우선 설계 핀 5건을 `pipeline-state.v2.md` 로 이관했고 core 는 `current_stage: build` 인 v1 환전 라인으로 환원했다. eng-design 을 승인하고(회장 "설계 됐으면 또 codex 시켜서 다음단계 진행해") build 를 Codex `code-builder` 에 위임해 실행 중이다.

위임 범위는 1단계 서버(additive 마이그레이션, RPC·엣지 함수, 공개범위 RLS, D-019 Presigned URL 커버 경로, pgTAP), 2단계 웹 화면(`/me/goal/[id]`·`/friends`·`/friends/[friendId]`·`/invite`·`/invite/[token]`·`/g/[slug]` 커버 배너·`/admin` 커버 검수·하단탭 4개)이다. 로그는 `scratchpad/codex-build.log`.

**이번 턴에 확정된 사실**

- 앱인토스 SSR 금지가 **공식 문서로 확인됐다**(D-021). 비게임 출시 가이드 원문 "Server-side rendering (SSR) cannot be used. Only client-side rendering (CSR) or static site generation (SSG) may be used." 및 "The content ultimately displayed must be rendered within the Toss domain." 종전 `근거 확인` → `관찰됨`. 종전 보고의 "토스 CDN" 표현은 부정확하므로 쓰지 않는다. 번들은 `.ait` 로 토스 인프라에 배포된다.
- 미니앱 `.ait` 번들은 **이미 빌드돼 있다**: `miniapp/haenael-ge.ait` 1,706,438 바이트, 2026-10-06 08:47. `miniapp/apps-in-toss.config.ts` 에 `appName: haenael-ge`, `brand.primaryColor: #1B8A4F`, `webBundleDir: dist` 설정됨. 남은 것은 `ait deploy` 와 입점 심사다.
- `miniapp/scripts/check-static-guard.mjs` 가 SSR·Next 의존·결제·환전·외부 웹 이동·카카오 로그인을 소스에서 정적으로 차단하고 `npm run build` 앞단에 걸려 있다. 즉 SSR 금지가 빌드 단계에서 기계적으로 강제된다.
- **웹과 미니앱 공유자산은 0이다.** 루트 `package.json` 에 workspaces 가 없고 `miniapp/src` 가 `web/src` 를 한 줄도 import 하지 않는다. 스토리북·린터·테스트 러너가 각자 따로다. 모바일 2차 진입 전 공통 패키지 추출이 선행 과제다.
- 디자인 시안 대조 결과: 하단탭 4개 라벨(홈·친구·초대·마이)이 프로토타입과 FDD §4 에서 일치한다. 프로토 프레임 S1(목표 관리)·S3(초대·연결)·S4(친구목록)는 이번 슬라이스에 포함됐고, S2(마이페이지 전체)·S5(소속감 큐)·S6(업적)는 FDD §12 에 사유를 적고 비범위로 뺐다. `마이` 탭은 이번 슬라이스에서 `/me` 로 연결한다.

**다음**

1. Codex build 회수 후 `verify-agent-quality.sh <출력> code-builder` 통과 확인. FAIL 이면 재위임(직접 고쳐 통과시키지 않는다).
2. 산출물 재검증: 운영이 아닌 로컬에서 마이그레이션 적용, pgTAP 결과, dev 서버 신규 라우트 스모크, 프로토타입 수치 대조표를 컨트롤러가 직접 재실행한다.
3. 통과하면 `/approve build` 후 qa 위임. 운영 배포는 qa 승인 후.

**결정 대기**

- 앱인토스 입점 사전문의(`docs/growth/appintoss-pre-inquiry-v0.1.0.html`) 발송 여부. 회장 판단. 웹 구현 중에 답을 받아 두면 모바일 단계에서 헛일이 안 된다.
- V2 디자인 핀은 이 라인에서 approved 로 올렸다. 회장이 시안 자체를 다시 보고 싶으면 열람 허브가 있다.
