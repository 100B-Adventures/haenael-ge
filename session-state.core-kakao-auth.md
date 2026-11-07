# core · Kakao 인증 자동화 핸드오프

## 2026-11-07 19:15 KST

### 무엇을 어디까지 했나

- 온프렘 Chrome 프로필 10개를 staging `/auth/kakao/start?redirect=/my`로 실측했다. 모두 `accounts.kakao.com/login`으로 종료했다.
- 반복 제품 QA는 staging service-role fixture로 실행하며 기존 social E2E 43/43 PASS를 유지한다. 실제 Kakao OAuth만 release 경계의 1회 검증으로 분리했다.
- 9342 QR 화면의 `로그인 상태 유지`를 켜고 QR을 새로고침했다.
- `chrome-cookie-export.mjs`에 반복 `--domain` 필터를 추가했다. Kakao 한정 export/import는 mode 600, 외부 도메인 0, 쿠키 23/23, 시험 탭 회수로 검증했다. 하네스 커밋 `16c9486`, 프로젝트 정본 커밋 `921eca9`다.

### 남은 이슈·블로커

- MacBook이 Tailscale offline이라 메인 Chrome의 현재 Kakao 세션을 export할 수 없다.
- 온프렘 10개 프로필에는 인증된 Kakao Account session이 없다. Kakao 공식 OAuth 계약상 REST API key와 Client Secret은 사용자 인증·동의를 대신할 수 없다.
- 실제 callback 뒤 `/my` 제품 세션과 Supabase 사용자 연결은 미검증이다.

### 다음에 칠 명령

- Mac 상태: `tailscale status --json | jq -r '.Peer[] | select(.HostName=="macbookpro" or (.DNSName|startswith("macbookpro."))) | [.TailscaleIPs[0],.Online,.LastSeen] | @tsv'`
- Mac export: `node ~/.claude/harness/bin/chrome-cookie-export.mjs <메인Chrome포트> /tmp/haenael-kakao.json --domain kakao.com --domain kakaocdn.net`
- 114 import: `node ~/.claude/harness/bin/chrome-cookie-export.mjs --import 9342 /tmp/haenael-kakao.json --domain kakao.com --domain kakaocdn.net`
- OAuth 재검증: `node ~/.claude/harness/bin/cdp-lib.mjs visit 9342 'https://haenael-ge-v2-staging-100-b.vercel.app/auth/kakao/start?redirect=/my' 10000`

### 검증했나

- 테스트됨: 10개 프로필 OAuth 실측, Kakao 도메인 한정 export/import 23/23, 외부 도메인 0, mode 600, QR 로그인 유지 checked, social E2E 43/43.
- 미검증: Mac 세션 이관, 실제 Kakao callback·제품 세션, production 배포.

