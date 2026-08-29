# Test Cases: 해낼게 운영 계약 v1.0.0

> 기준 시각: 2026-08-29 04:46 KST
> 목적: PRD, DESIGN, user-flow, FDD의 요구를 실행 가능한 테스트 ID로 고정한다. 실제 통과 여부는 `docs/qa-tracker.md`와 QA 산출물이 소유한다.

## 목차

- [1. 환전 30/27 및 A1 핵심 케이스](#1-환전-3027-및-a1-핵심-케이스)
- [2. 인증, 개인정보, 운영 케이스](#2-인증-개인정보-운영-케이스)
- [3. 사용자 화면 케이스](#3-사용자-화면-케이스)
- [4. 8개 RPC 계약 케이스](#4-8개-rpc-계약-케이스)
- [5. QA exit 판정](#5-qa-exit-판정)
- [6. 셀프심문과 레드팀](#6-셀프심문과-레드팀)

## 1. 환전 30/27 및 A1 핵심 케이스

| ID | 사전조건 | 실행 | 기대 결과 | 자동화 위치 |
|---|---|---|---|---|
| CO-TH-01 | total 29, payable 29 | 29 신청 | `cashout_below_minimum`, 요청·원장 변화 없음 | pgTAP `cashout_manual.test.sql` |
| CO-TH-02 | total 30, welcome 3, payable 27 | 27 신청 | REQUESTED 1건, HOLD delta 0, total 30 유지, locked 27, available 3 | pgTAP + contract mutation |
| CO-TH-03 | total 30, welcome 3, payable 27 | 28 신청 | `cashout_insufficient_balance`, 변화 없음 | pgTAP |
| CO-TH-04 | total 30, payable 0 | 환전 화면 진입 | 자격 도달은 true, 신청 CTA 비활성, 0 신청 금지 | Vitest + Playwright |
| CO-TH-05 | total 30, payable 27 | 같은 request key와 같은 입력 2회 | 두 번째는 `is_replay=true`, 요청·HOLD 각 1건 | pgTAP |
| CO-TH-06 | total 30, payable 27 | 같은 request key에 계좌 또는 금액 변경 | `request_key_conflict` | pgTAP |
| CO-A1-01 | REQUESTED 27, total 30 | 상태 조회 | locked 27, available 3, payable 0, total 30 | pgTAP + component test |
| CO-A1-02 | REQUESTED 27 | 관리자 반려 | REJECTED, REVERSAL delta 0, total 30, locked 0 | pgTAP + admin action test |
| CO-A1-03 | REQUESTED 27, 계좌 열람 없음 | 지급 완료 호출 | `cashout_account_reveal_required`, 상태·총량 불변 | pgTAP |
| CO-A1-04 | REQUESTED 27, 같은 관리자 10분 내 계좌 열람 | 지급 완료 호출 | PAID, SETTLED delta -27, total 3, before 30, after 3 | pgTAP + status page test |
| CO-A1-05 | 이미 PAID | 지급 완료 재호출 | `cashout_already_paid`, SETTLED 1건 유지 | pgTAP + concurrency shell |
| CO-A1-06 | 같은 회원 동시 신청 2개 | 병렬 호출 | 성공 1, 거부 1, REQUESTED 1, HOLD 1 | `cashout_double_request_race.sh` |
| CO-A1-07 | 같은 요청 동시 지급 완료 2개 | 병렬 호출 | PAID 1, SETTLED 1, 단일 차감 | `cashout_double_paid_race.sh` |
| CO-A1-08 | PAID 후 새 EARN 발생 | 상태 화면 조회 | PAID 배너의 전후 값은 SETTLED 스냅샷 30→3 유지 | Vitest `status/page.test.tsx` |

## 2. 인증, 개인정보, 운영 케이스

| ID | 조건 | 기대 결과 | 자동화 위치 |
|---|---|---|---|
| CO-AUTH-01 | 비로그인 환전 Server Action | `unauthorized` | Vitest actions |
| CO-AUTH-02 | 최신 연령 확인이 `is_adult=false` | `cashout_minor_not_allowed` | pgTAP |
| CO-AUTH-03 | KYC 기록 없음 | 신청 가능. 지급 단계의 실명 수집 정책과 구분 | pgTAP |
| CO-ID-01 | 지급 단계 신원정보 수집 주체·필드·보존 결정 없음 | 구현과 테스트 착수 금지, 회수 gap 유지 | eng-design gate |
| CO-ID-02 | 향후 직접 수집안을 승인 | 최소수집·전송암호화·저장암호화·권한·열람감사·파기·실패복구 테스트가 전부 정의돼야 승인 | 미정 |
| CO-ID-03 | 향후 수탁사 직접 수집안을 승인 | 제품에 원문이 유입되지 않음, provider token·상태·webhook 무결성·파기 증거 테스트가 정의돼야 승인 | 미정 |
| CO-SEC-01 | anon이 8개 환전 RPC 실행 | EXECUTE 거부 또는 행 0 | pgTAP privilege tests |
| CO-SEC-02 | 타 회원이 `clover_eligibility(other)` 호출 | `forbidden` | pgTAP |
| CO-SEC-03 | 계좌번호 저장 및 목록 조회 | DB는 암호문, 목록·상태·이력은 마스킹만 | pgTAP + admin component |
| CO-SEC-04 | 파기된 계좌 요청 지급 완료 | `invalid_cashout_status` 또는 파기 가드 실패 | security pgTAP |
| CO-SEC-05 | 관리자 아닌 로그인 사용자 | list, reveal, paid, reject 모두 `admin_forbidden` | pgTAP |
| CO-NOTIFY-01 | 신규 신청, phone 있음 | CASHOUT_REQUESTED best-effort 발송. 실패해도 신청 성공 유지 | Vitest notification contract |
| CO-NOTIFY-02 | 지급 완료 | CASHOUT_PAID 발송 시도와 notification 기록 | admin action Vitest |
| CO-NOTIFY-03 | notify 403 | INAPP 또는 FAILED 관측 기록, 성공으로 삼키지 않음 | mutation test |

## 3. 사용자 화면 케이스

| ID | user-flow | 기대 결과 | 자동화 또는 증거 |
|---|---|---|---|
| UF-R-01 | §1.1-1~5 랜딩, write-first, 로그인, 링크 | draft 보존, 로그인 뒤 goal 저장, slug 노출 | onboarding Vitest/E2E |
| UF-R-02 | §1.1-6 수신 | 이름/익명과 메시지는 소유자에게 보이고 공개 금액은 없음 | me page tests |
| UF-R-03 | §1.1-7 워드맵 공유 | 풀뷰, 이미지·스토리·링크 공유 경로, share event | wordmap tests/E2E |
| UF-R-04 | §1.1-8 환전 | 공개 화면은 금액 없음, 본인 홈은 클로버, 환전에서만 원화·공제 표시 | cashout manual Playwright |
| UF-R-05 | §1.2 미달 | total<30에서 남은 개수와 대기 경로 | cashout page tests |
| UF-R-06 | §1.2 30/27 | 27을 기본·최대 신청량으로 표시하고 신청 최소 30 문구가 없음 | CashoutRequestForm tests |
| UF-R-07 | §1.2 반려 | 잠금 해제 카피와 재신청 경로 | status page tests |
| UF-R-08 | §1.2 지급 완료 | 이유, 전후 총량, 이력 회수 경로 3단 | status page tests |
| UF-R-09 | §1.3 owner 재진입 | 본인만 owner bar, `/me` 관리 경로 | goal page tests |
| UF-F-01 | §2.1-1~2 비로그인 목표 열람 | 목표·워드맵·N명 노출, 금액 비노출 | goal page E2E |
| UF-F-02 | §2.1-3~8 응원 결제 | 금액·메시지·익명 선택, Toss 승인, 1회 EARN | stage 결제 E2E, 미실행이면 미검증 |
| UF-F-03 | §2.2 결제 실패 | 사유, 재시도, 다른 결제수단 | Playwright |
| UF-F-04 | §2.2 중복 탭 | 단일 order/payment/ledger | integration + concurrency |
| UF-F-05 | §2.2 삭제·오류 링크 | 종료 안내 또는 친절한 404와 홈 회수 | route tests |
| UF-F-06 | §2.1-9 역할 전환 | 완료에서 subtle onboarding 링크 | Playwright |

## 4. 8개 RPC 계약 케이스

| RPC | 정상 케이스 | 필수 경계 케이스 |
|---|---|---|
| `clover_eligibility` | total/welcome/locked/available/payable 일치 | 타인·anon 거부, 잠김과 threshold 분리 |
| `create_cashout_request` | REQUESTED와 계산 스냅샷 반환 | 9개 입력 오류, 미성년, threshold, payable, 중복, replay conflict |
| `my_cashout_status` | 최신 진행 또는 종결 1건 | 타 회원 0행, PAID 스냅샷 필드 |
| `my_cashout_history` | 본인 이력 p_limit 내림차순 | p_limit 경계, 암호문 미노출 |
| `admin_list_cashouts_v2` | 관리자 목록과 마스킹 계좌 | 비관리자 거부, limit 경계 |
| `admin_reveal_cashout_account` | Server Action 관리자 확인 뒤 service-role 복호화와 actor access log 기록 | p_actor_id 비관리자, 파기, 키 버전 없음 |
| `admin_mark_cashout_paid` | 열람 후 PAID와 SETTLED | 열람 없음, 중복 지급, 음수 방어, 파기 가드 |
| `admin_reject_cashout` | REJECTED와 REVERSAL 0 | 사유 2~500자, 비관리자, 중복 종결 |

## 5. QA exit 판정

- 저장소 계약 검사, Vitest, build, pgTAP, concurrency, Playwright는 각각 다른 실패면을 검증한다. 하나를 다른 하나의 대리지표로 쓰지 않는다.
- 운영 쓰기 검증은 시험 거래 승인 없이 실행하지 않는다. 현재 운영 30/27 자연 계정이 없으면 해당 경로는 미검증으로 남긴다.
- GitHub Actions 분 소진은 제품 실패가 아니라 CI 실행 불가다. 로컬 증거와 운영 관찰을 보존하되 green CI라고 보고하지 않는다.
- 자동 지급대행 `cashout-payout`은 501 stub이므로 관련 테스트가 PASS로 분류되면 결함이다. 현재 정본은 관리자 수동 이체다.
- PRD §10.3 지급 신원정보는 테스트 가능한 입력·저장·파기 계약이 없어 QA exit 대상이 아니라 eng-design 회수 gap이다. 결정 전 "미저장" 또는 "안전" PASS를 선언하면 결함이다.

## 6. 셀프심문과 레드팀

이 계획이 틀렸다면 가장 그럴듯한 이유는 테스트 이름은 많지만 운영 함수의 모든 `RAISE`를 실제로 태우지 않는 것이다. 그래서 `check-cashout-raise-coverage.mjs`와 mutation runner를 별도 exit 조건으로 유지한다.

까다로운 감사자는 "신청 성공 뒤 알림 실패를 성공으로 둔 것은 오류 은닉"이라고 공격할 수 있다. 신청 트랜잭션과 알림 전달은 원자적으로 묶지 않는다. 대신 신청 성공은 보존하고 알림 실패를 notification 관측값으로 남기는 것이 중복 환전 방지와 재시도 안전성에 더 맞다.

---

🏷 STAMP | line: core | 생성: 2026-08-29 04:46 KST | model: gpt-5.6-sol | agent: tech-architect
skills: 없음 | 근거: user-flow v0.3.1, FDD v1.1.0, migration·tests·web tests 실측
고민: 운영 쓰기 금지를 지키면서도 30/27 계약을 놓치지 않도록 로컬 DB와 운영 읽기 검증을 분리했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 기술 테스트 설계 전용 스킬이 없어 기존 테스트 자산과 개발 품질헌법을 직접 대조했다.

RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 벤치마크반영=4/5 추적성=5/5 전문성·톤=5/5 total=24/25
WEAKEST_LINE: 지급 단계 신원정보 처리 방식이 미정이라 CO-ID-02와 CO-ID-03 중 어느 테스트 묶음을 실행할지 확정할 수 없다.

SOURCES/MODEL: gpt-5.6-sol | `docs/user-flow.md`; `supabase/tests/cashout_manual.test.sql`; `supabase/tests/cashout_security_hardening.test.sql`; `scripts/qa/check-cashout-layer-contract.mjs`; `scripts/qa/check-cashout-raise-coverage.mjs`; `web/e2e/cashout-manual.spec.ts`; `web/e2e/production-auth-readonly.spec.ts`
