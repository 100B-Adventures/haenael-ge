# 회귀 보고서: 해낼게 V2 2.1.2 (source ad7dce4, staging)

STAMP: 2026-11-11 14:30 KST · model: Claude Opus 5.5 · agent: qa-verifier (independent-verify 6차) · 근거: 컨트롤러 실행 원본 `.goal/runs/w12-regression-ad7dce4/report.json` 을 검증자가 직접 대조해 옮김

| 항목 | 값 |
|---|---|
| 문서 버전 | v1.0.0 |
| 대상 | `https://haenael-ge-v2-staging-100-b.vercel.app` (staging 전용 Supabase `ezzklgotgydwxqebfoys`) |
| 실행 시점 health | version 2.1.2, sourceSha `ad7dce4376cd77d5e840cd3192e138d4bed7a7e1`, 2026-11-11T04:41:09.144Z |
| 스위트 | `web/e2e/social-web-first.spec.ts`, Chromium, retries 0 (누적 전체) |
| 결과 | expected 45 · unexpected 0 · flaky 0 · skipped 0 · 459.9초 · playwright.exit 0 · run.exit 0 |
| 결제 플래그 | 실행 중 staging `PAYMENTS_ENABLED=true`, 종료 후 false 원복, `cheer-order` HTTP 503 확인(`payment-restore.http`) |
| TC 정본 | `docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.5.md` 와 qa-tracker.md 의 케이스 번호를 그대로 쓴다 |

## 보장하는 것 / 하지 않는 것

- 보장: 위 45개 누적 시나리오가 staging ad7dce4 에서 재시도 없이 통과했다. 이번 13px·누름 변경(6bed685..ad7dce4)이 이 시나리오들을 깨지 않았다.
- 보장하지 않음: 비 Chromium, 운영 환경, 실결제 성공 callback(SEC-PAY-01 accepted_unverified), 이 스위트에 없는 시나리오.

## 케이스별 판정

| # | 케이스 | 판정 | 소요(초) | 증거 |
|---|---|---|---|---|
| 1 | OPS-ALERT-01 관리자 화면이 ops_event 경보를 실제 수신한다 | 통과 | 13.3 | report.json |
| 2 | PW-02 목표 관리는 프로토타입 순서와 필드별 편집, 응원자 집계, 환전·관리 액션을 보존한다 | 통과 | 6.1 | report.json |
| 3 | AUTH-GOAL-01 비로그인 목표 관리는 권한없음 상태이고 로그아웃을 노출하지 않는다 | 통과 | 1.0 | report.json |
| 4 | MY-01 마이페이지는 프로필, 목표, 친구 수, 업적, 소속감 큐와 활성 탭을 렌더한다 | 통과 | 17.6 | report.json |
| 5 | PW-03 기존 c1 목표에서 건강 사진을 명시 선택하면 reload와 public 화면에 우선 적용된다 | 통과 | 13.6 | report.json |
| 6 | PW-04 custom upload finalize는 REVIEW 안내를 내고 기존 커버를 유지한다 | 통과 | 7.4 | report.json |
| 7 | SMOKE-01 신규 라우트 전체는 390px에서 console error와 가로 overflow가 없다 | 통과 | 24.4 | report.json |
| 8 | QA-REVERIFY-SEC-01 친구 응답은 private path를 숨기고 signed URL만 노출하며 admin 검수는 경로를 받는다 | 통과 | 7.2 | report.json |
| 9 | QA-REVERIFY-FLOW-01A 초대 생성부터 친구 공개 목표 조회까지 실제 UI와 DB가 이어진다 | 통과 | 16.4 | report.json |
| 10 | QA-REVERIFY-FLOW-01B friendId와 목표 소유자·공개 범위가 다르면 실제 HTTP 404다 | 통과 | 13.2 | report.json |
| 11 | QA-REVERIFY-FLOW-01C 비인증 친구 워드맵 요청은 HTTP 307 뒤 landing DOM으로 거부된다 | 통과 | 1.7 | report.json |
| 12 | QA-REVERIFY-VIEWPORT-01 운영 모드 신규 화면은 390px·768px·1440px에서 시안 위치와 overflow를 검증한다 | 통과 | 89.8 | report.json |
| 13 | QA-REVERIFY-INVITE-NAV-01 초대 수락 화면은 승인된 하단 탭 component를 유지한다 | 통과 | 1.3 | report.json |
| 14 | QA-REVERIFY-ADMIN-ORPHAN-01 관리자 안내문은 768px과 1440px에서 28px 미만 고아 줄바꿈이 없다 | 통과 | 6.0 | report.json |
| 15 | QA-TC-LG-01 노출 표에 없는 화면은 법적 고지 DOM이 0개다 | 통과 | 33.3 | report.json |
| 16 | QA-TC-LG-02 마이페이지를 제외한 하단탭 화면에 법적 고지 블록과 링크 나열이 0개다 | 통과 | 18.5 | report.json |
| 17 | QA-TC-LG-03 마이페이지 한 단계 아래가 사업자 정보 전문을 소유한다 | 통과 | 4.8 | report.json |
| 18 | QA-TC-GT-02 회원 전용 탭 미리보기는 서버 호출 0건이고 클라이언트 상수를 쓴다 | 통과 | 2.6 | report.json |
| 19 | QA-TC-GT-03 비회원 예시 시트는 자물쇠와 흐림 없이 두 행동을 제공한다 | 통과 | 2.4 | report.json |
| 20 | QA-TC-GT-01 비회원 초대와 공개 목표 응답은 최소 필드만 노출한다 | 통과 | 9.1 | report.json |
| 21 | QA-TC-SP-03 공개 목표의 고정 CTA 자리 예약은 토큰과 일치하고 본문을 가리지 않는다 | 통과 | 1.9 | report.json |
| 22 | QA-TC-AC-01 업적 화면에는 등급 공개 토글이 없다 | 통과 | 1.7 | report.json |
| 23 | QA-TC-CP-02-03 응원 목록은 8개에서 펼치고 9개부터 꺾쇠 하나로 왕복한다 | 통과 | 4.0 | report.json |
| 24 | QA-TC-CL-01 목표 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 통과 | 2.2 | report.json |
| 25 | QA-TC-CL-02 해낼게 관리의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 통과 | 2.5 | report.json |
| 26 | QA-TC-CL-03 친구 목록의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 통과 | 2.5 | report.json |
| 27 | QA-TC-CL-04 친구 상세의 긴 응원은 2줄에서 펼치고 다시 접힌다 | 통과 | 3.3 | report.json |
| 28 | QA-TC-CS-03-04 23명 요약은 아바타 3개와 +20이고 익명은 비활성 자리표시다 | 통과 | 2.4 | report.json |
| 29 | QA-TC-CS-03 응원 0명 목표는 요약 바 대신 빈 상태를 보인다 | 통과 | 1.8 | report.json |
| 30 | QA-TC-CP-05 정책과 ADR에 선언되지 않은 실제 접힘이 없다 | 통과 | 10.4 | report.json |
| 31 | QA-TC-CP-03 렌더된 접기 토글 전수는 텍스트 없는 꺾쇠 하나다 | 통과 | 11.7 | report.json |
| 32 | QA-TC-SP-02 카드 전수의 상하 안쪽 여백과 가장자리 margin이 대칭이다 | 통과 | 29.3 | report.json |
| 33 | QA-TC-SP-04 제품 화면 전수 표본의 가로 넘침과 28px 미만 고아 줄바꿈이 0건이다 | 통과 | 13.3 | report.json |
| 34 | QA-TC-CV-01 커버 업로드 버튼은 프리셋 스크롤 위치와 무관하게 파일 선택을 연다 | 통과 | 2.8 | report.json |
| 35 | QA-TC-CV-02 커버 선택 체크 글리프는 선택을 바꿔도 정확히 하나다 | 통과 | 7.3 | report.json |
| 36 | QA-TC-CV-06 타인 회원은 소유자 UPLOADING 자산을 확정할 수 없다 | 통과 | 1.1 | report.json |
| 37 | QA-TC-AU-05 쿠키 없는 Server Action 직접 POST는 인증 실패하고 상태를 바꾸지 않는다 | 통과 | 3.7 | report.json |
| 38 | PW-05 admin 승인 후 owner와 public 화면에 승인 커버만 보인다 | 통과 | 11.3 | report.json |
| 39 | PW-06 PUBLIC에서 FRIENDS, PRIVATE RPC 변경 시 공개 경계가 즉시 닫힌다 | 통과 | 2.5 | report.json |
| 40 | PW-07 anon 공개 route는 PUBLIC만 노출한다 | 통과 | 3.5 | report.json |
| 41 | CC-01 동일 token의 동시 accept는 성공 1, used 1, connection 1이다 | 통과 | 0.7 | report.json |
| 42 | QA-TC-FD-03 소급 친구의 방향이 보이고 해제 뒤 양쪽 FRIENDS 조회가 닫힌다 | 통과 | 5.3 | report.json |
| 43 | ORDER-ATTR-01 replay는 최초 회원 응원 귀속을 다른 사용자로 바꾸지 않는다 | 통과 | 2.4 | report.json |
| 44 | G4-FRIEND-HISTORY-01 친구 상세은 회원 이력만, 손님 응원은 마이·홈에만 표시한다 | 통과 | 16.0 | report.json |
| 45 | G4-PERF-01 주요 화면 TTFB와 Supabase RPC 시간을 cold 후보·warm 반복으로 기록한다 | 통과 | 12.0 | report.json |

## 개정 이력

| 버전 | 일자 | 내용 | 작성 |
|---|---|---|---|
| v1.0.0 | 2026-11-11 | ad7dce4 전체 회귀 45건을 케이스 단위로 기록(qa-tracker v2.1.24 의 '최종 SHA 미실행' 서술 정정 근거) | qa-verifier / Claude Opus 5.5 |
