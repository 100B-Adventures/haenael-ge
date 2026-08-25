# Edge Functions (Supabase Deno 런타임)

각 폴더 = 하나의 서버리스 함수. 토스 결제·카카오 로그인·워드맵 렌더 등 서버 로직 전담.

## 함수 목록

| 폴더 | 역할 |
|---|---|
| `auth-kakao` | 카카오 OAuth 인가코드 → 액세스 토큰 교환 → Supabase Auth 세션 발급 |
| `wordmap-render` | 응원 메시지를 SVG 워드클라우드로 렌더링 → Storage 업로드 → URL 반환 |
| `notify` | 카카오 알림톡 발송(응원·환전 정보성) + 환전 신청 Slack 관리자 통지 |
| `report` | 목표·응원 메시지 신고 접수 → report 테이블 INSERT |
| `cheer-order` | 구현됨: 응원 주문 생성 (cheer=PENDING + payment READY) |
| `toss-confirm` | 구현됨: 토스 서버 승인 + payment DONE + cheer CONFIRMED + 원장 EARN, DB 반영 실패 보상 기록 |
| `toss-webhook` | 공유 URL 토큰 + Toss API 재조회 검증·상태 재동기·취소 원장 반전 |
| `cashout` | stub: 환전 요청 (최소 3만원·PASS 본인인증·리스크 훅·HOLD) |
| `cashout-payout` | stub: 지급대행 호출·SETTLED·지급명세·정산주기 D+n |
| `kyc-verify` | stub: PASS 본인인증·만19+·실명·CI 게이트 |
| `_shared` | 여러 함수가 공유하는 유틸·타입·CORS 설정 |

## 실행

```bash
# 로컬 서빙 (supabase start 선행)
supabase functions serve

# 특정 함수만
supabase functions serve auth-kakao

# 클라우드 배포. Toss는 외부 웹훅이므로 JWT 검증을 사용하지 않는다.
supabase functions deploy auth-kakao
supabase functions deploy toss-webhook --no-verify-jwt
```

## 시크릿 관리

실값은 `supabase/edge-functions-env.example` 참고. 설정은:

```bash
supabase secrets set KAKAO_CLIENT_ID=your-value
```

`notify`는 gateway JWT 검증 대신 `NOTIFY_INTERNAL_TOKEN`을 검증한다. 같은 32자
이상 무작위 값을 Supabase secret과 Vercel Production env var 양쪽에 등록한다.
일반 로그인 사용자 JWT만으로는 호출할 수 없다.

## 결제 배포 주의

- `cheer-order`와 `toss-confirm`은 `SUPABASE_SERVICE_ROLE_KEY`가 필요하다.
- `toss-confirm`은 `TOSS_SECRET_KEY`로 `POST /v1/payments/confirm`을 호출한다.
- 결제 RPC는 DB에서 `PUBLIC`, `anon`, `authenticated` 실행권한을 회수하고 `service_role`만 허용한다.
- 토스 승인 성공 후 DB 반영 실패 시 `record_payment_compensation`으로 `payment_log`를 남긴다. 자동 취소 성공은 `CANCELED`, 자동 취소 실패는 `FAILED` + `risk_event(PAYMENT_RECONCILE_REQUIRED)`다.
- `payment` raw row는 authenticated 직접 SELECT를 차단한다. 영수증/문의용 조회는 별도 sanitized 경로로 열어야 한다.
- `toss-webhook`은 `.../toss-webhook/<TOSS_WEBHOOK_TOKEN>` 경로 토큰 확인 후 Toss Payment 조회 API로 상태를 재검증한다. 일반결제 웹훅에는 서명 헤더가 없으므로 공식 권장 검증 방식을 따른다. 경로 토큰은 주기적으로 교체하고 접근 로그에서 마스킹한다.
- 환전/PASS는 비활성 상태이며 실돈 운영 범위에 포함하지 않는다.
