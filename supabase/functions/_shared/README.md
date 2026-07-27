# EF 공통 모듈

여러 Edge Function이 공유하는 유틸·타입·CORS 설정.

## 파일 목록

| 파일 | 역할 |
|---|---|
| `region.ts` | `withRegionHeader` — 응답에 `x-region` 헤더 추가 (디버깅용) |
| `oauth-kakao.ts` | 카카오 OAuth 토큰 교환·사용자 정보 조회 유틸 |
| `toss.ts` | 토스페이먼츠 API 클라이언트 (서버 승인·취소·결제 조회) |
| `alimtalk.ts` | 카카오 알림톡 발송 유틸 (정보성 메시지 전용) |
| `ledger.ts` | 원장(ledger) EARN·HOLD·REVERSAL·SETTLED 트랜잭션 헬퍼 |
| `idempotency.ts` | 멱등키(idempotency key) 검증·저장 헬퍼 |
| `risk.ts` | 리스크 훅 (MVP: noOp, 추후 실구현) |
| `pass.ts` | PASS 본인인증 유틸 (KYC 게이트) |
| `payout.ts` | 지급대행 호출 유틸 |
| `withholding.ts` | 원천징수 계산 유틸 |

## 사용법

Deno import (절대경로로 폴더 밖 참조):

```ts
import { withRegionHeader } from "../_shared/region.ts";
import { TossClient } from "../_shared/toss.ts";
```
