# 세션 인계: staging Kakao OAuth 왕복 확인 (2026-11-07)

## 최신 (컨트롤러, AUTH-01 on-prem 재시도)
- 한 일: 잘못 연결된 Vercel `web` 프로젝트 alias를 정본 `haenael-ge` 프로젝트로 복구하고 staging root HTTP 200을 확인했다. 해낼게 on-prem Chrome(9342)에서 OAuth를 시작해 Kakao `QR코드 로그인` 화면까지 실제 도달했다.
- 현재 화면: `http://100.117.68.81:6342/vnc.html?autoconnect=1&resize=scale`. 회장이 QR을 스캔하면 callback과 `/my` 제품 세션을 컨트롤러가 이어서 확인한다.
- 관찰: OAuth client/redirect는 Kakao 로그인 페이지까지 정상 진입한다. on-prem 프로필에는 저장된 Kakao ID·password가 없고, MacBook main Chrome은 Tailscale offline이라 기존 세션을 가져올 수 없다.
- 안 한 것: 비밀번호 추측·복사, 운영 접근, main merge/push, 운영 배포.
- 검증했나: staging 공개 접근과 Kakao QR 로그인 도달은 관찰됨. QR 승인 뒤 callback·제품 세션은 아직 미검증.

## 무엇을 어디까지 했나
- 요청: 메인 Chrome 기존 세션으로 `https://haenael-ge-v2-staging-100-b.vercel.app/auth/kakao/start?redirect=/my` 를 열어 Kakao 동의 후 `/my` 왕복 확인.
- 진행: 연결된 Chrome 도구가 있는지 ToolSearch 로 확인했다. 결과는 Claude Docs 도구 3종뿐이었고 Chrome 브라우저 도구는 없었다.
- 브라우저 작업은 시작하지 않았다. 페이지를 열지 않았고 로그인·동의도 하지 않았다.
- 답변: `TOOL_UNAVAILABLE`

## 남은 이슈·블로커
- 블로커: Chrome 브라우저 도구가 이 세션에 연결되어 있지 않다. 왕복 확인은 미검증이다.
- 해소 조건: Chrome 도구(예: claude-in-chrome MCP)가 연결된 세션에서 같은 요청을 다시 돌린다.

## 다음에 칠 명령
- 연결 확인: ToolSearch 질의 `chrome` 또는 `claude-in-chrome`. 도구가 나오면 `start` URL 을 새 background tab 에서 연다.

## 검증했나
- Chrome 도구 부재는 ToolSearch 결과로 확인했다(관찰됨).
- staging 왕복 결과는 확인하지 않았다(미검증).
