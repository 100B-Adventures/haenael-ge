---
title: haenael-ge 코드베이스·위키 감사 보고서
version: 1.0.0
created: 2026-09-05 17:12 KST
model: codex
agent: code-reviewer
status: complete
skills:
  - review
---

# haenael-ge 코드베이스·위키 감사 보고서

> STAMP: 2026-09-05 17:12 KST | model: codex | agent: code-reviewer | skill: review | 근거: 승인 산출물·배포 코드·운영 API 직접 대조 | 고민: 기존 세션의 작업 트리를 변경하지 않고 코드 증거만으로 실제 위험을 분리한다.

## 읽은 것 / 안 읽은 것

- 읽음: `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `README.md`, `pipeline-state.core.md`, 승인 핀 `docs/plan/prd-haenael-ge-v0.4.0.md`, `DESIGN.md`, `docs/design/user-flow.md`, 환전 프로토타입 2종, 수치 스펙, burst BRIEF와 INPUTS-MANIFEST, 요청 원장, 코드·QA·시크릿 표준, `web/src` 134개 파일, Supabase 마이그레이션·Edge Function, `wiki/**/*.md` 53개.
- 100KB 초과 입력: `docs/design/prototypes/legacy/core-cashout-full-journey-v3.8-opus5.html`은 지시대로 처음 200줄만 읽음.
- 안 읽음: 레포 루트 `CLAUDE.md`는 파일이 없어 읽을 수 없었음. `docs/**/requests-*.md` 패턴 파일도 없음. 대신 실제 요청 정본인 `docs/_archive/requests/inbox/chairman-2026-09.md`, `wiki/거버넌스/요청.md`, burst `REQUEST-PROVENANCE.md`를 읽음.
- 범위 제한: 운영 인증 계정이 필요한 화면의 내용은 기존 무인증 캡처만으로 정상 판정하지 않음. 운영 DB는 스키마 덤프나 데이터 조회 없이 마이그레이션 이력 일치만 읽기 전용으로 확인함.

## 요약

등급은 P0/P1을 MAJOR, P2/P3을 MINOR로 매핑한다. 표 기준 집계는 P0 1건, P1 16건이며, 축간 중복을 합친 고유 P1 원인은 14건이다. 가장 큰 결함은 세무 자문 전 환전을 회장 계정에만 제한하라는 D-017과 달리 전역 스위치 하나로 모든 인증 사용자의 신청이 열리는 점이다. 승인 PRD v0.4.0의 공개범위·다중 목표·응원자 경험은 구현되지 않았는데 파이프라인은 `done`이고, 돈 화면 조회 실패는 정상 0원 또는 신청 없음으로 위장된다. 보안의 기존 핵심 경계인 RLS, service role 서버 격리, 환전 계좌 암호화, 보호 API 무인증 401은 확인됐다.

## 2026-10-22 core build 재검증 레지스트리

번호는 이 보고서의 P0/P1 행을 위에서 아래로 센 고정 ID다. `구현 변경`은 이번 작업에서 코드를 바꿨는지이며, `아니오`는 이미 후속 구현이 존재해 현재 코드를 실측한 경우다. 운영 Supabase 쓰기와 운영 배포는 실행하지 않았다.

| ID | 우선순위 | 상태 | 구현 변경 | 종료 증거 |
|---|---|---|---|---|
| P0-01 | P0 | 닫힘 | 예 | 서버 기본 거부 allowlist `web/src/lib/supabase/service.ts`, Server Action 재검사 `web/src/app/(receiver)/cashout/actions.ts`, 읽기 상태 보존·신청만 차단 `web/src/app/(receiver)/cashout/page.tsx`. 허용·일반·빈 목록·preview 단위 테스트와 실제 환전 E2E 13/13 통과. |
| P1-01 | P1 | 닫힘 | 아니오 | `20260921000000_multi_goal_create_fn.sql:35,41,86`이 단일 목표 인덱스 제거, 계정 잠금, 진행 중 3개 상한을 구현. `create_goal.test.sql`과 로컬 pgTAP 전체 369/369 통과. |
| P1-02 | P1 | **회수 필요** | 아니오 | 목표 `visibility`와 공개 view는 `20261013050000_social_viral_loop_web_first.sql:72-77,456-484`에 있으나 승인 PRD의 `supporter_name_visibility`·`message_visibility`는 없고 `cheer_public`은 공개 목표의 이름·메시지를 계속 반환한다(`:464-467`). 정책·스키마 선택 없이는 닫을 수 없다. |
| P1-03 | P1 | 닫힘 | 아니오 | `onboarding/page.tsx:22-24`가 기존 목표 리다이렉트를 제거했고 `OnboardingGoalForm.tsx:83-105`가 `create_goal`을 사용한다. |
| P1-04 | P1 | **회수 필요** | 아니오 | 최신 V2는 응원 귀속·친구·마이 화면을 구현했지만 `thanks_message` 1회 채널은 없다. `eng-design-goal-visibility-supporter-v1.0.0-claude-opus.md` §6은 응원자 연결 정책과 D-017 결론 전 착수 금지이며 pipeline 핀도 `pending-review`다. |
| P1-05 | P1 | 닫힘 | 예 | `web/src/app/child-safety/page.tsx`에 적용 범위, 금지 행위, 신고 이메일, 대응, 112·1388·1377, 시행일과 법률 검토 경계를 구현. 정적 계약 테스트 및 실제 Next 렌더 HTTP 200. |
| P1-06 | P1 | 닫힘 | 아니오 | `Wordmap.tsx:75-94`가 정규화된 단어 전체를 렌더한다. `Wordmap.test.tsx` 13건 통과. |
| P1-07 | P1 | 닫힘 | 아니오 | `GoalCard.tsx:127-137` 제목 2줄 clamp, `ClampText.tsx:36-52` 이유 펼침과 `Collapsible`의 `aria-expanded` 계약. 관련 19건 통과. |
| P1-08 | P1 | 닫힘 | 아니오 | `get_wordmap`이 `goal.visibility='PUBLIC' OR owner`를 함수 내부에서 검사(`20261013050000...sql:473-484`). 공개범위 pgTAP 포함 DB 전체 통과. |
| P1-09 | P1 | 닫힘 | 아니오 | P1-01과 같은 데이터 안전 중복 지적. 원자 상한 함수와 동시성 테스트가 현재 계약이다. |
| P1-10 | P1 | 닫힘 | 예 | `/cashout` 네 조회 중 하나라도 실패하면 전용 오류 상태를 렌더하고 금액을 추정하지 않는다. 네 의존성 오류 주입 테스트 4건 추가. |
| P1-11 | P1 | 닫힘 | 아니오 | `/cashout/status`가 `statusError`를 빈 상태보다 먼저 분기한다(`status/page.tsx:74-93`). 오류 주입 테스트 추가. |
| P1-12 | P1 | 닫힘 | 예 | `/cashout/history`가 RPC 오류와 성공 0건을 분리한다(`history/page.tsx:63-78`). 오류 주입 테스트 추가. |
| P1-13 | P1 | 닫힘 | 아니오 | 다중 목표 `create_goal.test.sql`, visibility `social_web_first_schema/rls.test.sql`, 현재 응원 귀속·마이 화면 테스트가 로컬 DB 369/369와 웹 전체 회귀에 포함된다. P1-04의 미승인 감사 채널은 별도 회수로 분리한다. |
| P1-14 | P1 | 닫힘 | 예 | eligibility·status·history·member 각 실패, status RPC 실패, history RPC 실패를 별도 테스트로 고정하고 숫자·빈 상태 비노출을 단언했다. |
| P1-15 | P1 | 닫힘 | 아니오 | `pipeline-state.core.md:8-9,75-77`은 build 재오픈, QA·ship 잠금 상태다. `done` 주장은 제거된 상태다. |
| P1-16 | P1 | 닫힘 | 예 | `privacy/page.tsx:199-206`에서 운영 실발송 이력과 충돌한 카카오·솔라피 `비활성` 문구를 제거하고 처리 목적과 실패 시 인앱 폴백을 명시. 정적 계약 및 HTTP 200 렌더 확인. |

재검증 결과는 **17건 중 15건 닫힘, 2건 회수 필요**다. P1-02와 P1-04를 닫았다고 쓰면 승인되지 않은 공개범위·응원자 DB 스키마를 워커가 독단 확정하는 것이므로 완료로 승격하지 않는다.

## 1. 승인 산출물 대비 이탈

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P1 MAJOR | `supabase/migrations/20260720030000_dedup_goal_and_clover_backfill.sql:60` | [승인 시안 이탈] `goal_one_active_per_member`를 다시 만드는 DB 제약이 남아 활성 목표 2개를 구조적으로 거부한다. | PRD `:196`은 "유니크 인덱스 DROP. 1계정 N개 활성 목표 허용", `:254`는 "활성 목표 2개 생성 실패하면 FAIL"이다. 앱도 `OnboardingGoalForm.tsx:86-95`, `/me/page.tsx:62-72`에서 한 개만 가정한다. | 상류 합의대로 인덱스를 제거하고 계정당 활성 3개 상한을 트리거·RPC로 원자 보장한 뒤 홈을 목표 목록으로 바꾸고 2개 성공·4번째 거부를 pgTAP/E2E로 고정한다. | L |
| P1 MAJOR | `supabase/migrations/20260705163137_init_schema.sql:75` | [승인 시안 이탈][보안] `goal.visibility`, `supporter_name_visibility`, `message_visibility`가 없고 공개 뷰 `:327-329`와 SECURITY DEFINER 워드맵 `:338-356`은 공개범위 검사를 전혀 하지 않는다. | PRD `:124-135`는 visibility enum·뷰 필터·SECURITY DEFINER 내부 검사를 요구하고, `:165-186`은 이름·메시지 공개 설정과 SEC-6a/6c를 요구한다. | enum·컬럼·소유자 변경 경로를 만들고 `goal_public`, `cheer_public`, `get_wordmap`, 캐시 무효화를 같은 마이그레이션에서 닫은 뒤 3x3 공개 조합 pgTAP을 추가한다. | L |
| P1 MAJOR | `web/src/app/(receiver)/onboarding/page.tsx:22` | [승인 시안 이탈] 목표가 하나라도 있으면 `/me`로 돌려 새 목표 작성 진입을 막는다. | PRD `:232`는 지난 목표 접힘, `:255`는 활성 목표 2개를 홈에 모두 표시하라고 한다. | 기존 목표 보유 여부 리다이렉트를 제거하고 상한 도달 때만 명시 상태를 보여준다. | M |
| P1 MAJOR | `web/src/app/g/[slug]/page.tsx:199` | [승인 시안 이탈] 공개 최근 응원자 목록은 주석만 있고 실제 부품이 없다. 응원자 식별, 응원자 마이페이지, 목표 주인의 감사 메시지 흐름도 스키마부터 없다. | PRD `:172`, `:278-301`, `:391`은 `cheer_public` 연결, `supporter_member_id`, 응원자 My Page와 `thanks_message`를 요구한다. | 응원자 연결 정책을 먼저 확정한 뒤 스키마·RLS·공개 목록·응원자 My Page·감사 메시지를 수직 슬라이스로 구현한다. | L |
| P1 MAJOR | `web/src/app/child-safety/page.tsx:4` | [승인 시안 이탈][기능 누락] 법정 고지 화면의 본문이 "내용 준비 중입니다" 한 줄뿐이다. 기존 390 캡처에서도 동일하게 관찰됐다. | PRD `:509`는 미성년 지급·법정대리인 동의가 미해소 법률 위험이라고 명시한다. 빈 정책 페이지는 위험을 고지하거나 신고·보호 절차를 제공하지 못한다. | 법률 검토 전 확정 표현을 피하되 적용 범위, 신고 채널, 대응 절차, 연락처, 개정일을 갖춘 실제 정책으로 교체하고 법률 검토 상태를 표시한다. | M |
| P1 MAJOR | `web/src/components/goal/Wordmap.tsx:113` | [승인 시안 이탈][기능 누락] 13번째 이후 단어를 무조건 잘라내며 초과 안내나 전체 회수 경로가 없다. | DESIGN `:522`, `:727`은 "13번째부터 표시 안 함" 상태에 안내·회수 경로가 없음을 명시한 미해결 계약이다. | 초과 개수를 알리고 접근 가능한 전체 목록 또는 페이지네이션 경로를 제공한다. | S |
| P1 MAJOR | `web/src/components/goal/GoalCard.tsx:100` | [승인 시안 이탈][기능 누락] 목표 제목 2줄 clamp와 이유 3줄 clamp·더 보기 상태가 구현되지 않았다. | DESIGN `:518`, `:727`은 이유 3줄과 펼침, 목표 제목 2줄을 필수 잔여로 적는다. | 제목 clamp, 이유 펼침 버튼, `aria-expanded`·포커스 상태를 추가하고 장문 390폭 픽스처로 검증한다. | S |
| P2 MINOR | `web/src/app/(receiver)/cashout/history/page.tsx:24` | [승인 시안 이탈] 전용 환전 내역 화면이 100행을 한 번에 받아 페이지네이션 없이 모두 렌더한다. | DESIGN `:524`는 "20행, 페이지네이션"이다. | 커서 기반 20행 페이지네이션과 총계 전용 집계를 분리한다. | M |

## 2. 보안

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P1 MAJOR | `supabase/migrations/20260705163137_init_schema.sql:338` | [보안] SECURITY DEFINER `get_wordmap`이 목표 공개범위를 검사하지 않는다. 현재는 설정 UI 자체가 없어 모두 공개지만, 승인된 PRIVATE 기능을 붙이는 순간 goal id만 알면 비공개 메시지 파생물이 노출된다. | PRD `:135`가 동일 위험을 "High 회귀 위험"으로 지정하고 내부 검사·pgTAP을 요구한다. Supabase RLS 문서는 SECURITY DEFINER와 service role이 RLS를 우회하므로 함수 내부 권한 검사를 요구한다. | 공개범위 스키마와 동시에 함수 내부에서 목표·메시지 visibility를 검사하고 PRIVATE/FRIENDS anon 0행을 pgTAP으로 잠근다. | M |
| P2 MINOR | `supabase/functions/report/index.ts:130` | [보안] 공개 anon 신고가 가능한데 호출 빈도 제한, 중복 제한, IP 해시 방어가 없다. 공개 anon key만 있으면 유효 대상에 신고를 반복 삽입하고 Slack 경보를 계속 발생시킬 수 있다. | 같은 저장소 `lead-capture/index.ts:34-40,80-87`은 IP HMAC과 DB rate limit을 이미 사용한다. OWASP ASVS의 악용·자동화 방어 원칙과 불일치한다. | lead-capture 패턴을 재사용해 비식별 IP 해시, 대상·시간창 중복 제한, 429, Slack 집계 알림을 둔다. | M |
| P2 MINOR | `supabase/functions/auth-kakao/index.ts:284` | [보안] 예상 밖 DB/Auth 예외의 원문 `message`를 500 응답으로 그대로 반환해 내부 테이블·provider 오류가 클라이언트에 노출될 수 있다. | Next.js 인증 가이드는 민감한 오류 세부를 클라이언트에 노출하지 말고 일반화하라고 한다. | 응답은 고정 코드와 일반 문구로 제한하고 원문은 구조화 로그에만 남긴다. | S |
| P2 MINOR | `web/src/app/auth/kakao/callback/route.ts:57` | [보안][관측] OAuth 공급자가 돌려준 `error_description`을 줄바꿈 정규화 없이 보간 로그로 남긴다. 로그 위조·검색 오염 가능성이 있다. 같은 패턴은 `auth/callback/route.ts:33`에도 있다. | OWASP ASVS 로깅 검증 원칙은 신뢰하지 않는 입력의 로그 주입 방지를 요구한다. | 허용 문자·길이로 정규화하고 구조화 필드로 기록한다. | S |
| P3 MINOR | `supabase/config.toml:73` | [보안] 로컬 DB 네트워크 기본값이 IPv4·IPv6 전체 허용이고 SSL 강제가 꺼져 있다. 로컬 기본이지만 공유 개발 호스트에서 그대로 기동하면 불필요한 노출면이 된다. | 시크릿 표준은 최소 권한과 로컬 보안 동등성을 요구한다. | 로컬 바인딩을 loopback으로 좁히거나 실행 래퍼에서 명시하고 공유 환경은 SSL을 강제한다. | S |

## 3. 데이터 안전

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P1 MAJOR | `supabase/migrations/20260720030000_dedup_goal_and_clover_backfill.sql:62` | [데이터 안전][회귀 위험] 승인된 다중 목표와 반대인 유니크 인덱스가 운영에도 적용돼 있다. 앱만 먼저 다중 목표로 바꾸면 두 번째 insert가 23505로 실패한다. | 원격 migration list 42건이 로컬과 전부 일치했고 이 마이그레이션도 적용됨. PRD `:196`은 DROP을 요구한다. | DB 제약·앱·RLS·테스트를 한 릴리스로 전환하고 하위 호환 기간을 두지 않는다. | M |
| P2 MINOR | `supabase/migrations/20260705163137_init_schema.sql:378` | [데이터 안전][성능] 환전 이력 RPC는 `member_id` 필터 뒤 `requested_at DESC, id DESC` 정렬하지만 인덱스는 `member_id` 단일뿐이다. 이력 증가 시 사용자별 정렬이 별도 sort로 남는다. | 실제 쿼리는 `20260802010000_cashout_security_hardening.sql:681-684`이다. | `(member_id, requested_at DESC, id DESC)` 복합 인덱스를 실행계획과 함께 추가한다. | S |
| P2 MINOR | `supabase/migrations/20260705163137_init_schema.sql:381` | [데이터 안전][성능] 알림 조회는 본인 최신 20건 정렬인데 인덱스는 `member_id`와 unread partial만 있고 `created_at`이 없다. | `NotificationBadge.tsx:32-36`은 `ORDER BY created_at DESC LIMIT 20`이다. | `(member_id, created_at DESC)` 인덱스를 추가하고 EXPLAIN으로 확인한다. | S |
| P2 MINOR | `supabase/functions/auth-kakao/index.ts:217` | [데이터 안전] 이메일 충돌 복구가 Auth 사용자 첫 1000명만 읽어 선형 탐색한다. 1001번째 이후 기존 사용자는 찾지 못해 일관성 복구가 실패한다. | 코드는 `perPage: 1000` 한 번만 호출하고 다음 페이지를 조회하지 않는다. | Admin API의 정확 조회 수단 또는 페이지 반복을 쓰고 1001번째 픽스처를 추가한다. | S |

### 1차 중간 저장 판정

- 축 1 승인 산출물 대비 이탈: 지적 8건, P1 7건·P2 1건.
- 축 2 보안: 지적 5건, P1 1건·P2 3건·P3 1건. 기존 RLS·service role 서버 격리·보호 API 401은 문제없음.
- 축 3 데이터 안전: 지적 4건, P1 1건·P2 3건. 원격 migration 42/42 정렬은 문제없음.

## 4. 오류 처리·관측

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P1 MAJOR | `web/src/app/(receiver)/cashout/page.tsx:16` | [오류 처리][회귀 위험] 네 조회의 `error`를 모두 버리고 실패를 잔액 0, 신청 없음, 이력 없음, 전화번호 없음으로 바꾼다. 사용자는 실제 잔액이 있어도 환전 불가로 보게 된다. | DESIGN `:249`, `:629`는 읽혀야 하는 돈 상태를 숨기지 말라고 하고, `/me/page.tsx:94-97`은 같은 문제를 이미 `balanceLoadFailed`로 처리한다. | 네 결과의 오류를 분리해 돈 데이터 하나라도 실패하면 전용 오류 상태와 재시도를 렌더하고, 부분 성공으로 금액을 추정하지 않는다. | S |
| P1 MAJOR | `web/src/app/(receiver)/cashout/status/page.tsx:55` | [오류 처리][회귀 위험] `my_cashout_status` 오류를 구조분해에서 버린 뒤 `!cashout`이면 "아직 환전 신청이 없어요"를 렌더한다. 처리 중 신청이 조회 장애로 사라져 보일 수 있다. | DESIGN의 상태 가시성 계약과 코드 자체 `:66-68`의 잔액 오류 처리 원칙에 어긋난다. | `statusError`를 받아 빈 상태와 실패 상태를 분리하고 오류 경계·재시도 테스트를 추가한다. | S |
| P1 MAJOR | `web/src/app/(receiver)/cashout/history/page.tsx:24` | [오류 처리] 이력 RPC 오류를 버려 "아직 환전 내역이 없어요"로 표시한다. 돈의 처리 이력을 잃어버린 것처럼 보이게 하는 거짓 빈 상태다. | DESIGN `:565`는 총량 감소 이유와 환전 내역 회수 경로를 필수로 둔다. | 오류를 명시 상태로 렌더하고 빈 배열은 성공 응답 0건일 때만 허용한다. | S |
| P2 MINOR | `web/src/app/(receiver)/me/page.tsx:105` | [오류 처리] 환전 상태, 응원 목록, 검색 두 쿼리, 워드맵 RPC 오류를 버린다. 각각 진행 배너·응원·워드맵을 조용히 숨긴다. | 같은 파일 `:94-97`은 "침묵 금지"를 이미 인지하고 잔액만 예외 처리한다. | 공통 Result 판독기로 오류를 분류하고 섹션별 오류 또는 페이지 오류로 올린다. | M |
| P2 MINOR | `web/src/components/common/NotificationBadge.tsx:49` | [오류 처리] 읽음 업데이트 결과를 확인하지 않고 즉시 로컬 전부 읽음으로 바꾼다. DB 실패 뒤 새 알림 숫자가 사라졌다가 재접속 때 되살아난다. 개별 클릭 `:84-89`도 같다. | UI 상태는 서버 성공 뒤 확정해야 한다는 일반 데이터 정합 계약과 어긋난다. | 성공 뒤 갱신하거나 낙관 갱신 롤백·toast를 구현한다. | S |
| P2 MINOR | `web/src/app/auth/kakao/callback/route.ts:83` | [오류 처리][관측] 내부 EF 호출에 timeout이 없다. Kakao·Toss·Solapi fetch도 같은 구조라 외부 장애 시 요청이 런타임 한도까지 붙잡힐 수 있다. | 운영 의존 호출은 유한 timeout, 실패 코드, 재시도 여부가 있어야 한다. | `AbortSignal.timeout` 기반 공급자별 timeout을 두고 timeout code·latency·request id를 구조화 로그에 남긴다. | M |
| P3 MINOR | `web/src/components/common/NotificationBadge.tsx:32` | [관측] 알림 조회 실패는 로그·사용자 상태·메트릭 없이 loading만 종료한다. 0건과 장애가 관측상 구분되지 않는다. | OWASP ASVS 로깅 기준은 보안·운영 실패의 원인과 결과를 식별 가능하게 남기도록 한다. | 민감정보 없는 오류 코드와 상관 id를 기록하고 배지에 재시도 가능한 실패 상태를 둔다. | S |

## 5. 테스트 공백

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P1 MAJOR | `web/src/components/receiver/__tests__/OnboardingGoalForm.test.tsx:46` | [테스트 공백] 승인 PRD의 다중 목표, 목표 3개 상한, visibility, 공개범위 3x3, 응원자 My Page 테스트가 0건이다. 기존 테스트 mock은 `mockExistingGoals`가 있으면 저장을 막는 구계약을 고정한다. | PRD `:254-256`, `:184-186`이 구체 FAIL 조건을 이미 정의한다. | 해당 acceptance를 pgTAP, RSC 단위, Playwright로 그대로 옮기고 구 1목표 단언을 제거가 아닌 계약 전환으로 기록한다. | L |
| P1 MAJOR | `web/src/app/(receiver)/cashout/__tests__/page.test.tsx:35` | [테스트 공백] cashout page 조회 mock이 성공만 반환하며 eligibility/status/history/member 중 하나가 실패할 때 0원으로 위장되는 경로를 검증하지 않는다. status 테스트도 status RPC 오류가 없다. | 실제 구현 결함은 `cashout/page.tsx:16-31`, `cashout/status/page.tsx:55-74`에서 재현 가능하다. | 네 의존성 각각 실패 표와 status 실패 표를 추가해 숫자·빈 상태가 렌더되지 않음을 단언한다. | M |
| P2 MINOR | `web/vitest.config.ts:7` | [테스트 공백] coverage provider·최소 임계치가 없어 279개 테스트가 통과해도 미실행 라우트와 분기를 수치로 드러내지 못한다. | dev 표준의 계약 테스트는 개수보다 위험 분기 추적성을 요구한다. | money/auth 우선으로 branch threshold를 도입하고 전역 수치는 기준선 방식으로 단계 상승시킨다. | M |
| P2 MINOR | `web/src/components/common/__tests__/NotificationBadge.test.tsx:1` | [테스트 공백] 실측 `npm test -- --run`에서 React `act(...)` 경고가 반복됐다. 44파일 279테스트는 PASS지만 비동기 state update가 테스트 종료 뒤 일어나 레이스를 가릴 수 있다. | React Testing Library는 사용자에게 보이는 상태 갱신을 `act` 범위에서 기다리도록 요구한다. | fetch 완료를 `findBy`/`waitFor`로 기다리고 console warning 0을 테스트 종료 조건으로 둔다. | S |
| P2 MINOR | `web/src/components/goal/__tests__/Wordmap.test.tsx:103` | [테스트 공백] 13개 입력에서 12개만 표시하는 현재 결함을 기대값으로 고정해 초과 안내·회수 경로가 없는 상태를 PASS시킨다. | DESIGN `:522`, `:727`은 이 상태를 미해결로 표시한다. | 13번째 초과 안내와 전체 경로가 반드시 존재하도록 기대값을 뒤집는다. | S |
| P3 MINOR | `web/src/app/child-safety/page.tsx:4` | [테스트 공백] 법정 고지 페이지는 route 존재·본문 필수 항목·연락처·개정일 테스트가 없다. | 페이지가 placeholder인데 기존 10경로 캡처는 시각 존재만 확인한다. | 정책 최소 항목의 정적 계약 테스트와 링크 smoke를 추가한다. | S |

실행 증거: `npm test -- --run`은 44파일 279/279 PASS, 단 NotificationBadge 관련 `act` 경고 반복. `npm audit --omit=dev --json`은 운영 의존성 취약점 0건.

## 6. 성능

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P2 MINOR | `web/src/app/(receiver)/me/page.tsx:79` | [성능] 목표 조회 뒤 member, eligibility, cashout status, cheers, wordmap을 대부분 순차 대기한다. 목표 id 이후 독립인 네 조회도 직렬이라 서버 응답 시간이 합산된다. | Next.js 서버 컴포넌트의 독립 데이터 요청은 병렬화할 수 있다. | goal 확정 뒤 독립 쿼리를 `Promise.all`로 묶되 각 오류 판정을 유지한다. | S |
| P2 MINOR | `web/src/app/g/[slug]/page.tsx:132` | [성능][데이터 안전] owner bar의 새 응원 수를 세려고 해당 목표의 모든 `created_at` 행을 내려받아 브라우저 전달 전 서버 메모리에서 계산한다. 응원이 늘수록 선형 전송·메모리가 든다. | 필요한 값은 last-seen 이후 count 하나다. | DB count 또는 `head:true, count:'exact'`와 시간 필터로 바꾸고 복합 인덱스를 확인한다. | S |
| P2 MINOR | `supabase/migrations/20260705163137_init_schema.sql:347` | [성능] `get_wordmap`은 페이지 요청마다 모든 확정 메시지를 `regexp_split_to_table`로 분해·그룹화하고 마지막에만 LIMIT 100을 적용한다. 인기 목표가 커질수록 CPU 비용이 선형 증가한다. | `wordmap_render_cache` 테이블이 이미 있지만 웹 read model은 사용하지 않는다. | 증분 집계 테이블 또는 갱신 가능한 캐시를 쓰고 목표별 부하 테스트로 전환 기준을 정한다. | M |
| P2 MINOR | `web/src/app/(receiver)/cashout/history/page.tsx:24` | [성능] 사용자별 최신 20행 계약인데 최대 100행을 가져와 모두 렌더하고 합계도 그 100행만으로 계산한다. 이력 100건 초과 시 "지금까지" 합계마저 틀린다. | DESIGN `:524`의 20행 페이지네이션과 문구 "지금까지 받은 금액"의 의미가 충돌한다. | 총계 전용 SQL 집계와 20행 커서를 분리한다. | M |
| P3 MINOR | `supabase/functions/auth-kakao/index.ts:217` | [성능] 이메일 충돌 때 최대 1000 Auth 사용자를 받아 애플리케이션에서 선형 검색한다. | 단건 식별 문제를 전체 목록으로 해결한다. | 정확 조회나 페이지 인덱스 전략으로 바꾼다. | S |

### 2차 중간 저장 판정

- 축 4 오류 처리·관측: 지적 7건, P1 3건·P2 3건·P3 1건.
- 축 5 테스트 공백: 지적 6건, P1 2건·P2 3건·P3 1건. 단위 테스트 279/279 통과는 관찰됐지만 경고 0은 아님.
- 축 6 성능: 지적 5건, P2 4건·P3 1건.

## 7. 접근성·390폭

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P2 MINOR | `web/src/components/cashout/CashoutPageView.tsx:113` | [접근성] "웰컴, 지급 대상 아님" 돈 설명과 금액에 대비 2.81:1인 `--faint`를 쓴다. 입력 안내도 `CashoutRequestForm.tsx:341,366`에서 같은 색이다. | DESIGN `:227,249,629`는 `--faint`를 장식 전용으로 제한하고 돈 설명은 `--muted` 4.71:1 이상을 강제한다. | 읽혀야 하는 보조 글자를 `text-muted-foreground` 이상으로 올리고 axe·대비 검사를 추가한다. | S |
| P2 MINOR | `web/src/app/(receiver)/cashout/history/page.tsx:44` | [접근성] 요약 제목·날짜·상태 안내가 `--faint`다. 돈 이력을 이해하는 핵심 라벨이 명도 대비 기준을 못 채운다. | DESIGN `:249`, `:629`와 직접 충돌한다. | `--muted` 이상으로 교체한다. | S |
| P2 MINOR | `web/src/components/common/NotificationBadge.tsx:122` | [접근성] 알림 버튼에 44x44 최소 터치 영역이 없고 실제 내용은 22px 아이콘뿐이다. 닫기 버튼 `:168`도 11px 텍스트만 있어 모바일 조작 면적이 작다. | 제품 접근성 규약은 주요 인터랙션 최소 44px을 요구한다. | 두 버튼에 최소 44x44 영역을 주고 시각 크기와 히트 영역을 분리한다. | S |
| P2 MINOR | `web/src/app/(receiver)/cashout/history/page.tsx:75` | [접근성][기능] PAID·REJECTED 행도 링크로 렌더하지만 href가 `#`라 포커스 가능한 가짜 인터랙션이 된다. 클릭하면 문서 상단만 이동한다. | 요소의 역할과 실제 동작이 일치해야 한다. | 상세가 없으면 비인터랙티브 행으로 렌더하고, 상세를 만들면 실제 경로와 접근성 이름을 제공한다. | S |
| P2 MINOR | `web/src/components/auth/LogoutButton.tsx:34` | [접근성] 로그아웃 버튼도 11px 글자만 있고 최소 터치 영역과 visible focus 클래스가 없다. | 390 모바일 조작과 키보드 포커스 가시성 기준에 어긋난다. | 최소 44px 높이·패딩과 focus-visible ring을 추가한다. | S |
| P3 MINOR | `web/src/app/page.tsx:74` | [접근성] 읽혀야 하는 워드맵 설명과 계정 안내 `:207`에 `--faint`를 써 첫 화면의 안내가 저대비다. | DESIGN `:249`는 placeholder·장식만 허용한다. | muted 이상으로 올린다. | S |

390폭 기존 캡처 10경로는 수평 잘림을 육안으로 발견하지 못했다. 단 `/cashout`, `/cashout/history`, `/me`, `/onboarding` 캡처는 무인증 리다이렉트된 랜딩이어서 해당 화면의 390 정상 판정 근거가 아니다.

## 8. 디자인 토큰

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P2 MINOR | `scripts/qa/design-token-lint.baseline.json:1` | [토큰 위반] 검사기가 현행 색상 리터럴·인라인 스타일 75건을 기준선으로 승인하고 신규 증가만 막는다. `npm run qa:design-tokens`도 "통과, 기존 위반 75건"이었다. | DESIGN `:121`, `:487`은 토큰 계약 위반을 reject하고 화면별 radius·spacing·shadow를 금지한다. | 기준선 75건을 소유자·기한이 있는 부채로 분할하고 공용 토큰·상태 variant로 줄인 뒤 기준선을 계속 낮춘다. | M |
| P2 MINOR | `web/src/app/page.tsx:60` | [토큰 위반] 워드맵 색 3종과 SVG fill, 위치·크기 인라인 style을 직접 박았다. | DESIGN `:209-281`의 의미 토큰 우선 계약과 어긋난다. | wordmap tier 색·크기·배치 변수를 DESIGN과 globals의 명명 토큰으로 올리고 데이터 속성/클래스로 소비한다. | S |
| P2 MINOR | `web/src/components/common/NotificationBadge.tsx:159` | [토큰 위반] `rounded-2xl`, `shadow-xl`, `#E4E0D8`, `#A09B93`, 인라인 배경을 섞어 공용 카드·시트 체계 밖의 독자 스타일을 만든다. | DESIGN `:100-107`, `:409-411`은 radius 12/14/20/full, card shadow none, sheet shadow 하나만 허용한다. | 공용 popover/sheet variant와 border·muted 토큰으로 통합한다. | S |
| P2 MINOR | `web/src/app/payment/success/page.tsx:92` | [토큰 위반] 오류 상태가 `#FCEEEE`, `#B3261E` 인라인 스타일을 쓰고 fail 페이지 `:25`도 같은 리터럴을 중복한다. | DESIGN frontmatter `:18-24`에 danger 계열 토큰이 이미 있다. | danger-soft/danger-ink 클래스와 공용 ResultState를 사용한다. | S |
| P2 MINOR | `web/src/components/goal/Wordmap.tsx:60` | [토큰 위반] tier 색·폰트 크기와 dashed border·SVG fill을 리터럴로 유지한다. | DESIGN `:200`은 현재 리터럴이 이상형 토큰으로 오독되지 않도록 별도 이탈이라고 명시한다. | wordmap 전용 의미 토큰을 한 번 정의하고 랜딩·풀뷰·이미지 렌더러에서 공유한다. | M |
| P3 MINOR | `web/src/app/how/page.tsx:68` | [토큰 위반] 허용 목록에 없는 radius 18px과 임의 card shadow를 쓴다. 공개 goal·landing에도 15px, 24px 등이 반복된다. | DESIGN `:411`은 12/14/20/full 외 사용 금지, card shadow none이다. | 기존 sm/md/lg와 shadow 토큰으로 수렴시킨다. | S |

## 9. 죽은 코드·의존성

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P2 MINOR | `web/package.json:34` | [의존성] 전체 `npm audit`은 dev 도구 체인에서 critical 1, high 30, moderate 9, low 2를 보고했다. 직접 의존 Storybook 10.2.8은 WebSocket hijacking 권고의 영향 범위이고 Vercel CLI 하위에는 `tar` critical이 있다. 운영 의존성만의 audit은 0건이다. | 개발 도구도 로컬 파일·배포 자격증명에 접근하므로 공급망 위험은 0이 아니다. | lockfile 백업 후 Storybook 패치와 Vercel CLI 호환 버전을 별도 브랜치에서 올리고 build/storybook/배포 dry-run을 확인한다. 자동 강제 수정은 금지한다. | M |
| P3 MINOR | `web/src/store/index.ts:17` | [죽은 코드] `useAppStore`는 실행 코드 import가 0건이고 LoginSheet에는 미래 확장 주석만 있다. 이 파일 하나 때문에 Zustand 런타임 의존성을 유지한다. | `rg` 실측에서 정의 외 사용 0건. draft는 `lib/utils/draft`의 sessionStorage로 직접 관리된다. | 실제 전역 상태 계획이 없으면 store와 Zustand를 제거하고, 계획이 있으면 도입 ADR과 소비처를 만든다. | S |
| P3 MINOR | `web/src/components/ui/button.tsx:43` | [죽은 코드] 공용 Button은 정의 외 사용 0건이다. 이 파일 때문에 Base UI와 class-variance-authority가 남아 있는데 실제 화면은 모두 개별 버튼 클래스를 쓴다. | 컴포넌트 인벤토리는 공용 Button을 전제로 하지만 코드 소비처가 없다. | 화면 버튼을 이 컴포넌트로 수렴시키거나 미사용 scaffold와 전용 의존성을 제거한다. | M |
| P3 MINOR | `supabase/functions/cashout-payout/index.ts:1` | [죽은 코드] 운영 수동 지급 계약에서 호출되지 않는 501 future endpoint가 배포 가능한 함수 목록에 계속 남는다. 다만 FDD가 의도적 보존을 명시하므로 무기록 삭제 대상은 아니다. | FDD `:301`은 자동 지급 승인 전 501 stub 유지라고 명시한다. | 자동 배포 대상에서는 제외하고 함수 인벤토리에 `disabled/future`를 기계 판독 가능하게 표시한다. | S |

### 3차 중간 저장 판정

- 축 7 접근성·390폭: 지적 6건, P2 5건·P3 1건. 확인 가능한 공개 캡처에서 수평 잘림은 문제없음.
- 축 8 디자인 토큰: 지적 6건, P2 5건·P3 1건. 토큰 lint는 신규 0이지만 기존 위반 75건.
- 축 9 죽은 코드·의존성: 지적 4건, P2 1건·P3 3건. 운영 의존성 취약점은 0건.

## 10. 문서·코드 불일치

| 심각도 | 위치 | 지적 | 승인 계약·근거 | 교정안 | 예상 공수 |
|---|---|---|---|---|---|
| P0 MAJOR | `web/src/lib/supabase/service.ts:86` | [문서·코드 불일치][보안][회귀 위험] 환전은 `CASHOUT_ENABLED` 전역값만 검사하고, 신청 액션 `web/src/app/(receiver)/cashout/actions.ts:94-104`는 인증 사용자면 누구나 통과시킨다. 회장 계정 allowlist가 없다. 기능이 켜진 운영에서 일반 사용자가 미확정 3.3% 세금 계약으로 신청할 수 있다. | 거버넌스 D-017 `wiki/거버넌스/결정.md:43-50`은 소득 성격·원천징수 의무가 미확정이며 세무 자문 전 "환전은 회장 계정으로만 시험했고 사용자에게 열지 않는다"고 결정했다. `docs/제품현황.md:84-88`은 환전과 알림을 운영 중으로 적는다. | 세무 결론 전에는 전역 스위치를 끄거나 서버에서 회장 계정 allowlist를 강제한다. 세무 결론, 개인정보 처리 근거, 약관·개인정보처리방침을 맞춘 뒤 별도 승인으로 일반 사용자에게 연다. | S 긴급 |
| P1 MAJOR | `pipeline-state.core.md:8` | [문서·코드 불일치][승인 시안 이탈] 전 단계 완료, 차단 잔여 없음이라고 선언했지만 승인 PRD의 다중 목표·공개범위·응원자 My Page·감사 메시지와 DESIGN의 장문 회수 상태가 코드에 없다. | 승인 핀 PRD `docs/plan/prd-haenael-ge-v0.4.0.md:124-196,232-301`과 본 보고서 축 1의 코드 대조 7건이 반증한다. | 파이프라인을 실제 누락이 시작된 plan 또는 build 범위로 reopen하고, 구현하거나 이번 릴리스에서 제외한다는 새 승인 결정을 남긴 뒤에만 `done`을 복구한다. | M |
| P1 MAJOR | `web/src/app/privacy/page.tsx:201` | [문서·코드 불일치][보안] 개인정보처리방침은 카카오와 솔라피 알림톡 처리를 "현재 비활성"이라고 고지한다. | `pipeline-state.core.md:51,102,110`은 운영에서 `CASHOUT_REQUESTED`, `CASHOUT_PAID` 알림톡 각 1건의 실제 발송을 확인했다고 기록한다. 실제 처리업체와 목적을 비활성이라고 고지하는 법정 문서가 운영과 어긋난다. | 실제 활성일, 처리 항목, 보유·위탁 조건을 확인해 방침을 갱신하고 변경 이력을 남긴다. 알림을 끌 경우에는 운영 발송을 중단했음을 별도 확인한다. | S |
| P2 MINOR | `README.md:48` | [문서·코드 불일치] 검증 상태가 2026-08-22의 Vitest 227건, pgTAP 246건, Playwright 11건에 멈췄다. | 이번 직접 실행은 Vitest 279/279이고 `pipeline-state.core.md:54-55`도 build·QA 최신 증거를 279건과 운영 E2E로 기록한다. | 숫자 복제를 없애고 최신 검증 문서나 CI run으로 연결한다. 숫자를 유지하면 생성 스크립트로 갱신한다. | S |
| P2 MINOR | `wiki/2-product/current-state.md:20` | [문서·코드 불일치] 배포 진행 중, 대표 주소 1.0.0, 마이그레이션 미적용, CI 성공 없음이라는 상태가 최신 정본과 반대다. | `pipeline-state.core.md:8,54-56`은 release 1.2.1, migration 정렬, CI green, ship 완료를 선언한다. 이번 `supabase migration list --linked`도 42/42 일치를 관찰했다. | 현재 상태 문서를 파이프라인 정본에서 생성하거나 상단에 만료시각·대체 정본 링크를 표시한다. | S |
| P2 MINOR | `wiki/3-operations/운영-미결-원장.md:23` | [문서·코드 불일치] O-008부터 O-011까지 DB 미적용, 대표 주소 구버전, Actions 차단, 운영 E2E 미활성 상태를 현재 미결로 계속 노출한다. | `pipeline-state.core.md:8,54-56`은 네 항목이 해소됐다고 기록한다. | 각 항목을 해소 근거와 함께 닫고, 미결 인덱스가 열린 항목만 모으도록 한다. | S |
| P2 MINOR | `docs/제품현황.md:108` | [문서·코드 불일치] 최신 QA가 제품 전체 NG이고 보안 헤더·브라우저·의존성·성능이 남았으며 Actions도 차단이라고 적는다. | `pipeline-state.core.md:8,55-56`은 해당 QA와 ship을 승인·완료하고 CI green을 기록한다. | 제품현황의 최상단 현재 스냅샷을 갱신하고 과거 블록에는 `historical` 표식을 붙인다. | S |
| P2 MINOR | `DESIGN.md:247` | [문서·코드 불일치][토큰 위반] amber·danger 의미 변수가 globals에 없다고 쓰고 직접 hex 사용을 현행 계약처럼 설명한다. | `web/src/app/globals.css:100-106`에는 `--danger-ink`, `--amber`, `--amber-soft`, `--amber-line`, `--amber-ink`가 모두 존재한다. DESIGN `:277-281`의 역할표도 같은 잘못된 상태를 반복한다. | DESIGN 역할표를 실제 토큰 존재 상태로 갱신하고 남은 hex 소비처를 토큰 부채로만 기록한다. | S |

### 4차 최종 축 저장 판정

- 축 10 문서·코드 불일치: 지적 8건, P0 1건·P1 2건·P2 5건.
> **2026-10-20 실측(컨트롤러, 관찰됨)**: 운영 Vercel 의 `CASHOUT_ENABLED` 와 `NEXT_PUBLIC_CASHOUT_ENABLED` 가 **둘 다 `true` 가 아니다.** 즉 **현재 신청 경로는 닫혀 있고 실제 노출은 없다.** 확인 방법은 `vercel env pull` 로 운영 값을 세션 전용 폴더에 받아 그 두 키의 불리언만 보고 파일을 즉시 삭제한 것이다(값은 어디에도 기록하지 않았다). 그러므로 이 P0 는 **지금 당장의 stop-ship 이 아니라 "스위치를 켤 때의 선행 조건"** 이다. 코드에 거버넌스 제한(D-017 의 회장 계정 allowlist)이 없는 것은 그대로 사실이므로, **스위치를 켜기 전에 반드시 서버측 allowlist 와 일반 계정 거부 테스트를 먼저 넣는다.** 등급은 P0 로 유지하고 성격을 "노출 중" 에서 "점화 전 필수" 로 고친다.

- P0는 실제 일반 사용자 지급이 발생했다고 단정한 것이 아니다. 코드에 거버넌스 제한이 없고 운영 기능이 활성 기록을 가진 상태라서 즉시 노출을 막아야 하는 stop-ship 위험이다.

## 위키 전수 표

| 판정 | 위치 | 전수 결과 | 조치 |
|---|---|---|---|
| P2 MINOR | `wiki/2-product/current-state.md:20` | [위키·코드 불일치] 배포·마이그레이션·CI·운영 주소 상태가 최신 파이프라인과 어긋난다. `:58-78`에도 같은 과거 차단이 현재형으로 남았다. | `pipeline-state.core.md`에서 생성하거나 갱신 책임자·만료 규칙을 둔다. |
| P2 MINOR | `wiki/3-operations/운영-미결-원장.md:23` | [위키·코드 불일치] 이미 해소된 O-008부터 O-011을 현재 미결 인덱스와 본문에 유지한다. | 해소된 항목은 append-only 종료 기록을 위에 추가하고 열린 인덱스에서 제외한다. |
| P3 MINOR | `wiki/3-operations/decisions.md:9` | [깨진 링크] `../거버넌스/결정-원문/decisions.md`가 존재하지 않는다. 같은 줄의 현행 `../거버넌스/결정.md`만 유효하다. | 존재하지 않는 레거시 대상은 삭제하거나 실제 archive 경로로 교정한다. |
| P3 MINOR | `wiki/3-operations/learnings-ledger.md:9` | [깨진 링크] `../거버넌스/실수-원문/learnings-ledger.md`가 존재하지 않는다. 같은 줄의 현행 `../거버넌스/실수.md`만 유효하다. | 존재하지 않는 레거시 대상은 삭제하거나 실제 archive 경로로 교정한다. |
| 문제없음 | `wiki/README.md:1` | [frontmatter] `wiki/**/*.md` 53개 전부 첫 블록에 frontmatter가 있다. 결손 0건이다. | 없음. |
| 문제없음 | `wiki/README.md:1` | [중복] 53개 파일의 SHA-256 exact duplicate는 0건이다. pointer 문서의 의도적 내용 유사성은 중복 결함으로 세지 않았다. | 없음. |
| 문제없음 | `wiki/README.md:1` | [링크] 위 두 표준 Markdown 링크 외 깨진 상대 링크 0건, 깨진 wikilink 0건이다. 괄호 설명을 링크로 오인한 자동검사 1건은 직접 확인해 제외했다. | 없음. |

## QA 실측 표

재캡처하지 말라는 입력 계약을 지켰다. 인증 화면 캡처가 로그인 리다이렉트인 경우에는 기능 정상 근거로 승격하지 않았다.

| 대상 | 직접 관찰값 | 판정·증거 등급 |
|---|---|---|
| 기존 1280폭 캡처 10개 | `1280_cashout.png`, `1280_cashout_history.png`, `1280_child-safety.png`, `1280_g_does-not-exist-xyz.png`, `1280_how.png`, `1280_me.png`, `1280_onboarding.png`, `1280_privacy.png`, `1280_root.png`, `1280_terms.png` | 파일 존재 관찰. 공개 화면 표본은 육안 확인. auth-only 경로는 랜딩 리다이렉트라 기능 판정 미검증. |
| 기존 390폭 캡처 10개 | `390_cashout.png`, `390_cashout_history.png`, `390_child-safety.png`, `390_g_does-not-exist-xyz.png`, `390_how.png`, `390_me.png`, `390_onboarding.png`, `390_privacy.png`, `390_root.png`, `390_terms.png` | 파일 존재 관찰. 공개 표본에서 수평 잘림은 발견하지 못함. child-safety placeholder는 관찰됨. auth-only 경로는 기능 판정 미검증. |
| `supabase/functions/notify/index.ts:1` 운영 무인증 호출 | HTTP 401, `Internal notify token required` | 통과, 관찰됨. |
| `supabase/functions/toss-confirm/index.ts:1` 운영 무인증 호출 | HTTP 401, `UNAUTHORIZED_NO_AUTH_HEADER` | 통과, 관찰됨. |
| `supabase/functions/wordmap-render/index.ts:1` 운영 무인증 호출 | HTTP 401, `UNAUTHORIZED_NO_AUTH_HEADER` | 통과, 관찰됨. |
| `supabase/migrations/20260825020000_cashout_total_threshold_contract.sql:1` | `supabase migration list --linked`의 local·remote 42개가 전부 일치 | 통과, 관찰됨. 데이터 내용과 RLS 실제 anon/auth 행 결과는 미검증. |
| `web/package.json:12` Vitest | 44파일, 279/279 PASS | 테스트됨. NotificationBadge 계열 React `act(...)` 경고가 반복돼 경고 0 기준은 실패. |
| `web/package.json:21` 디자인 토큰 검사 | PASS, 신규 위반 0, 기존 기준선 위반 75 | 테스트됨. 회귀 차단은 통과지만 토큰 정합은 실패. |
| `web/package.json:1` 운영 의존성 audit | production 0건 | 테스트됨. 전체 dev 포함은 42건이라 별도 P2. |
| Git 기준선 | HEAD와 `origin/main` 모두 `68a440f` | 관찰됨. worktree의 기존 사용자 변경은 감사 대상 코드 변경으로 간주하지 않았고 수정하지 않음. |

## 소유 세션 배정안

| 우선순위 | 소유 세션 | 소유 항목 | 종료 증거 |
|---|---|---|---|
| 즉시 | root 컨트롤러 + 회장 | P0 환전 노출 중지와 세무 자문 전 경계 결정 | 운영 스위치 OFF 또는 서버 allowlist 관찰, 일반 계정 거부 테스트, 결정 원장과 개인정보 문서 정합. 배포는 별도 승인 필요. |
| 1 | prd-architect + plan 세션 | 승인 PRD v0.4.0 기능을 이번 제품 범위로 유지할지 축소할지 재결정 | request provenance, PRD, pipeline approved_artifacts가 동일 범위를 가리킴. |
| 2 | tech-architect + eng-design 세션 | 다중 목표 상한·visibility·supporter 연결·thanks 계약, 오류 상태와 인덱스 설계 | API·RLS·ERD·마이그레이션·acceptance의 양방향 추적 0 gap. 되돌리기 비싼 설계라 회장 합의 뒤 확정. |
| 3 | code-builder + core build 세션 | 승인 누락, 돈 화면 오류 위장, timeout, rate limit, 접근성·토큰·의존성 | 구현 diff, unit·pgTAP·E2E, dev 실화면 390/1280 핵심 플로우와 콘솔 오류 0. |
| 4 | qa-verifier + core QA 세션 | PRD v0.4 acceptance, 돈 오류 주입, PRIVATE 공개 차단, coverage·a11y·성능 | 실패를 먼저 재현한 픽스처와 수정 후 green, 인증 화면 운영 대조, RLS 역할별 실측. |
| 5 | venture 문서 세션 | 위키 깨진 링크·과거 미결·README·DESIGN·개인정보처리방침 갱신 | 링크 검사 0, current-state와 pipeline-state 대조 0, 법정 문서와 실제 처리업체 대조 확인. |

## 4축 판정

| 축 | 판정 | 근거 |
|---|---|---|
| 승인 시안 이탈 | 지적 8건, MAJOR 7건 | 다중 목표·visibility·응원자 흐름·정책·장문 상태가 승인 원문과 다르다. 시각적 취향 편차는 MAJOR로 세지 않았다. |
| 회귀 위험 | 지적 6건, MAJOR 6건 | 거버넌스 없는 일반 환전 노출, 다중 목표 DB 충돌, 비공개 SECURITY DEFINER 누출 준비 상태, cashout 3화면의 장애 위장이 merge·운영 차단 사유다. |
| 토큰 위반 | 지적 6건, MINOR 6건 | 신규 증가는 0이지만 기존 리터럴·인라인 스타일 75건이 기준선에 고정돼 있다. |
| 무기록 삭제 | 문제없음 | worktree의 웹 변경은 LoginSheet 브랜드 색 예외 주석 6줄뿐이고 기능 삭제가 아니다. `HEAD~10..HEAD`의 웹 변경도 SplitBalanceCard 토큰 1줄과 의존성 갱신뿐이라 부품·기능 삭제를 찾지 못했다. 감사 범위 밖 과거 전체 Git 이력은 미검토다. |

## 셀프심문

"내가 PASS를 준다면, 회장이 dev에서 직접 써보고 발견할 가장 그럴듯한 문제는 무엇인가?"

인증 사용자가 실제 잔액을 가진 상태에서 DB 조회가 실패하면 환전 화면이 0원, 신청 없음, 이력 없음으로 거짓 정상 표시되는 문제다. 두 번째 목표도 승인 PRD와 달리 DB 유니크 제약과 onboarding 리다이렉트에서 막힌다. 둘 다 축 1·3·4의 P1로 이미 등재했으며, 이 답 때문에 PASS는 성립하지 않는다.

REVIEW_VERDICT: BLOCK(MAJOR 있음)

KNOWLEDGE_QUERY: `haenael-ge + code-review + qa + secret`, 승인 PRD v0.4와 구현의 다중 목표·visibility·supporter·cashout 대조, BRAIN `wiki/business/index.md`에서 해낼게 기술 감사 관련 정본, OWASP ASVS·Supabase RLS/API key·Next.js 인증/BFF 공식 문서를 검색했다.

HITS_USED: `wiki/거버넌스/결정.md` D-017은 환전 노출의 최고 우선 안전 경계로 채택했다. 승인 PRD·DESIGN·프로토타입은 계약 이탈 기준으로, `pipeline-state.core.md`는 승인·운영 주장 대조로 채택했다. OWASP ASVS는 접근통제·오류·자동화 악용 판정, Supabase 공식 문서는 RLS 우회와 service role 취급, Next.js 공식 문서는 데이터 원천 근처 인가와 일반화된 오류 응답 기준으로 채택했다.

HITS_REJECTED: BRAIN `wiki/business/index.md`의 사업 레버리지·마케팅 자료는 기술 코드 감사의 직접 계약이 아니어서 지적 근거로 쓰지 않았다. 과거 위키 스냅샷은 최신 상태 판정 근거로 채택하지 않고 드리프트 대상으로만 썼다. 무인증 auth-only 캡처는 로그인 경계 증거일 뿐 기능 정상 증거가 아니어서 제외했다.

CONFLICTS: 승인 PRD v0.4는 다중 목표·공개범위·응원자 경험을 요구하지만 코드와 `done` 상태가 충돌한다. 거버넌스 D-017은 세무 자문 전 사용자 환전 금지를 요구하지만 운영 가능 코드와 제품현황이 충돌한다. 개인정보처리방침은 알림톡 업체를 비활성이라고 고지하지만 파이프라인은 운영 실발송을 기록한다. 외부 보안 기준과 회장 정본 사이 직접 충돌은 없었다.

SOURCES: 로컬 `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `pipeline-state.core.md`, `docs/plan/prd-haenael-ge-v0.4.0.md`, `DESIGN.md`, `docs/design/user-flow.md`, 승인 프로토타입, `web/src`, `supabase/migrations`, `supabase/functions`, `wiki/**/*.md`, `/Users/sj/.claude/standards/dev.md`, `/Users/sj/.claude/standards/qa-methodology.md`, `/Users/sj/.claude/standards/secret-management.md`, `/Users/sj/.claude/standards/benchmarks.md`; [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Next.js Authentication](https://nextjs.org/docs/app/guides/authentication), [Next.js Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend).

MODEL: gpt-codex/GPT-5, runtime exact build identifier는 노출되지 않음.

SKILLS_USED: review

SKILLS_SKIPPED: qa, 기존 운영 캡처를 재사용하고 운영 API 3개만 curl로 확인하라는 사용자 범위 때문에 재캡처·수정형 QA 루프는 실행하지 않음.
