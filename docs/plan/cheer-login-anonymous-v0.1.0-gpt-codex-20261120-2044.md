# D-057 응원 로그인·익명 귀속 구현 계획

- 목적: 응원 주문을 실제 로그인 회원에게 귀속해 익명 선택을 유지하면서도 보낸 사람이 자기 기록을 관리하게 한다.
- 달성 기준: 비회원 주문 401, 로그인 복귀, 익명 귀속·본인 목록 노출·공개 전환, 친구 상세 응원 진입·최근 메시지 방향 표시가 자동 시험과 390px 실화면에서 확인된다.
- 제약: 운영 DB·운영 배포·main push·실결제·알림톡 실발송 금지. 기존 공개·수신자 화면의 익명 경계와 기존 마이페이지·친구 기능을 보존한다. 호스트 메모리가 부족해 무거운 검증은 직렬 실행한다.
- 필요한 것: D-057·요청 원문·익명 경계 결정(확보), 기존 승인 디자인·기술설계(확보), 로컬 Supabase·Next.js(확인 및 필요 시 기동), 카카오·토스 실제 외부 왕복(이번 범위 밖).

## 범위와 계약

1. `cheer-order`는 유효한 Supabase 사용자 토큰이 없으면 `401 { error: { code: "login_required" } }`를 반환한다. 회원 주문 생성과 `social_cheer_member_attribution` 저장은 새 service-role 전용 RPC 한 트랜잭션으로 묶는다.
2. `my_social_dashboard()`의 `sent_cheers`에 `is_anonymous`를 추가한다. 보낸 사람에게 익명 응원을 `익명으로 보냄`으로 표시하고, 수신자·공개 화면에서는 기존 이름 숨김을 유지한다.
3. `reveal_my_anonymous_cheer(p_cheer_id)` RPC를 추가한다. 현재 로그인 사용자의 귀속, 확정·미삭제·비웰컴 응원, 현재 익명 상태를 검사한 뒤 `false`로만 전환한다. 공개 응원을 익명으로 되돌리는 경로는 만들지 않는다.
4. `my_friend_goals()`의 최근 메시지에 `recent_message_direction`을 추가하고, 친구 상세 이력은 보낸 본인에게만 익명 SENT 항목을 포함한다. 익명 RECEIVED 항목은 계속 제외한다.

## 화면 변경

- `/g/<slug>#cheer`: 비로그인 응원 CTA는 `/auth/kakao/start?redirect=/g/<slug>#cheer`로 이동한다. 로그인 회원만 결제 시트를 연다.
- 친구 상세: 현재 목표의 `/g/<slug>#cheer` 응원 진입 버튼을 추가한다.
- 친구 최근 응원 카드: `내가 보냄` 또는 `친구가 보냄`을 표시한다.
- 마이페이지 보낸 응원: 익명 항목에 `익명으로 보냄`과 `공개로 바꾸기`를 표시하고 RPC 성공 뒤 버튼을 제거한다.

## 빨강 → 초록 시험

- 인증: Deno 단위 시험에서 토큰 없음·유효 사용자 없음은 401 `login_required`, 로그인 회원 주문은 원자적 RPC를 호출한다.
- 데이터 경계: pgTAP에서 익명 보낸 기록 노출, 수신자 이름 비노출, 본인만 공개 전환 가능, 공개→익명 경로 부재를 검증한다.
- 친구 흐름: 서버 단위 시험에서 익명 SENT 포함·익명 RECEIVED 제외, 컴포넌트 시험에서 응원 링크와 최근 메시지 방향을 검증한다.
- 화면 흐름: `/g` 비로그인 CTA 로그인 복귀, 마이페이지 익명 라벨·공개 전환 버튼·실패 상태를 Vitest로 검증한다.
- 최종: DB 전체 시험, Deno 시험, 웹 typecheck·Vitest·lint·build, 헤드리스 390px 스모크와 콘솔 오류 0을 직렬 실행한다.

기반 포맷: `docs/plan/prd-haenael-ge-v0.4.0.md`의 계약·엣지 표기 방식을 1쪽 구현 브리프로 축약했다.

---
🏷 STAMP | line: cheer-login | 생성: 2026-11-20 20:44 KST | model: gpt-codex/gpt-5 | agent: code-builder
skills: haenael-supabase-build | 근거: D-057 · 요청 원장 2026-11-20 20:1x · 익명 경계 OD-004 · 승인 V2 코드/계약
고민: 후처리 attribution은 실패·재시도 때 귀속 없는 주문을 만들 수 있어, 주문과 귀속을 단일 DB 트랜잭션 RPC로 묶는다.

## 시험 결과 (2026-11-20 23:18 KST)

| 시험 항목 | 결과 | 관찰 근거 |
|---|---|---|
| `cheer-order` Deno 단위 시험 | PASS | 5/5. 토큰 없음·위조 토큰 401, 회원 귀속 원자 RPC 호출 확인. `/tmp/haenael-d057-deno.log` |
| D-057 pgTAP | PASS | 12/12. 익명 발신 기록, 수신 경계, 본인 공개 전환, 타인 거절 확인. |
| 로컬 Supabase 전체 pgTAP | BLOCKED | 25개 파일 중 24개 PASS. 기존 `alimtalk_fallback.test.sql` 5/7이 공유 로컬 DB의 `confirm_cheer_payment` 권한 불일치로 실패. D-057 파일은 PASS. |
| Supabase 서버 계약 보조 검증 | PASS | storage cleanup schedule·concurrency·runtime, cheer summary index 4종 PASS. `/tmp/haenael-d057-verify-*.log` |
| 웹 D-057 대상 Vitest | BLOCKED | 변경 계약 49건 PASS. 기존 `/g/[slug]` 소유자 bar 1건이 HDD 부하에서 15초 제한을 넘어 timeout. assertion 불일치는 없음. |
| 웹 TypeScript | PASS | `npm run test:typecheck:unit` 종료코드 0. `/tmp/haenael-d057-typecheck.log` |
| 웹 lint | PASS | `npm run lint` 종료코드 0. `/tmp/haenael-d057-lint.log` |
| 웹 QA 계약 | BLOCKED | custom class·보호 라우트·정산 계약은 PASS. mutation build가 Next.js 16.4.1 보안 권고로 중단. `/tmp/haenael-d057-qa-contracts.log` |
| 웹 production build | BLOCKED | 첫 실행은 compile·TypeScript·21개 정적 페이지를 완료한 뒤 Next.js 보안 권고로 종료코드 1. 권고 확인용 재실행 2회는 호스트 load 20~87·HDD I/O wait에서 각각 10분·20분 제한 초과. `/tmp/haenael-d057-build.log`, `/tmp/haenael-d057-build-retry.log`, `/tmp/haenael-d057-build-clean-cache.log` |
| 390px 헤드리스 화면 | 미실행 | build 차단 뒤 작업을 멈추라는 위임 조건에 따라 실행하지 않음. |

차단 결론: 구현 계약 시험은 통과했지만 production build와 390px 실화면을 관찰하지 못했으므로 커밋·브랜치 push 조건은 아직 충족하지 않았다. Next.js는 자체 보안 검사에서 16.4.1 업그레이드를 권고했다. 운영 DB·운영 배포·main·실결제·알림톡은 변경하지 않았다.
