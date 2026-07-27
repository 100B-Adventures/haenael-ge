# FDD — 해낼게 (haenael-ge) v0.1.0 (기능요구 상세)

> eng-design 산출물. PRD F1~F6을 **입력·출력·상태·예외**로 개발자가 그대로 구현하게 상세화 + **미뤄둔 정책 4건 기술설계**.
> 진실원: PRD `v0.2.0` · user-flow · DESIGN.md · architecture.md · api-contract.md. 상호참조로 중복 최소화.
> 스코프: MVP만. pledge(F4)·admin·달성흐름 = 확장점만(잠긴 스코프).
> 🔒 스택(2026-07-04): 서버리스 — Next.js/Vercel + Supabase(Postgres/Auth/RLS/Storage) + Edge Functions(돈 로직). 엔드포인트 표기(A/G/C/P/K)는 api-contract §2 카탈로그(RLS 직접쿼리 or Edge Function) 참조.

---

## F1 — 목표 선언(액자) · write-first

| 항목 | 내용 |
|---|---|
| 입력 | title("○○ 해낼게", 필수 ≤40자), reason(왜, 필수 ≤200자), dueDate(D-day, 필수·미래) |
| 처리 | write-first: 입력은 **로컬 draft**(localStorage). "저장" 시 AuthSheet(A1) → 인증 후 G1로 영속. slug 자동발급(충돌 재시도) |
| 출력 | goal + slug(`/g/{slug}`) → ShareLinkCard |
| 상태 | goal.status: ACTIVE→CLOSED(D-day 경과, 적립형=응원 지속)→DELETED |
| 예외 | 빈값/과거일정=인라인 검증 저장비활성(클라)+G1 400. 로그인 취소=draft 유지·재시도. slug 충돌=재발급 |
| 엔드포인트 | G1, A1 · 테이블 goal, member |
| 규칙 | 매일 인증 강제 X(진행 업데이트는 선택, ProgressUpdate). DESIGN §5-9 habit숙제 금지 |

## F2 — 조용한 응원 결제(하트/클로버)

| 항목 | 내용 |
|---|---|
| 입력 | goalId, cloverAmount(최소 1,000원=클로버1, 커피값 앵커 3·5·10천+직접), message?(≤140, 선택·비동기), isAnonymous(응원자 선택) |
| 처리 | ① C1: cheer=PENDING + payment 주문(orderId) 발급 → ② 토스 결제위젯(게스트=ANONYMOUS, **간편결제: 카드·카카오페이·네이버페이·토스페이**) → ③ successUrl → P1 **서버승인(멱등)** → payment=DONE, cheer=CONFIRMED, clover_ledger EARN(+N), **알림톡 발송(N2)** |
| 출력 | ConfirmToast("도경이에게 조용히 닿았어요") + 워드맵 반영(익명선택 반영). **금액 비노출**(공개 응답 goal_public 뷰에 ₩·개수 필드 없음) |
| 상태 | payment: READY→DONE/FAILED/CANCELED. cheer: PENDING→CONFIRMED/REFUNDED |
| 예외 | 실패(PG거절/한도/네트워크)=ErrorState 재시도/다른수단. 이중탭=order_id UNIQUE+버튼잠금 멱등. 시트닫음=페이지복귀 손실0. 처리중=spinner·닫기잠금(침묵금지) |
| 엔드포인트 | A2,C1,P1,P2,N2 · 테이블 payment,cheer,payment_log,clover_ledger,notification |
| 규칙 | 로그인 최소(게스트 허용). 감사답장 의무 X. 금액 기본값 낮게(다크패턴 금지, DESIGN §5-4). 🔒 간편결제 켬 |

## F3 — 응원 워드맵

| 항목 | 내용 |
|---|---|
| 입력 | goalId |
| 처리 | cheer(message not null) 집계(RLS RPC `get_wordmap`) → 단어·빈도 read-model. 재공유 시 G6 Edge Function `wordmap-render` → **Supabase Storage** 이미지 |
| 출력 | Wordmap(size/weight/opacity 다정함) + CheerCount("N명이 응원", **금액 X**) + 공유 imageUrl |
| 상태 | empty(0)·few(1~5)·many |
| 예외 | empty=EmptyState 초대 카피(콜드스타트 윤활). 렌더 실패=재시도, 텍스트 폴백 |
| 엔드포인트 | G5,G6,S1 · 테이블 cheer,wordmap_render_cache,share_event |
| 규칙 | 개별 후원 금액 절대 X, "익명의 누군가"만. 재공유=아이콘(이미지/스토리 링크스티커/링크복사), 텍스트버튼 X |

## F4 — 마일스톤 pledge (⛔ MVP 스코프 밖 — 확장점만)
- **설계 안 함.** cheer에 조건부 서브타입(달성조건·홀드) 붙일 **확장 자리**만: clover_ledger에 `PLEDGE_HOLD` entry_type 여지, cheer에 pledge FK 여지. 데이터모델이 phase2 pledge를 막지 않음(architecture §4). 재검토=시장검증 후.

## F5 — 적립 & 환전(cash-out)

| 항목 | 내용 |
|---|---|
| 입력 | cloverAmount, bank_code, account_no |
| 처리 | ① K1 잔액(개수만) → ② K2 견적(₩ 현실화: gross=클로버환산, fee=take-rate, withholding=3.3%, net) → ③ **최소환전액 30,000원 검증(P1)** → ④ **PASS 통합본인인증·만19+ 게이트**(K4,P2) → ⑤ **riskHook(no-op, 항상 CLEAR — P4/ACCEPTED-RISK)** → ⑥ cashout_request + clover_ledger CASHOUT_HOLD → ⑦ **토스 지급대행(payout)**로 net 계좌직송(자금 무보유, architecture §2) → ⑧ CASHOUT_SETTLED + 지급명세 기록 (**정산주기 D+n=⛔ build**) |
| 출력 | 환전 완료·정산내역(₩는 cashout 플로우에서만) + **정산주기 안내("수일 내 입금", D+n=⛔)** |
| 상태 | cashout: REQUESTED→KYC_PENDING→APPROVED→PAYOUT_SENT→PAID/REJECTED/FAILED(→REVERSAL 원장복원) |
| 예외 | 미달(<30,000)=대기응답(막다른길 아님). PASS 미완/미성년=KycSheet·차단. payout 실패=CASHOUT_REVERSAL(홀드 복원) |
| 엔드포인트 | K1~K5(K4=PASS) · 테이블 cashout_request,kyc_verification(PASS),clover_ledger (risk_event=미사용, 훅자리만) |
| 규칙 | 적립형=달성 무관 환전(🔒). ₩는 환전에서만. 원천징수 지급명세 국세청 제출 의무자 가능성(P3) |

## F6 — linktree식 공유 링크
- 입력: 없음(G1 발급 slug). 출력: `/g/{slug}` 복사+"인스타 바이오 붙여넣기" 안내(ShareLinkCard). ② = 비로그인 열람(G2). 재공유=확산 고리(F3). 테이블 goal.slug, share_event.

## F7 — 신고·모더레이션 (🔒 MVP=신고+수동삭제)
| 항목 | 내용 |
|---|---|
| 입력 | target(GOAL/CHEER), target_id, reason |
| 처리 | R1 `report` insert(게스트도 가능) → 운영자 **수동 검토** → 대상 `goal`/`cheer` `deleted_at` set(soft-delete). RLS·goal_public 뷰·워드맵 집계가 `deleted_at IS NULL`만 노출 = 즉시 사라짐 |
| 출력 | 신고 접수 확인 toast. 삭제 시 ②·워드맵에서 제거 |
| 예외 | 중복신고=허용(status로 관리). 물리삭제 아님(감사·복구). 원장 불변(결제 이력 유지) |
| 엔드포인트 | R1,R2 · 테이블 report, goal/cheer.deleted_at |
| 규칙 | 🔒 사전 AI필터·admin UI = 나중(운영량 넘을 때). MVP=신고 버튼 + 수동 대응 |

## F8 — 로그인·인증 (🔒 카카오 primary)
- 로그인 = **카카오 primary**(+구글/애플). 카카오=Supabase 네이티브 미지원 → EF `auth-kakao`(토큰교환→세션). 구글/애플=네이티브. write-first(저장 시점 로그인). 게스트=anonymous(결제용). PASS 본인인증(F5)은 로그인과 **별개**(환전 게이트만).

## F9 — 알림 (🔒 카카오 알림톡 정보성)
- 응원 도착 등 **정보성** 알림 = EF `notify` → 카카오 알림톡(`_shared/alimtalk.ts`). 발송 실패 시 인앱(notification) 폴백. ⚠️ 의존성=비즈채널+템플릿 사전심사+건당비+**정보성만(마케팅 금지)**. "조용함"=빈도 최소.

## F10 — 분석 (🔒 GA4)
- web(Next.js) gtag 수집. **directive: 수집=앱(web) / 분석=MARKETING 중앙 테넌트.** 핵심 이벤트: `goal_created`·`cheer_started`·`payment_success`·`wordmap_shared`·`cashout_requested`·`report_submitted`(콜드스타트 전환 실측).

---

## 🔧 정책 4건 — 🔒 회장 확정 (2026-07-04)

> user-flow §5·coverage.md ⛔였던 4건 = **회장 소크라테스 세션으로 수치 확정.** 화면·엔드포인트·컬럼 자리 확보(매핑됨) + 아래 확정값으로 구현. 법률 밑돌(선불수단/개인정산)만 architecture §2.4 ⛔로 잔존.

### P1 — 최소환전액 = **30,000원** 🔒
- **확정: 30,000원(클로버 30개).** 근거: (a) 투네이션 4만원 미만 정산 유예 패턴(소액환전 역마진 방지) (b) 별풍선류 최소환전 관행 (c) 원천징수 3.3%·take-rate 후 net 유의미 하한 (d) 커피값 5천×6건≈3만 = "모이면" 서사 정합.
- 설계: Edge Function `cashout`(`_shared/withholding.ts`)에서 `clover_amount < 30,000` → 대기응답(CashoutWaitState). 상수(env/설정값, 조정 가능).

### P2 — 미성년 = **환전만 만19+ KYC 게이트, 결제는 허용** 🔒
- **확정: 환전은 본인인증 만 19+만. 미성년 결제(응원)는 허용**(법정대리인 동의는 PG/카드사 레벨 표준 준용). 근거: risks #7(미성년 후원소득 세무 복잡), 별풍선류 환전 성인 제한 관행.
- 설계: K4 KYC에서 birth_date→is_adult. `is_adult=false` → 환전 **차단(안내)**, 결제는 통과. kyc_verification.is_adult 컬럼·KycSheet 연령 자리 사용.

### P3 — 환불 = **문의 기반 수동** 🔒 (자동환불 시스템 X)
- **확정: 자동환불 시스템 개발 안 함.** 결제 후 취소 = 영수증 "문의" 경로(CS) → 운영자가 **토스 콘솔에서 수동 취소** + (필요 시) `clover_ledger REFUND_REVERSAL` 수기 반영. 앱 내 자동환불 버튼·플로우 없음.
- 설계: C2 receipt에 문의 경로만. **환전 이후 환불 불가**(이미 지급대행 완료). MVP는 문의 경로 + 수동 대응으로 감당(admin 스코프 밖과 정합).
- ⚠️ 잔여: 전자상거래법 청약철회 강행규정 적용 여부는 결제 켜기 전 변호사 자문서 함께 확인(architecture §2.4 Legal 게이트에 병합).

### P4 — 셀프후원 차단 = **차단 안 함(ACCEPTED-RISK)** 🔒
- **확정: 셀프후원→환전 카드깡/자금세탁 별도 차단 로직 개발 안 함.** 자연억제(KYC + 최소환전 30,000원 + take-rate/원천징수 마찰 + **토스 자체 이상거래 모니터링**)에 의존.
- 설계: Edge Function `cashout`이 `_shared/risk.ts`의 **`riskHook()` 호출 + `noOpRiskHook`(항상 CLEAR)** 만 심는다(`hook exists, rule deferred`). 룰 구현은 **토스가 문제삼거나 규모 성장 시** 함수 교체로 활성화(재수술 X). architecture §2.5·design-patterns §8.
- ⚠️ 잔여 리스크(회장 인지): AML/카드깡 적발 시 책임·PG 계약 리스크. 수용 근거 = 초기 규모·1인 운영 대비 ROI + 토스 1차 방어.

---

## 셀프심문 (CoVe)
- **"F5 자금흐름이 틀렸다면?"** → 지급대행 개인지급 불가 or 클로버=선불수단 판정 시 붕괴 → architecture §2.4 ⛔로 방어(build 전 Legal 게이트). = 유일한 잔존 밑돌.
- **"정책 4건이 이제 확정인데 위험?"** → 회장 소크라테스 확정값(30,000/만19+/문의수동/차단안함). P4는 ACCEPTED-RISK로 회장 인지 명시 + no-op 훅으로 회복탄력 확보. 추측 아님.
- **레드팀(규제 감독관)**: "셀프후원 차단 안 하면 카드깡 소굴?" → 회장 수용 리스크. 자연억제 4중(KYC·최소환전·수수료·토스모니터링) + 훅자리로 즉시 대응 가능. 초기 규모 한정 합리.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음(기능요구 상세 = 프로젝트 특정, document-generate는 코드 역생성용 부적용)

SOURCES/MODEL: opus-4-8[1m] · 근거=PRD F1~F6·user-flow §1~5·DESIGN.md · 회장 확정 정책값·서버리스 스택(coordinator relay) · architecture.md/api-contract.md 자매문서
