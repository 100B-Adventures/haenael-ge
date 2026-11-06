# 해낼게 온프렘 114 Codex 접근 세팅

목적: 해낼게 Codex 가 온프렘 114 에서 연결·키 부족으로 멈추지 않도록 필요한 접근을 세팅하고 실측한다.

## 2026-11-06 21:46 KST
- 114 재시작 뒤 확인: Codex goal(tmux goal-haenael-ge %25) 복귀. 교차 리뷰 에이전트 g4_auth_cross_review 는 재시작으로 사망(rollout 2줄). Claude 가 5b552ce 교차 리뷰, MAJOR 0. anon RPC 401 42501 관찰.
- 막힘: Vercel CLI AUTH_DEAD(auth.json 소실, 원인 미규명). device 승인 대기 https://vercel.com/oauth/device?user_code=SSSM-DWWR . staging 은 아직 4c6b7b2. 토큰은 114 에 없음(이름 검색 0건).
- 토스 toss.env 테스트 키 114 IP 403 API_KEY_ACCESS_DENIED(관찰). staging secret 에 TOSS_SECRET_KEY 없음(이름 관찰). 카카오 KOE006 redirect 등록 대기.
- 실수: Esc 로 Goal paused 유발(Codex 가 active 복귀, 화면 관찰). live_sk 키로 없는 주문 GET 1회(HTTP 404, 부작용 없음).
- codex-pane.sh 가 재시작 뒤 NO_PANE(pane_current_command 가 bash). .goal/pane 은 %20 로 낡음. CODEX_PANE=%25 로 우회.
- 다음: 승인 뒤 Codex 가 배포, 재QA. Claude 는 회수 검증.

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
