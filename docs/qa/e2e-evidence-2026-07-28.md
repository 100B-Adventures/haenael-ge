<!-- STAMP: 2026-07-28 · opus-4-8 · 브라우저 E2E(claude-in-chrome) + prod psql 실측 · 근거=스크린샷+DB조회 · 고민: 실결제 최종클릭 자동화 한계를 정직히 분리 -->
# 해낼게 — 본인/친구 전체 flow E2E 증거 (2026-07-28)

> 회장 질문: "본인·친구 전체 flow(실결제 포함) 완전히 돌고 있냐, 근거파일 가져와."
> **직답: 친구 '돈 들어오는' flow는 실 Toss 승인까지 완주 증명됨. 본인 '돈 나가는(환전)' flow는 미구현(501 스텁)이라 전체가 완결은 아님. 실돈은 아직 테스트상점.**

## 증거 등급: [관찰됨] 직접 실행/화면 · [DB실측] prod psql · [불가] 기능없음/자동화한계

## 1. 친구(응원자) 결제 flow — 주문생성→Toss→승인→적립
| 단계 | 상태 | 증거 |
|---|---|---|
| /g/{slug} 친구뷰 렌더 + CTA "조용히 밀어줄게" 활성 | [관찰됨] | 브라우저 스크린샷(결제 스위치 ON) |
| 20클로버 자유금액 입력 → 옛 EF에서 "amountKrw must be 1000,3000,5000,10000" 에러 | [관찰됨] | 스크린샷(버그 재현) |
| 근본원인 = cheer-order EF만 옛 화이트리스트(RPC는 이미 언바운디드) | [DB실측] | create_cheer_order 정의에 `% 1000` 확인 |
| cheer-order EF 재배포 후 20클로버 → 에러없이 통과 | [관찰됨] | `supabase functions deploy cheer-order` + 재시도 스크린샷 |
| 주문 생성(cheer-order EF → create_cheer_order RPC) | [DB실측] | payment `hnl_e590fb80…` 20,000원 READY / cheer PENDING "E2E검증"·"결제플로우E2E테스트해낼게"·20클로버 |
| Toss 결제창 렌더(상품명·20,000원·카카오페이 포함·테스트배너) | [관찰됨] | 스크린샷 |
| Toss 승인 → confirm_cheer_payment → payment DONE + cheer CONFIRMED + ledger EARN | [DB실측] | **DONE 결제 3건 전부 payment_key 보유(진짜 Toss)·approved_at·EARN ledger 3건. 07-20·07-26 실 완주 이력.** |
| 오늘 테스트상점 최종 카드승인 클릭 | [불가] | Toss 테스트창 최종 '결제하기'가 자동화 모달에서 미노출(실사용자는 탭 가능). confirm→ledger는 위 3건으로 증명됨 |

## 2. 본인(받는사람) flow
| 단계 | 상태 | 증거 |
|---|---|---|
| 카카오 로그인 | [관찰됨] 과거 | member 1건(조성진/kakao), 07-17 실왕복 검증 |
| 목표 작성 | [DB실측] | goal 1건 ACTIVE |
| 목표 편집(이름·D-day·why) | [근거확인] | update_goal RPC prod 적용(SECDEF), GoalEditSheet 배포. ⚠️브라우저 저장 클릭 E2E 미실행 |
| 워드맵·응원목록·응원시각 | [관찰됨] | /me·/g 렌더 확인 |
| 환전 페이지 진입(미달도) | [관찰됨] | early-return 제거 배포 |
| **환전 실지급(돈 나가기)** | **[불가]** | **cashout/cashout-payout EF = 501 스텁. KYC·PASS·ledger HOLD·지급대행 전부 미구현. = 본인 flow 미완결의 핵심** |

## 3. 종합 판정
- **친구 돈-들어오기 루프**: 실 Toss 승인·적립까지 **완주 증명**(3건 DB실측). 자유금액 버그도 오늘 수정·재증명.
- **본인 돈-나가기(환전)**: **미구현(501)**. 따라서 "본인+친구 전체 flow 완전히 돈다"는 **아직 아님** — 환전이 빈다.
- **실돈**: 현재 테스트상점 키. 실돈 = Toss 실 상점 심사(회장 콘솔) 필요.

## 4. 미검증·결함 (정직)
- [불가] 환전 백엔드(501) — 구현 필요(트랙2).
- [관찰됨] /g/{slug} 간헐 404 — SSR/goal_public 간헐실패, 조사 필요.
- [미검증] 목표 편집 저장 클릭 실 E2E, 결제 최종 카드승인 자동화.
- [근거확인] toss-webhook TS2322·auth-kakao TS2353 타입에러(직접 deno check).

## SOURCES / MODEL
- MODEL: opus-4-8 (컨트롤러 직접 브라우저 E2E + prod psql)
- 스크린샷: claude-in-chrome 세션(20클로버 에러→수정→Toss 20,000원)
- DB: prod psql (payment/cheer/clover_ledger 실측)
- 코드: cheer-order/index.ts, 20260721000000_cheer_amount_unbounded.sql, cashout/index.ts(501)
