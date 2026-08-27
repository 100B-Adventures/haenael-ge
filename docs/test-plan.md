# Test Plan — 해낼게 (haenael-ge)

> eng-design 산출물(QA 단계 입력). happy + edge 케이스 전수. 진실원: user-flow(dead-end 0)·fdd·api-contract.
> ⚠️ 헌법 §3: 완료=증거. E2E는 **실제 토스 stage/test 키**로(mock 아님). 결제·환전은 prod-parity 경로 직접 타격.
> 🔒 스택(2026-07-04): 서버리스 — Next.js/Vercel + Supabase(Postgres/Auth/RLS) + Edge Functions(돈). 테스트 = **Edge Function 로컬(`supabase functions serve`) + stage 배포** + RLS 정책 검증 + Vercel 프리뷰.
> 레벨: [U]단위 [I]통합 [E]E2E. 우선순위: 🔴돈/규제(무관용) · 🟠콜드스타트 · 🟡일반.

## 2026-08-27 운영 인증 읽기 전용 E2E 요구 추적표

| 요청번호 | 요구 | 테스트번호 | 실행 계층 | 합격 기준 |
|---|---|---|---|---|
| QA-PROD-AUTH-01 | 운영에서 로그인 세션이 필요한 환전 화면까지 검증 | QA-PROD-AUTH-01 | Playwright + Supabase Auth | 실제 운영 로그인, `/cashout` 200, redirect 0, `cashout-page` 렌더 |
| QA-PROD-AUTH-02 | 운영 제품 데이터 무오염 | QA-PROD-AUTH-02 | RLS read snapshot | QA 계정 `member` 0행, `cashout_request` 전후 동일, forbidden write 0 |
| QA-PROD-AUTH-03 | 자격증명 안전 보관 | QA-PROD-AUTH-03 | 설정 검사 | local secret 600, GitHub Environment secret, 코드·로그 원문 0 |
| QA-PROD-AUTH-04 | 공개 운영검증 보존 | QA-PROD-PUBLIC-01 | Node fetch | 홈·약관 10%·환전 화면 3건 통과 |
| QA-PROD-AUTH-05 | 신청 접수·알림톡 경계 | QA-PROD-WRITE-01 | 문서·코드 게이트 | 자동 실행하지 않고 미검증으로 보고. PASS 승격 금지 |
| QA-PROD-AUTH-06 | 자동 실행 | QA-PROD-SCHEDULE-01 | GitHub Actions | PR 미실행, 일일 schedule, contents read, trace·video·storageState artifact 0 |

운영 QA 계정은 `auth.users`에만 존재하고 `user_metadata.purpose=production-readonly-e2e`여야 한다. 제품 `member` 행이 생기면 테스트를 실패시킨다. 운영 쓰기 E2E는 `is_test` 격리축과 cleanup 계약이 승인되기 전까지 범위 밖이다.

## 2026-08-25 운영 첫 환전 실패 QA 복구 요구 추적표

| 요청번호 | 요구 | 테스트번호 | 실행 계층 | 합격 기준 |
|---|---|---|---|---|
| QA-RECOVERY-01 | 코드 기반 필수 env 목록과 실제 대상 환경 존재 확인 | ENV-CONTRACT-01 | 정적 분석 + Vercel/Supabase read-only metadata | 미분류 0, 필수 누락 0, 값 비출력, 누락 시 non-zero |
| QA-RECOVERY-02 | 최소 기준, 잔액, 금액 계산의 DB와 web 일치 | CASHOUT-CONTRACT-01 | 저장소 계약 + local PostgREST | 총30·웰컴3·지급가능27에서 27 신청 성공, 기준 변이 FAIL |
| QA-RECOVERY-03 | 가입 직후 상태부터 모든 DB 실패 분기 실행 | CASHOUT-DB-NEW-USER-01 | local pgTAP | 초기 0개, 순차 적립, 최신 함수 RAISE 코드 전수 직접 실행 |
| QA-RECOVERY-04 | 환전 알림 403을 0건과 구분 | CASHOUT-NOTIFY-01 | Vitest + 관측 계약 | 403에서 `INAPP/FAILED` 기록, 기록 제거 변이 FAIL |
| QA-RECOVERY-05 | 계좌 마스킹과 수수료 계산식 보존 | REG-CASHOUT-SEC-FEE-01 | pgTAP + Deno + Playwright | 마스킹 원문 비노출, 30개 기준 3,300·881·25,819 유지 |
| QA-RECOVERY-06 | 사고 3종의 탐지력 반증 | MUTATION-01~08 | mutation runner | env 누락, 층간 기준 변경, 실패 삼킴이 각각 기대한 exit 1 |

운영 DB에는 시험 데이터를 쓰지 않는다. Production env는 이름과 존재 여부만 조회하고, local Supabase reset 및 transaction rollback 기반 pgTAP을 사용한다.

## 0. 🤖 build 구현·리뷰 모델 split (🔒 회장 지시 2026-07-04)
- **저가 모델(기본)**: Next.js UI·RLS 읽기 쿼리·워드맵·공유·알림·목표/응원 조회·랜딩. → 일반 QA(🟠🟡).
- **강한 모델 + 별도 리뷰 게이트(돈 코어)**: `toss-confirm`·`cashout`·`cashout-payout`·`toss-webhook` **Edge Functions** + clover 원장·멱등·전금법 자금흐름·RLS 정책(§1·§2·§3·§7·§7b 케이스). 실수=돈 사고 → 강한 모델 + 코드리뷰 통과 후에만 배포. 아래 🔴 전항이 이 게이트 검증 목록.

---

## 1. 🔴 결제 (콜드스타트 생사 + 돈)

> 2026-07-10 구현 상태: 테스트 결제 해피패스의 웹 CTA/주문생성/RPC 원장전이는 로컬 검증 완료. `cheer-order` HTTP 주문 생성 smoke도 통과. `toss-confirm`은 함수 로딩·secret guard까지만 로컬 확인했고, 실제 토스 stage 결제 E2E, 웹훅 보상, 환불/취소, 환전/PASS는 아직 QA exit가 아니다.

| # | 케이스 | 유형 | 기대 | 검증 |
|---|---|---|---|---|
| PAY-1 | 게스트 커피값 결제 happy(3천) | E | payment DONE·cheer CONFIRMED·clover EARN·ConfirmToast·워드맵 반영 | 원장 EARN 1건, 금액 공개화면 미노출 |
| PAY-2 | 최소금액 미만(999원) | I | 400·저장비활성 | min 1,000 검증 |
| PAY-3 | 익명 선택 결제 | E | display_name=null "익명의 누군가", is_anonymous=true | 워드맵 익명 반영 |
| PAY-4 | 메시지 없이 결제(비동기·선택) | E | cheer.message=null, 정상 | 워드맵 count만 +1 |
| PAY-5 | 결제 실패(카드 거절) | E | ErrorState 재시도/다른수단, payment FAILED, dead-end 아님 | payment_log 전이 |
| PAY-6 | 이중탭/중복결제 | I | order_id UNIQUE·멱등 → 1건만 승인 | 이중 EARN 없음 |
| PAY-7 | 시트 닫음(취소) | E | 페이지 복귀·손실0·재진입 가능 | cheer PENDING 방치 정리 |
| PAY-8 | successUrl 위변조(amount 불일치) | I | P1 서버승인서 amount 검증 실패→거절 | 금액 조작 차단 |
| PAY-9 | PG 승인 성공 but DB 실패 | I | 보상: 자동 취소 시 payment CANCELED + log / 취소 실패 시 payment FAILED + risk_event | 원장 정합 복구 |
| PAY-10 | 결제 처리중 침묵 방지 | E | spinner·닫기잠금 노출 | 상태 가시성 |

## 2. 🔴 클로버 원장 & 환전 (돈·규제·세무)
| # | 케이스 | 유형 | 기대 |
|---|---|---|---|
| CLV-1 | 다건 응원 후 잔액=원장합계 | U | clover_balance == SUM(ledger) |
| CLV-2 | 환전 견적 ₩ 산출(K2) | U | gross/fee(take-rate)/withholding(3.3%)/net 정확 |
| CLV-3 | 최소환전액 미달(P1, <30,000) | I | 422 대기응답, 막다른길 아님 |
| CLV-4 | 환전 happy(지급대행) | E | HOLD→payout→SETTLED, net 계좌 지급, 지급명세 기록 |
| CLV-5 | payout 실패 | I | CASHOUT_REVERSAL, 홀드 복원(잔액 원복) |
| CLV-6 | 금액 3층 노출 규칙 | E | 공개=₩·개수 필드 부재 / 본인=개수만 / 환전=₩ 등장 |
| CLV-7 | KYC 미완 환전 시도 | E | KycSheet, 미완 시 차단 |
| CLV-8 | 원천징수 지급명세 생성 | I | 3.3% 계산·기록(국세청 제출 근거) |
| CLV-9 | 최소환전 30,000원 경계(29,999 vs 30,000) | I | 29,999=대기 / 30,000=진행 |

## 3. 🔴 정책 4건 (🔒 회장 확정값 2026-07-04)
| # | 케이스 | 기대 |
|---|---|---|
| POL-1(P2) | 미성년(is_adult=false) **환전** | 차단·안내. **결제는 통과** |
| POL-1b(P2) | 성인(만19+) 환전 | KYC 통과 → 진행 |
| POL-2(P3) | 환전 전 환불 문의 | 문의 경로 노출 → (운영자 토스 콘솔 수동취소 + REFUND_REVERSAL 수기). **앱 내 자동환불 버튼 없음** |
| POL-2b(P3) | 환전 후 환불 요청 | 불가 안내(지급대행 완료) |
| POL-3(P4) | **셀프후원→환전 (동일 CI)** | ⚠️ ACCEPTED-RISK: **차단 안 함.** RiskHook=CLEAR로 통과(정상 환전). `hook exists, rule deferred` 확인 |
| POL-4(P4) | RiskHook 주입 지점 존재 | `CashoutService`가 RiskHook.evaluate 호출·NoOpRiskHook 빈 주입 확인(나중 룰 교체 가능) |

## 4. 🟠 ① 받는사람 플로우
| # | 케이스 | 유형 | 기대 |
|---|---|---|---|
| RCV-1 | write-first 목표생성 happy | E | draft→AuthSheet→G1 영속→slug 발급 |
| RCV-2 | 입력검증(빈값/과거D-day) | E | 인라인 에러·저장비활성 |
| RCV-3 | 로그인 취소→draft 보존 | E | localStorage 유지, 글 안 날아감 |
| RCV-4 | slug 충돌 | U | 재발급 |
| RCV-5 | 링크 복사 후 응원0 | E | EmptyState 가이드 |
| RCV-6 | 수신 알림(은은) | E | 배지, 답장 강요 없음 |
| RCV-7 | 누가 응원(익명 반영, 금액X) | E | SupporterList 익명/이름, ₩ 없음 |
| RCV-8 | 워드맵 재공유(이미지/스토리) | E | 이미지 렌더·스토리 링크스티커·share_event |
| RCV-9 | 목표 삭제 | E | 확인모달→DELETED, ②는 "종료된 목표" |

## 5. 🟠 ② 친구 목표페이지 (dead-end 0)
| # | 케이스 | 기대 |
|---|---|---|
| GP-1 | 비로그인 열람 | 전부 보임, 금액 없음 |
| GP-2 | empty(첫 방문자) | "당신이 첫 응원" EmptyState |
| GP-3 | 마감 목표(CLOSED) | 마감칩 + 응원 여전히 가능(적립형) |
| GP-4 | 비공개/삭제 목표 | "종료된 목표"+① 링크(빈 404 아님) |
| GP-5 | 잘못된 링크 | 친절한 404+홈 |
| GP-6 | 확산 "나도 만들래"→① | subtle 전환, onboarding 진입 |

## 6. 🟡 확산 루프 (양면 접합)
| # | 케이스 | 기대 |
|---|---|---|
| VIR-1 | 결제→워드맵 갱신→재공유→친구 ②유입 | 고리 닫힘, share_event 기록 |
| VIR-2 | ②완료→나도만들래→① 역할전환 | 신규 공급 생성 |

## 7. 🔴 RLS·서버리스 보안 (돈·유출 방어)
| # | 케이스 | 유형 | 기대 |
|---|---|---|---|
| SEC-1 | 게스트(anonymous) 토큰으로 환전/잔액 조회 | I | RLS·EF 거부(`is_anonymous` → cheer/confirm만) |
| SEC-2 | 공개 `goal_public` 뷰에 금액/개인정보 유출 | I | 없음(뷰에 컬럼 부재 = 3층 a) |
| SEC-3 | **클라이언트가 `payment`/`clover_ledger` 직접 write** | I | **RLS 거부**(service_role EF만). 원장 변조 불가 |
| SEC-4 | 타인 목표/잔액 read(auth.uid 불일치) | I | RLS 0행 반환 |
| SEC-5 | 계좌번호·CI 암호화 저장(pgcrypto) | U | bytea·평문 미노출 |
| SEC-6 | 토스 일반결제 웹훅 검증(`toss-webhook`) | I | 예측 불가능 경로 토큰 확인 + Toss Payment 조회 API 재검증; payload 불일치 거부(일반결제 웹훅은 공식 서명 헤더 없음) |
| SEC-7 | 멱등키 재사용(order_id UNIQUE) | I | 중복 처리 없음 |
| SEC-8 | 토스 secret이 브라우저 번들에 없음 | U | web 빌드 grep=0(EF env만) |
| SEC-9 | `payment` raw row 클라이언트 노출 | I | authenticated 직접 SELECT 차단, 영수증/문의는 EF·sanitized view로 별도 제공 |

## 7b. 🔴 데이터 리전·국외이전 (architecture §2.6)
| # | 케이스 | 기대 |
|---|---|---|
| REG-1 | 돈·KYC Edge Function 실행 리전 | `x-region: ap-northeast-2` 핀 확인(국외 엣지 실행 아님) |
| REG-2 | Supabase 프로젝트 리전 | ap-northeast-2(서울) |
| REG-3 | ⛔ KYC·금융 개인정보 국외이전 적법성 | **legal 확인 전 결제·환전 배포 불가**(§2.6 ⛔) |

## 7c. 🟠 신규 확정 결정 (로그인·간편결제·PASS·알림톡·신고·GA4)
| # | 케이스 | 유형 | 기대 |
|---|---|---|---|
| AUTH-1 | 카카오 로그인(커스텀 OAuth) | E | `auth-kakao` EF 토큰교환→Supabase 세션 발급 |
| AUTH-2 | 구글/애플 로그인(네이티브) | E | signInWithOAuth 세션 |
| PAY-M1 | 간편결제 카카오페이 | E | 결제위젯서 카카오페이 승인→DONE |
| PAY-M2 | 간편결제 네이버페이·토스페이 | E | 각 수단 승인 |
| KYC-1 | **PASS 만19+ 통과** | E | is_adult=true→환전 진행 |
| KYC-2 | PASS 미성년(만18) | E | 환전 차단·안내(결제는 통과) |
| ALT-1 | 응원 도착 알림톡(정보성) | I | `notify` EF 발송(SENT) |
| ALT-2 | 알림톡 발송 실패 | I | notification INAPP 폴백 |
| ALT-3 | 마케팅성 알림톡 금지 | U | 템플릿=정보성만(심사 통과 템플릿) |
| MOD-1 | 목표/메시지 신고 | E | report insert(게스트 가능) |
| MOD-2 | 수동 soft-delete 반영 | I | deleted_at set → ②·워드맵서 즉시 사라짐(물리삭제 X) |
| MOD-3 | soft-delete 후 원장 보존 | I | clover_ledger 불변(결제 이력 유지) |
| GA-1 | GA4 핵심 이벤트 발화 | I | goal_created·payment_success 등 gtag 전송 |
| SET-1 | 정산주기 표시(D+n) | E | 완료화면 "수일 내"(D+n=⛔ build 확정치 반영) |

## 8. 회귀/비기능
- 성능: ② 목표페이지 SSR LCP(콜드스타트 이탈 방지). 워드맵 렌더 지연 시 폴백.
- 접근성: 비로그인 열람·닫기 항상 가능(DESIGN §6 약자배려).
- 모션: confetti/과한 애니 없음(조용함, DESIGN §5-8 = design-review 항목).

---

## 판정 기준 (QA exit)
- 🔴 전항 PASS 없이는 배포 불가(돈·규제 무관용). **돈 코어(§1·2·3·7·7b)는 강한 모델 구현 + 코드리뷰 게이트 통과 후 QA**(§0 split).
- E2E는 실 토스 stage 키 + Supabase stage로 happy+edge 재현(mock PASS는 미검증, 헌법 §3). RLS 정책(SEC-3·4) = 클라 우회 시도로 실검증.
- 정책 4건 = 🔒 확정값(30,000/만19+/문의수동/차단안함) 반영 완료. legal 밑돌(architecture §2.4 자금 + §2.6 국외이전)은 결제·환전 QA 전 변호사·개인정보 자문 통과 확인.

## 셀프심문 (CoVe)
- **"빠진 엣지?"** → user-flow §1.2·§2.2 전 분기 + coverage.md 🟡(닫기·few·이중탭) 포함 확인. 갭 0.
- **"셀프후원 차단 안 하는데 POL-3 테스트가 왜 통과=정상 환전?"** → ACCEPTED-RISK. no-op 훅이 CLEAR 반환하는 게 정상 동작. 훅 주입지점(POL-4)만 검증해 나중 룰 활성화 회복성 확인. 회장 결정과 정합.
- **레드팀(QA 리드)**: "mock으로 결제 PASS 위장?" → §3 헌법·본 계획 명시 = 실 stage 키 강제. 방어.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음(테스트 계획 = 프로젝트 특정, document-generate는 코드 역생성용 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=user-flow(dead-end0)·fdd·api-contract 자매문서 · Supabase Edge Functions 로컬테스트/리전(WebSearch: supabase.com/docs/functions) · 헌법 §3(실키 prod-parity)
