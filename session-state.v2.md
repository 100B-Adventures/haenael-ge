# session-state.v2.md — V2 소셜 바이럴 루프 라인 핸드오프

> 라인 `v2`. 파이프라인 확정 마일스톤은 `pipeline-state.v2.md`, 이 파일은 진행 중 서사다.
> v1 환전 라인 인계는 `session-state.core.md` 가 소유한다. 서로 덮지 않는다.
> 최신순 역순.

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
