# 해낼게 온프렘 114 Codex 접근 세팅

## 2026-11-07 16:05 KST · 외부 계정 로그인 준비 인계

### 무엇을 어디까지 했나

- 로컬 브라우저 자동화 정본과 Chrome 프로필 5개를 확인했다. Chrome 9342에 Kakao QR, Toss Payments, GitHub 조직 runner group 로그인 화면을 열어 두었다. noVNC 주소는 `http://100.117.68.81:6342/vnc.html?autoconnect=1&resize=scale`이다.
- Supabase staging에 로컬 Toss test secret만 `TOSS_SECRET_KEY`로 등록했다. live key는 사용하지 않았다.
- self-hosted runner는 `self-hosted`, `onprem-114`, `android-kvm` 라벨과 `Listening for Jobs` 상태를 확인했다. run `42324947776`의 `e2e-v2-social`은 queued다.

### 남은 이슈·블로커

- 세 서비스 모두 저장 로그인 0건이다. Kakao QR 승인, Toss Payments 로그인, GitHub 로그인이 필요하다.
- GitHub Default runner group의 public repository 허용 여부는 유력 후보지만 관리 API가 HTTP 403이라 현재 설정값은 미확인이다.
- Kakao 실제 callback, Toss sandbox success callback, GitHub self-hosted job 실행은 미검증이다. 이번 작업에서는 디자인 픽셀 QA를 수행하거나 통과 판정하지 않았다.

### 다음에 칠 명령

- 로그인 상태 확인: `curl -fsS http://127.0.0.1:9342/json/list | jq -r '.[] | select(.type=="page") | [.id[0:8], .title, .url] | @tsv'`
- GitHub 상태 확인: `gh run view 42324947776 --repo 100B-Adventures/haenael-ge --json status,conclusion,jobs`
- 로그인 완료 뒤 같은 9342 탭에서 Kakao Redirect URI, Toss test-key access policy, GitHub Default runner group 설정을 확인하고 각각 실제 OAuth, sandbox callback, self-hosted CI를 재실행한다.

### 검증했나

- 관찰됨: staging health HTTP 200, DB ok, sourceSha `a738543dc307d764c0244723d865a9d7dc97d899`, `PAYMENTS_ENABLED=false`, `cheer-order` HTTP 503 `payments_disabled`, runner listener online, 세 로그인 화면 유지.
- 테스트됨: 기존 staging social E2E 43/43 PASS와 fixture 0. 이는 디자인 픽셀 QA 증거가 아니다.
- 미검증: Kakao 제품 세션, Toss 성공·중복 callback, GitHub queued job EXIT 0, 디자인 픽셀 정합성, production 배포.

## 2026-11-07 15:47 KST · 로컬 세션·설정 기반 외부 항목 재개

- 로컬 정본 `browser-automation.md`, `setup-browser-cookies`, `browser-inventory.sh`, `cdp-lib.mjs`, `chrome-cookie-export.mjs`, `onprem-chrome.sh`를 대조했다. 현재 호스트는 LXC 114라 Aside와 메인 Chrome을 직접 사용할 수 없고, Tailscale의 맥북은 1시간 이상 offline이다.
- 온프렘 CDP 9333·9342·9345·9444·9445를 실제 GitHub runner group, Kakao 앱1516450, Toss API 키 URL로 확인했다. 전부 로그인 벽이고 세 서비스 저장 비밀번호는 전 프로필 0건이다.
- Chrome 9342에 Kakao QR 로그인 화면, Toss 로그인 화면, GitHub runner group 로그인 화면을 준비했다. noVNC는 `http://100.117.68.81:6342/vnc.html?autoconnect=1&resize=scale`다.
- runner `onprem-114-android`는 `android-kvm,onprem-114` 라벨로 조직 Default group에 등록되어 listener가 broker session을 유지한다. workflow 요구 라벨과 일치한다. trusted run `42324947776`은 queued다. public repository를 허용하지 않는 runner group 정책이 가장 유력한 후보지만, 현재 PAT의 runner 관리 API가 HTTP 403이라 정확한 설정값은 미확인이다.
- Supabase staging에 local `toss.env`의 test secret만 `TOSS_SECRET_KEY`로 등록했다. live 키 사용 0회. 원격 secret 이름 확인 뒤 `PAYMENTS_ENABLED=false`, `cheer-order` HTTP 503 `payments_disabled`, health HTTP 200·DB ok·sourceSha `a738543dc307d764c0244723d865a9d7dc97d899`를 관찰했다.
- 실제 Kakao callback, Toss 카드사 본인인증 뒤 success callback, GitHub runner group 설정 변경은 로그인 세션이 열린 뒤 같은 탭에서 이어간다. 기존 제품 QA 43/43 PASS와 이 외부 항목은 구분한다.

## [2026-11-07 03:14 KST] compact 마크 (auto)
- 세션 3ff961b8 · 라인 codex-access · 브랜치 session/core-20261015
- 직전 커밋: 3f61862 docs: pin final staging verification
- compact 직전 컨텍스트: 386483 토큰
- 마지막 회장 요청: 114 가 재시작됐습니다. 끊긴 위임과 작업 상태를 확인하고 목표 작업을 이어가세요.
- ⚠ 이 줄 위로 서사를 세션이 직접 보강한다(훅은 기계가 아는 사실만 적는다).

목적: 해낼게 Codex 가 온프렘 114 에서 연결·키 부족으로 멈추지 않도록 필요한 접근을 세팅하고 실측한다.

## 열린 항목
- G4-AUTH-01: 카카오 Redirect URI 등록과 실로그인. 114 크롬은 로그인 화면, 맥 메인 크롬은 [Product] haenael ge 에 요청, 회신 없음.
- G4-PAY-01·02: 토스 테스트 키 IP 정책 403. 같은 요청에 포함.
- G4-QA-01: CI. Codex 가 수동 staging E2E 를 onprem-114 runner 로 옮기는 중(1fd7d41), 실행 증거 미확보.
- 온프렘 세션 1개로 줄이기: 회장 결정 대기. 11-07 02:10 기준 해낼게 sessionId 중복은 프로세스 1개로 사라짐 관찰.

## 2026-11-07 02:13 KST
- 재개 확인: 업타임 4시간 36분이라 이번은 머신 재시작이 아니라 세션 재기동. Codex Goal 은 %53 에서 진행 중, 죽은 위임 없음(qa-verifier·code-builder 프로세스 관찰). 맥 세션에 답장 주소를 고쳐 카카오·토스 재요청.

## 2026-11-07 01:30 KST
- staging SHA `9b1e0332fffae811da446877cba05370c089c0bf` 배포 완료. health `status=ok`, `database=ok`, `sourceSha` exact 관찰.
- CI 디자인 토큰 literal 5건을 기존 토큰으로 교정해 commit/push했다. 로컬 design-token lint, 관련 unit 20/20, typecheck, build, 컴포넌트 smoke PASS.
- staging 표적 QA: PhoneConsentNotice·ShareLinkCard 2/5 실렌더 PASS. CheerPaymentButton 3/5는 `PAYMENTS_ENABLED=false` 상태의 시험 환경 보정이 두 번 실패해 미검증. 제품 결함으로 확대하지 않음. fixture 잔존 0.
- G4-QA-01 CI run `42242973230`은 unit/build의 옛 디자인 토큰 위반과 e2e 시작 전 invalid `QA_STAGING_SUPABASE_ACCESS_TOKEN`으로 FAIL. 제품 literal은 수정됐지만 GitHub secret 갱신 API는 현재 gh 권한으로 HTTP 403이라 재실행 안 함.
- 남은 항목은 Kakao Redirect URI·실로그인, Toss 테스트 키 IP 정책, GitHub Actions secret 갱신 권한뿐이다. 회장 지시대로 건너뛰고 Goal BLOCKED 유지.

## 2026-11-07 01:02 KST
- 회장 지적: 이름 규칙은 맥=[Product] X, 온프렘=온프렘 X. 중복 원인 관찰: 사업체별 rc 창구 + work 세션, work.tsv 의 --continue 로 sessionId 중복 3건(haenael-ge·romeo·haejo-danta). 이름 수정은 romeo 세션이 진행 중(harness dev-rc staged, work.tsv 00:59)이라 손대지 않음.
- 표에서 빠졌던 것: `/usr/local/bin/dev-rc` 는 아직 옛 이름, root 소유. 중복 프로세스 정리는 회장 결정 대기.

## 2026-11-06 23:35 KST
- staging a6d68a3 반영(health 관찰). c42e21c 재QA 41 PASS 2 FAIL. 초대 위치 복원 후 QA-REVERIFY-VIEWPORT-01 표적 1/1(card y=60). 표현 편차 초대 건은 회장 "너가 다 해라" 와 헌법 §4.3 로 추천안 자동 채택.
- 남음: ORDER-ATTR-01(payments_disabled), G4-PAY(토스 테스트 키 IP 정책), G4-AUTH(카카오 redirect), G4-QA-01(CI 미실행). 터널 크롬 미로그인, 맥 세션 회신 없음.
- 실수: npx vercel 만 보고 승인 대기 약 50분. PATH vercel 은 정상이었다.

## 2026-11-06 22:18 KST
- Vercel CLI 복구: 내 18:02 설치 symlink 가 wrapper 와 충돌. 재설치 후 wrapper 실파일화, 토큰(`vercel-tokens.env`)으로 whoami·project ls 관찰. 다른 세션이 띄운 `vercel login` 프로세스는 남아 있음(건드리지 않음). Codex MCP 목록에 brain 등록 관찰.

## 2026-11-06 21:46 KST
- 114 재시작 뒤 확인: Codex goal(tmux goal-haenael-ge %25) 복귀. 교차 리뷰 에이전트 g4_auth_cross_review 는 재시작으로 사망(rollout 2줄). Claude 가 5b552ce 교차 리뷰, MAJOR 0. anon RPC 401 42501 관찰.
- 막힘: Vercel CLI AUTH_DEAD(auth.json 소실, 원인 미규명). device 승인 대기 https://vercel.com/oauth/device?user_code=SSSM-DWWR . staging 은 아직 4c6b7b2. 토큰은 114 에 없음(이름 검색 0건).
- 토스 toss.env 테스트 키 114 IP 403 API_KEY_ACCESS_DENIED(관찰). staging secret 에 TOSS_SECRET_KEY 없음(이름 관찰). 카카오 KOE006 redirect 등록 대기.
- 실수: Esc 로 Goal paused 유발(Codex 가 active 복귀, 화면 관찰). live_sk 키로 없는 주문 GET 1회(HTTP 404, 부작용 없음).
- codex-pane.sh 가 재시작 뒤 NO_PANE(pane_current_command 가 bash). .goal/pane 은 %20 로 낡음. CODEX_PANE=%25 로 우회.
- 다음: 승인 뒤 Codex 가 배포, 재QA. Claude 는 회수 검증.

## 2026-11-06 22:20 KST
- 회장 지시: 카카오는 메인 크롬 세션으로 알아서, 토스 테스트 키·운영 결제 키는 필요하면 진행. 운영 결제 키는 불필요, 사용 안 함.
- 정정: Codex Goal 은 진행 중(tmux %25, codex-pane.sh 는 NO_PANE 오판, 22:17 G4-PAY 검증 워커 실행 관찰). 카카오 원인 KOE006, 등록할 URI `https://haenael-ge-v2-staging-100-b.vercel.app/auth/kakao/callback`(staging 리다이렉트에서 관찰).
- 터널 5개(9342·9333·9345·9444·9445) 모두 카카오·토스 미로그인 관찰. 맥 세션 sj-b9 에 회장 원문과 함께 URI 등록·로그인 왕복·토스 정책 요청, 회신 대기.

## 2026-11-06 19:30 KST
- 9342 복구(맥 launchd 상시 터널 com.sj.onprem-chrome-tunnel). 토큰 이름 goal-haenael-staging, 만료 2027-02-04 관찰, 발급 주체 미확인. 9342 에 카카오 로그인 탭을 띄움. CDP 스크립트는 browser.close 제거.

## 2026-11-06 19:26 KST
- `haenael-ge-qa-staging.env` 가 19:24 다른 주체에 의해 교체됨(발급 주체 미확인, 나는 발급 안 함). 스테이징 secrets·functions 200, 운영 secrets 403, 프로젝트 목록은 스테이징 1개 관찰. 추가 발급 중단.
- 9342 응답 없음, 토스 테스트 키 403, gh 정상.

## 2026-11-06 19:25 KST
- 복구 완료: 이 세션 worktree 복원, `.cwd-placeholder` 삭제, `.gitignore`·`.env.local` 되돌림, `.claude/worktrees/` 를 info/exclude 에 추가.
- gh 로그인 완료(`gh run list` 관찰). 맥 세션 sj-b9 는 PAT·운영 키·토스 설정·메인 크롬 노출을 회장 결정 없이는 안 한다고 답함.
- PAT: 범위 화면 확인(codex-114-haenael-staging, 30일, 프로젝트 1개, Project Settings·Logs 읽기, Edge Functions·Secrets 읽기쓰기). 미발급. 저장 예정 파일 `haenael-ge-staging-mgmt.env`(맥 동기화가 qa-staging.env 를 덮을 수 있어 별도 파일).
- 9342 가 18:16, 19:24 두 번 꺼짐. 내 CDP 스크립트 직후라 원인일 가능성, 미확정. 맥 재기동·원인 회신 대기.

## 2026-11-06 18:05 KST
- 회장 지시: "코덱스가 작업을 할 때 뭐 연결이 없다, 키 없다, 그래서 못했다 이런 소리 안 나오게끔 다 세팅해놔."
- 완료(관찰됨): `~/Documents/SJ_BRAIN_wiki` 심링크로 brain MCP 복구. `~/.local/bin` 에 supabase 3.0.0, vercel 설치. 저장소 루트 `.vercel` 을 프로젝트 `haenael-ge` 로 연결. Vercel·스테이징 DB·서비스 키·웹 health·push·Playwright 정상.
- 막힘(관찰됨): Supabase 스테이징 PAT(401, 403), 토스 테스트 키 IP 정책(114 공인 IP 121.138.196.20 에서 403), gh 미로그인, `haenael-ge-qa-production.env` 없음, 맥 크롬 9342·카카오 터널 없음, Docker 없음.
- 진행 중: 맥 세션 `[Product] haenael ge` 에 4건 요청(읽음 미확인). 18:19 scheduled task `trig_01RB1znaJnDX3fF6aa3x1CBy` 로 회신 확인 후 114 재시험.
- 남은 일: `wiki/ops/인프라.md` 기록, 임시 파일 `.cwd-placeholder` 삭제, Codex 재시도는 회장 지시 후.
- 주의: 이 세션 worktree 내용이 사라진 상태이고 원인 미규명. 임시 폴더로 작업 중.
## 2026-11-07 11:50 KST · G4 Goal 종결 인계

### 무엇을 어디까지 했나

- Goal API를 `complete`로 전환했다. `.goal/feature-list.json`의 모든 item은 pass 또는 external blocked, 모든 slice는 blocked terminal 상태다. 세부 증거와 다음 명령은 `session-state.v2-goal-slices.md` 2026-11-07 11:45 KST 절이 정본이다.
- `origin/main`과 canonical staging source SHA는 `a738543dc307d764c0244723d865a9d7dc97d899`로 일치한다. staging social E2E 43/43 PASS, fixture 0, 결제 비활성 복구 HTTP 503을 관찰했다.
- AUTH·PAY·QA 데모 3건을 390px Chromium으로 렌더해 console error 0, overflow 0, local missing link 0, image load PASS를 확인했다.

### 남은 이슈·블로커

- Kakao 실제 로그인·callback·제품 세션, Toss test key 접근 정책 뒤 성공·중복 callback, GitHub self-hosted social job 실제 실행은 external blocked다.
- GitHub job `128267072651`은 labels=`self-hosted`로 queued이고 runner listener는 online이다. 현재 gh token과 로컬 GitHub token 4종의 runner 관리 API는 모두 `HTTP 403 Resource not accessible by personal access token`이다. 이 출력은 관리 권한 부재 증거이지 job queue의 원인 확정 증거가 아니다. runner group의 public repository 접근은 미확인 후보로만 남긴다.

### 다음에 칠 명령

- `gh run view 42324947776 --repo 100B-Adventures/haenael-ge --json status,conclusion,jobs`
- 외부 세션·권한이 실제로 바뀐 경우에만 `session-state.v2-goal-slices.md`의 Kakao·Toss 재개 명령을 따른다. 같은 로그인폼·403 조건을 반복 실행하지 않는다.

### 검증했나

- 검증됨: staging health SHA exact, social E2E 43/43, fixture 0, 결제 비활성 503, 데모 렌더, Goal terminal JSON.
- 미검증: GitHub queue의 정확한 서버측 원인, Kakao 실제 성공, Toss 실제 성공·중복 callback, production 배포.

