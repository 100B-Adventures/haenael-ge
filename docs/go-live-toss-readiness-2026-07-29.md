<!-- STAMP: 2026-07-29 · opus-4-8 · 코드 실측(grep/bash -n) + 콘솔 실화면 · 근거=키무관 확인·kill switch 실측 · 고민: 실키 주입 전까지 비가역 스위치 안 당김 -->
# Toss 실결제 Go-Live 기술 준비 상태 (2026-07-29)

> 회장 지시: "실제키 기술 구현·준비해놓고 얘기해." → 실키 넣기 직전까지 전부 준비, 스위치는 미당김.

## 결론: 코드 변경 0. env 값 2개만 교체하면 라이브. (관찰됨)

## 준비 완료 항목 (검증됨)
| 항목 | 상태 | 근거 |
|---|---|---|
| 클라 키 = env에서만 로드(하드코딩X) | ✅ | CheerPaymentButton.tsx:142 `process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY` |
| 시크릿 = env에서만 로드 | ✅ | toss-confirm/index.ts:94 `Deno.env.get("TOSS_SECRET_KEY")` |
| API URL test/live 공통(키가 결정) | ✅ | toss.ts:33 `api.tosspayments.com/v1` (분기 없음) |
| test 문자열 하드코딩 잔존 | ✅ 없음 | grep 0건 → 키 교체만으로 전환 |
| 자유금액(20클로버 등) 검증 | ✅ | cheer-order EF 재배포 완료(% 1000, ≤1억) |
| 결제 kill switch PAYMENTS_ENABLED | ✅ true | Supabase 실측(SHA256 "true") |
| 라이브 키 실재 | ✅ | 정성컴퍼니 상점 live_ck_(MID zeroon1zvn)·live_sk_ 콘솔 확인 |
| 주입 스크립트(값 노출 없이) | ✅ | scratchpad/go-live-toss.sh (bash -n 통과) |

## 실키 전환 = 딱 2개 값 교체 (스위치)
1. `NEXT_PUBLIC_TOSS_CLIENT_KEY` (Vercel) → `live_ck_DnyRpQWGrND2ZEmW2Mxe3Kwv1M9E` (공개키, MID zeroon1zvn)
2. `TOSS_SECRET_KEY` (Supabase) → `live_sk_...` (시크릿, 콘솔 '보기'로만 확인, 채팅 미노출)
→ scratchpad/go-live-toss.sh가 Keychain 백업+양쪽 주입+재배포까지 자동. 실행 후 컨트롤러가 실 카드 소액 E2E로 검증.

## 전환 순간의 비가역성 (회장 인지)
- 교체 즉시 **실유저 실 카드 결제 청구** 시작(PAYMENTS_ENABLED 이미 true).
- 환전(OUT)은 501 스텁 → 당분간 **회장 수동 정산** or Toss **지급대행 신청**(옵션A, 자금무보유).
- 잔존 자문: "클로버=선불전자지급수단?" 변호사 1회(옵션A 게이트, risks.md#1).

## 남은 실행
- [회장] "켜라" + 시크릿 전달방식 → [컨트롤러] go-live-toss.sh 실행·검증(실결제 E2E DONE).
- [회장] (자동환전 원할 시) Toss 전자결제+지급대행 신청.
- [회장/변호사] 클로버 선불수단 여부 자문.

## SOURCES / MODEL
- MODEL opus-4-8 · 코드 grep·bash -n·Toss 콘솔 실화면·Supabase secrets 실측
