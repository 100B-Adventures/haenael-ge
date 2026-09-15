# 해낼게 운영 인증 읽기 전용 E2E 설계

## 1. 결론

운영 자동검증은 두 층으로 나눈다.

1. 공개 층은 기존 `qa:verify-production`으로 홈, 약관 10%, 환전 화면 생존을 확인한다.
2. 인증 층은 제품 테이블에 행이 없는 `auth-only` QA 계정으로 실제 Supabase 세션을 발급받아 운영 `/cashout`을 연다. 환전 신청은 누르지 않고 `cashout_request` 전후 스냅샷이 같은지 확인한다.

환전 신청 접수와 알림톡 실수신은 이 경로로 PASS 처리하지 않는다. 두 항목은 쓰기와 외부 수신함 관찰이 필요하므로 현재 자동화 범위에서는 **미검증**이다.

## 2. 기존 구현 확인

| 확인 대상 | 이미 있던 것 | 이번 변경 |
|---|---|---|
| 공개 운영검증 | `scripts/qa/verify-production.mjs`가 비로그인 3건 실행 | 그대로 보존 |
| 로컬 인증 E2E | `cashout-manual.spec.ts`가 가짜 JWT와 로컬 계약 서버 사용 | 수정하지 않음 |
| 운영 세션 | 자동 획득 경로 없음 | 전용 계정의 Supabase password 인증과 SSR 쿠키 획득 추가 |
| 운영 데이터 보호 | 공개 스크립트가 쓰기 없음 | auth-only 강제, 제품행 부재 강제, 환전 전후 스냅샷 동일 강제 |
| 자동 실행 | 일반 CI만 존재 | 운영 전용 수동·일일 GitHub Actions workflow 추가 |

`docs/구현현황.md`는 저장소에 없다. 구현 범위는 `docs/qa/qa-tracker.md`, `docs/qa/test-plan.md`, 승인 FDD, 실제 import와 호출 경로로 복원했다.

## 3. 검증 경계

| 테스트 | 실행 | 판정 근거 | 운영 쓰기 |
|---|---|---|---|
| 홈·약관·환전 공개 화면 | HTTP fetch | 상태, 현행 10% 문구, 응답 본문 | 없음 |
| Supabase 운영 로그인 | password grant | 실제 user id, `purpose=production-readonly-e2e` 메타데이터 | `auth.users.last_sign_in_at`만 갱신될 수 있음 |
| Next.js 운영 세션 인식 | `/cashout` 실제 브라우저 | redirect 없음, `cashout-page`와 최소액 미달 상태 렌더 | 없음 |
| 제품 데이터 불변 | RLS 사용자 조회 | `member` 행 0, `cashout_request` 전후 JSON 동일 | 없음 |
| 환전 신청 접수 | 실행하지 않음 | 미검증 | 실행 시 운영 신청 노이즈 발생 |
| 환전 신청 알림톡 도착 | 실행하지 않음 | 미검증 | 신청, 알림 행, 외부 메시지 발생 |

### PASS로 말할 수 없는 것

- 운영 `create_cashout_request`의 실제 INSERT와 상태 전이는 검증하지 않는다.
- `notify` 호출, Solapi 전송 성공, 카카오 수신함 도착을 검증하지 않는다.
- auth-only 계정은 제품 `member` 행이 없으므로 실회원의 기존 잔액·전화번호·환전 이력 렌더를 대표하지 않는다.
- GitHub workflow는 저장소 변경이 커밋·푸시되고 환경 secrets가 등록되기 전에는 활성 자동화가 아니다.

## 4. 계정과 자격증명

### 계정 계약

- 운영 Supabase Auth에 계정은 1개만 둔다.
- `user_metadata.purpose`는 `production-readonly-e2e`로 고정한다.
- 제품 `member`, `goal`, `cashout_request`, `notification` 행은 만들지 않는다.
- 테스트는 예상 user id와 목적 메타데이터가 하나라도 다르면 즉시 실패한다. 실사용자 계정 오사용을 막는 장치다.

### 로컬 저장

- 정본 위치: `~/.sj-agent-harness/secrets/haenael-ge-qa-production.env`
- 디렉터리 권한: `700`, 파일 권한: `600`
- 값 이름: `QA_PRODUCTION_SUPABASE_URL`, `QA_PRODUCTION_SUPABASE_ANON_KEY`, `QA_PRODUCTION_EMAIL`, `QA_PRODUCTION_PASSWORD`, `QA_PRODUCTION_EXPECTED_USER_ID`
- 실행 시 `~/.claude/harness/bin/with-local-secret-env.sh`로 환경에만 주입한다.
- Playwright storage state 파일은 만들지 않는다. 세션 쿠키는 프로세스 메모리와 격리 브라우저 컨텍스트에만 존재하고 종료 시 폐기한다.

### GitHub Actions

- GitHub Environment `production-readonly-qa`에 같은 이름의 secret 5개를 둔다.
- workflow는 `pull_request`에서 실행하지 않는다. 수동 실행과 main에 존재하는 일일 schedule만 허용한다.
- job 권한은 `contents: read`만 준다.
- Playwright trace와 video를 끈다. 인증 쿠키가 들어간 storage state와 trace를 artifact로 올리지 않는다.
- Vercel과 Supabase 런타임 secret에는 QA 비밀번호를 넣지 않는다. 앱 실행에 필요 없는 자격증명이다.

## 5. 실행 흐름

```text
GitHub schedule 또는 로컬 wrapper
  -> 공개 운영 3건
  -> Supabase password 인증
  -> SDK가 만든 SSR 쿠키를 메모리에서 Playwright context로 전달
  -> 운영 /cashout GET
  -> 인증 화면 marker와 HTTP 200 관찰
  -> cashout_request 전후 스냅샷 비교
  -> context 종료, 로컬 세션 폐기
```

인증 쿠키 포맷을 손으로 재구현하지 않는다. 저장소에 설치된 `@supabase/ssr`의 `createBrowserClient`가 실제 cookie encoding과 chunking을 수행하게 했다. 패키지 변경 시 쿠키 내부 포맷을 복제한 테스트가 조용히 깨지는 위험을 피한다.

## 6. 요청 추적

| 요청번호 | 요청 요지 | 테스트번호 | 현재 판정 | 증거 |
|---|---|---|---|---|
| QA-PROD-AUTH-01 | 로그인 필요 운영 경로 | QA-PROD-AUTH-01 | ✅ PASS | 운영 password 인증 후 `/cashout` 실제 렌더, Playwright 1/1 |
| QA-PROD-AUTH-02 | 운영 데이터 무오염 | QA-PROD-AUTH-02 | ✅ PASS | 실행 후 member·goal·cashout_request·notification 각 0행 |
| QA-PROD-AUTH-03 | 자격증명 보관 | QA-PROD-AUTH-03 | ✅ PASS | 로컬 secret·기존 `.env.local` 600, 값 원문 출력 0건 |
| QA-PROD-AUTH-04 | 구현과 실제 실행 | QA-PROD-PUBLIC-01 | ✅ PASS | 운영 홈·약관·환전 공개 검사 3/3 |
| QA-PROD-AUTH-05 | 못 하는 범위 명시 | QA-PROD-WRITE-01 | 미검증 | 신청 접수·알림톡 실수신은 자동 PASS 금지 |
| QA-PROD-AUTH-06 | 일일 자동 실행 | QA-PROD-SCHEDULE-01 | 🔧 구현됨 | workflow 파일은 있으나 미커밋·미푸시라 GitHub 실행은 미검증 |

## 7. 2026-08-28 실행 관찰

| 검증 | 결과 | 직접 관찰 |
|---|---|---|
| 운영 공개 경로 | ✅ PASS | 홈 200, 약관 10% 10곳·5% 0곳, 환전 200·22,341바이트 |
| 운영 인증 읽기 E2E | ✅ PASS | 실제 Supabase 로그인, 최종 운영 `/cashout`, `cashout-page`, 1/1 통과 |
| 운영 제품 데이터 불변 | ✅ PASS | 사후 service-role 조회에서 member·goal·cashout_request·notification 각 0행 |
| 인증 화면 증거 | ✅ PASS | `web/test-results/.../production-auth-cashout.png` 113,713바이트 |
| 웹 단위 회귀 | ✅ PASS | Vitest 41파일, 269건 |
| 환전 브라우저 회귀 | ✅ PASS | 깨끗한 E2E 번들로 Playwright 12/12 |
| QA 계약·변이 | ✅ PASS | env 34/34, cashout 30/30, RAISE 13/13, notify 8/8, mutation 8/8 |
| Next production build | ✅ PASS | TypeScript와 16개 정적 페이지 생성 통과 |
| 로컬 DB seed·pgTAP | ❌ NG | local Supabase DB가 `Created` 상태에서 backup restore 시작 중 멈춤. 3회 재현 후 중단 |
| 디자인 lint | ❌ NG | inline style, 토큰 밖 hex 두 범주 경고 |
| 모바일·Maestro | 해당 없음 | 이 저장소에 모바일 앱과 Maestro 경로가 없음 |
| 환전 신청·알림톡 실수신 | ⬜ 미검증 | 운영 제품 쓰기 금지 경계를 유지 |

첫 인증 E2E는 `haenaelge.vercel.app`이 `haenael-ge.vercel.app`으로 redirect되면서 host-only 쿠키가 전달되지 않아 실패했다. 양쪽 허용 origin에 같은 SDK 생성 쿠키를 넣고 최종 origin을 별도로 검증해 해결했다.

로컬 DB 회귀는 세 번 이상 같은 조건에서 실패했다. 관찰된 구조적 원인은 `supabase_db_haenael-ge` 컨테이너가 실행되지 않은 `Created` 상태인데 CLI는 이미 실행 중이라고 판단한 뒤, `stop --backup` 이후에도 `Starting database from backup...`에서 진전하지 않는 불완전한 로컬 상태다. 볼륨 손상 여부는 확인되지 않았으며, 데이터 삭제가 필요한 강제 초기화는 이번 범위에서 하지 않았다.

## 8. 벤치마크 적용

- Playwright 공식 Auth 가이드: 인증 상태 파일은 계정 사칭이 가능한 민감 자산이므로 저장소에 넣지 말라는 경고를 적용했다. 이 구현은 상태 파일 자체를 만들지 않는다. <https://playwright.dev/docs/auth>
- Playwright 공식 API testing 가이드: API로 인증한 상태를 BrowserContext에 넘기는 구조를 차용했다. <https://playwright.dev/docs/api-testing>
- Supabase 공식 SSR 가이드: Next.js 서버가 읽을 세션은 쿠키에 두고 `@supabase/ssr`가 저장·회전을 맡기는 구조를 그대로 썼다. <https://supabase.com/docs/guides/auth/choosing-a-server-package>
- GitHub 공식 Secrets 문서: QA 자격증명은 Environment secret으로 제한하고 workflow에서 명시적으로만 주입한다. <https://docs.github.com/en/actions/concepts/security/secrets>

## 9. 레드팀과 셀프심문

레드팀 공격: "읽기 전용이라고 써놔도 누군가 실사용자 이메일을 secret에 넣으면 개인정보를 읽는다." 대응: 예상 user id와 `purpose` 메타데이터를 둘 다 강제하고, 제품 `member` 행이 있으면 테스트를 실패시킨다.

셀프심문: "이 결론이 틀렸다면 가장 그럴듯한 이유는?" auth-only 계정이 실회원 cashout 화면을 대표하지 못한다는 점이다. 그래서 이 테스트의 완료 주장을 세션과 보호화면 생존으로 제한했고, 신청 접수와 알림톡은 미검증으로 남겼다. 실제 신청 자동화가 필요하면 운영 스키마에 `is_test` 격리축과 원자적 cleanup 계약을 먼저 설계해야 한다. 이는 DB 스키마 결정이므로 이번 QA 작업에서 임의 구현하지 않는다.

---

🏷 STAMP | line: core | 생성: 2026-08-28 KST | model: gpt-5.6-sol | agent: qa-verifier
skills: qa | 근거: Playwright·Supabase·GitHub 공식문서, 승인 FDD v1.0.0, api-contract, architecture, qa-tracker
고민: 운영 신청 자동화보다 auth-only 읽기 경계를 채택. 실사용 데이터 무오염을 완료 범위보다 우선함

SKILLS_USED: qa (운영 브라우저 검증·증거 경계·회귀 설계)
SKILLS_SKIPPED: 없음

SOURCES: https://playwright.dev/docs/auth · https://playwright.dev/docs/api-testing · https://supabase.com/docs/guides/auth/choosing-a-server-package · https://docs.github.com/en/actions/concepts/security/secrets · docs/eng-design/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md · docs/eng-design/api-contract.md · docs/eng-design/architecture.md · docs/qa/test-plan.md · docs/qa/qa-tracker.md
MODEL: gpt-codex/gpt-5.6-sol
