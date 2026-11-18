# 해낼게 V2 앱 3채널 API 계약 v0.1.0

기반 포맷: `docs/eng-design/api-contract-social-viral-loop-web-first-v1.2.5.md`
STAMP: 2026-11-18 13:22 KST, GPT-5 Codex, code-builder, haenael-supabase-build. 근거는 FDD 앱 채널판과 현재 Supabase 계약이다.

## 공통 규칙

- 인증: 모바일·웹은 Supabase JWT, 앱인토스는 토스 authorization code를 서버에서 교환한 Supabase JWT.
- 성공 응답은 `data`, 실패 응답은 `{ "error": { "code": "stable_code" } }`다. 공급사 원문과 내부 메시지는 노출하지 않는다.
- 일반 쓰기는 `request_key` 8~128자와 서버 유일키로 멱등 처리한다. 계정 삭제만 예외이며, JWT `sub`와 회원당 1행인 서버 작업을 재개 키로 사용해 클라이언트 요청 키를 받지 않는다.
- 금액·상품·수취인·상점·환경은 서버가 재검증한다.

## POST RPC `create_store_purchase_intent`

인증 회원이 결제창을 열기 직전 `goal_id`, `provider`, `product_id`, `clover_amount`, `request_key`를 보낸다. 서버는 자기 응원을 거부하고 `intent_id`, `account_binding`, `expires_at`을 반환한다. Apple은 `account_binding`을 `appAccountToken`, Google은 `obfuscatedExternalAccountId`로 사용한다. intent는 30분, 1회용이다.

## POST `/functions/v1/verify-store-purchase`

요청:

```json
{
  "provider": "APPLE|GOOGLE_PLAY|TOSS_IAP",
  "intent_id": "uuid",
  "product_id": "haenael.cheer.clover.3",
  "provider_transaction_id": "opaque",
  "receipt": "opaque",
  "goal_id": 123,
  "message": "선택",
  "anonymous": false,
  "request_key": "uuid"
}
```

응답 `201|200`:

```json
{
  "data": {
    "purchase_id": 42,
    "status": "CREDITED",
    "cheer_id": 91,
    "clover_amount": 3,
    "available_at": "2026-12-18T04:22:00Z",
    "is_replay": false
  }
}
```

오류: `invalid_product`, `invalid_receipt`, `transaction_owner_mismatch`, `transaction_environment_mismatch`, `goal_not_found`, `self_support_forbidden`, `verification_pending`, `provider_unavailable`. 같은 거래와 다른 목표·상품의 조합은 `409 transaction_binding_mismatch`다.

검증 필드 전량:

| 공급자 | 서명·서버 재조회 | intent 대조 |
|---|---|---|
| Apple | Notification/JWS chain, bundle ID, product ID, environment, quantity, purchase date, revocation date, transaction reason | `appAccountToken == account_binding` |
| Google Play | Developer API purchase state·acknowledgement, package, product, quantity, purchase time, region | `obfuscatedExternalAccountId == account_binding` |
| Toss IAP | 토스 서명 구매 상태, 상품, 수량, 구매자 식별자 | 구매자 식별자→`member(provider='TOSS')`가 intent 회원과 동일 |

검증이 성공해도 `app_channel_release_gate`의 해당 sandbox/production 플래그가 OFF면 `503 channel_release_disabled`이며 적립 0이다.

## POST `/functions/v1/confirm-alternative-payment`

Android 한국 사용자 선택 결제의 토스 승인 결과만 받는다. 요청은 `intent_id`, `account_binding`, `payment_key`, `order_id`, `external_transaction_token`, `request_key`다. `goal_id`, `product_id`, 회원은 요청에서 받지 않고 intent에서 파생한다. 서버가 Google 외부결제 토큰의 계정 결합값, 토스 승인 회원·주문 상품·금액을 intent와 대조한다. `provider=GOOGLE_ALTERNATIVE`의 sandbox/production release gate는 `credit_store_purchase` 트랜잭션 안에서 검사하며 OFF면 `503 channel_release_disabled`, 적립 0건이다. 응답 필드는 구매 확인과 같고 `report_status: PENDING|REPORTED`를 추가한다. 외부 거래 토큰 누락은 적립 전 `422 external_transaction_token_required`다. 소비는 `UPDATE store_purchase_intent SET status='CONSUMED', consumed_at=now() WHERE id=:id AND status='CREATED' AND expires_at>now()`의 영향 행 1건으로만 성공한다.

공급자 호출 직전 `begin_alternative_payment_confirmation`이 `member_settlement:<member_id>` transaction advisory lock을 잡고 삭제 작업이 없는지 다시 검사한 뒤 `alternative_payment_confirmation(status=CONFIRMING)`을 만든다. 이 행이 있으면 intent 만료 뒤에도 미종결 결제로 취급한다. 적립 성공은 같은 잠금 안에서 `CREDITED`, 승인되지 않았음이 확정되면 `CANCELED`, 공급자 결과가 불명확하면 `RECONCILIATION_REQUIRED`, 승인 뒤 적립·취소가 모두 실패하면 `RECOVERY_REQUIRED`로 전이한다. 계정 삭제가 `REQUESTED` 이상이면 새 공급자 확인을 시작하지 않는다.

보고 레코드는 `external_transaction_id`, 암호화 token, 거래시각, 세전액, 세액, 사용자 과세 지역, API 버전, `report_due_at`, `next_attempt_at`, Google 결과 상태를 가진다. 24시간 안 `REPORTED`가 아니면 경보하며 영구 실패는 `PERMANENT_FAILURE`로 격리한다. 환불도 ExternalTransaction API에 별도 보고한다. 프로그램 등록과 API 버전은 제출 전 콘솔에서 다시 핀한다.

## POST `/functions/v1/prepare-alternative-checkout`

요청은 `intent_id`, `account_binding`, `request_key`, 앱 딥링크 `return_url`이다. 금액·상품·주문 ID는 받지 않는다. JWT 회원, 구매 intent 회원, 계정 결합값과 멱등키를 대조한 뒤 256비트 일회성 `checkout_token`과 만료시각만 반환한다. DB에는 token SHA-256, 서버 생성 주문 ID, intent 참조를 저장하며 금액은 저장하지 않는다.

## GET `/api/mobile/toss-checkout?checkout_token=...`

운영 URL은 Vercel Production 별칭 `https://haenael-ge.vercel.app/api/mobile/toss-checkout`이다. Vercel 서버가 일회성 token SHA-256으로 세션을 찾고, `store_purchase_intent`와 `store_product_catalog`에서 상품·수량·1클로버당 1,100원 금액·계정 결합 metadata를 다시 계산한다. 유효한 세션만 Toss Payments 결제창을 열며 쿼리의 금액·상품·계정 값은 읽지 않는다. Toss success/fail callback은 같은 서버의 `/api/mobile/toss-checkout/return`이 주문 ID와 금액을 재대조한 뒤 앱 딥링크로 전달한다.

토스 승인 성공 뒤 앱은 `intent_id`, `account_binding`, `payment_key`, `order_id`, Google 외부 거래 token, `request_key`를 SecureStore 미완료 큐에 먼저 저장한다. `confirm-alternative-payment` 성공 응답을 받을 때만 항목별로 제거한다. 큐 쓰기는 앱 프로세스 안에서 직렬화하고 성공 뒤 최신 큐를 다시 읽으므로 복구 중 추가된 결제를 과거 스냅샷으로 덮지 않는다. 앱 시작 시 같은 요청을 재전송하며 새로운 주문이나 멱등키를 만들지 않는다.

토스 승인 뒤 적립과 전액 취소가 모두 실패하면 `record_alternative_payment_recovery`가 같은 회원 잠금 안에서 결제 확인 작업을 다시 검사하고 `store_recovery_case(status=OPEN)`, `store_purchase_event(event_type=PAYMENT_COMPENSATION_FAILED)`, 확인 상태 `RECOVERY_REQUIRED`를 한 트랜잭션으로 기록한다. intent 만료 여부와 무관하게 `CONFIRMING|RECONCILIATION_REQUIRED|RECOVERY_REQUIRED` 확인 작업 또는 OPEN 복구 건이 있으면 계정 삭제는 `BLOCKED_PENDING_PAYMENT`에 머문다.

## POST `/functions/v1/google-external-transaction-report`

pg_cron이 10분마다 내부 토큰으로 호출한다. `claim_google_external_transaction_batch`가 `FOR UPDATE SKIP LOCKED`로 만료되지 않은 `PENDING` 행을 한 worker에만 임대하고, worker는 암호화된 외부 거래 토큰을 메모리에서만 복호화해 Google `externaltransactions.createexternaltransaction`을 호출한다. HTTP 409는 같은 `external_transaction_id`를 GET으로 재확인해 멱등 성공으로 처리한다. 성공은 `REPORTED`, 재시도 가능한 실패는 지수 백오프, 잘못된 요청은 `PERMANENT_FAILURE`다. `report_due_at`을 넘긴 실패는 `ops_event`에 기록한다. 토큰 원문은 DB·로그·응답에 쓰지 않는다.

## POST `/functions/v1/store-refund-webhook`

공급자 서명 검증 전 DB 쓰기 0건. Apple은 Notification V2 `signedPayload` JWS chain, Google은 Pub/Sub push OIDC 토큰을 검증한 RTDN 뒤 Developer API를 재조회하고, Toss 계열은 서명 이벤트와 구매 상태 조회를 거친다. 정규화 이벤트는 `provider_event_id`, `provider_transaction_id`, `refund_transaction_id`, `refund_amount_minor`, `refund_clover_amount`, `currency`, `refund_scope=FULL|PARTIAL`, `occurred_at`, `normalization_status=VERIFIED|REJECTED|RETRY`, `payload_hash`를 가진다. 이벤트 유일키로 멱등 처리한다. 누적 환불액과 누적 환불 수량은 원 구매를 넘을 수 없고, 클로버 회수량은 금액으로 계산하지 않고 공급자가 확정한 수량만 사용한다. `CREDITED` 거래는 보류분 상쇄, 가용 잔액 회수, 부족 시 회수 큐 순서로 처리한다. 전액 환불일 때만 구매 상태를 `REFUNDED`로, 부분환불은 `PARTIALLY_REFUNDED`로 둔다. 일일 재동기화 작업은 `store_purchase.id` cursor로 대상 구매를 끝까지 순회해 누락 알림을 복구한다.

## POST `/functions/v1/register-push-token`

요청은 `platform`, `expo_push_token`, `device_id`, `request_key`. 자기 회원 토큰만 upsert한다. 로그아웃·탈퇴는 `DELETE`로 폐기한다. `account-delete`가 Auth 사용자와 푸시 토큰을 이미 삭제한 뒤 모바일 클라이언트가 보내는 마지막 `DELETE`는 다른 행을 변경하지 않고 멱등 성공으로 응답한다. 알림 본문에는 금액과 클로버 수를 넣지 않는다.

## POST `/functions/v1/account-delete`

요청 본문에는 회원 ID와 멱등키가 없다. 서버는 JWT `sub`로 `account_deletion_job`을 찾거나 만들며 `member_id` 기본키로 회원당 한 행만 유지한다. 상태는 `REQUESTED → BLOCKED_PENDING_PAYMENT → REQUESTED → EXTERNAL_REVOKED → DATA_DELETED → AUTH_DELETED`다. 앱 재설치·기기 변경·클라이언트 저장소 유실과 무관하게 같은 JWT 회원의 서버 작업을 재개한다.

`request_account_deletion`, `mark_account_deletion_external_revoked`, `delete_account_data`, `complete_account_deletion_auth`는 모두 `member_settlement:<member_id>` transaction advisory lock 안에서 현재 작업 상태와 다음 항목을 다시 검사한다.

- 클로버 잔액이 0이 아니면 `409 account_balance_remaining`.
- `REQUESTED|KYC_PENDING|APPROVED|PAYOUT_SENT` 환전이 있으면 `409 cashout_in_progress`.
- 아직 release 또는 reverse되지 않은 `clover_maturity`, 진행 중 기프티콘, 미해결 구매 회수 건이 있으면 `409 account_settlement_pending`.

Apple 회원은 로그인 때 암호화 저장한 refresh token으로 `/auth/revoke`를 호출한다. 토큰이 없거나 Apple이 `invalid_grant`로 거절하면 데이터 변경 없이 `409 apple_reauthentication_required`를 반환한다. 같은 회원 Apple OAuth가 새 폐기용 token을 등록하고 폐기가 성공한 뒤에만 `EXTERNAL_REVOKED`로 전이한다. 네트워크·Apple 서버 오류는 `503 apple_token_revocation_pending`이며 `REQUESTED`에 머문다.

`EXTERNAL_REVOKED` 뒤 Storage 객체를 먼저 삭제한다. 그 다음 `delete_account_data`가 같은 회원 잠금 안에서 미종결 결제·OPEN 복구 건을 다시 검사하고, 생성 상태 intent 취소, 푸시 토큰 삭제, 목표·프로필·친구·알림 삭제 또는 비식별화와 `DATA_DELETED` 전이를 한 DB 트랜잭션으로 수행한다. 결제·적립·환전 원장은 법정 정산과 부정 사용 대응에 필요한 범위만 비식별 회원 키에 보존한다. 이후 서버 전용 `auth.admin.deleteUser(member_id)`를 호출하고 Auth 사용자 부재를 확인한 `complete_account_deletion_auth`가 `AUTH_DELETED`를 기록한다. 삭제 작업이 `REQUESTED` 이상이면 새 대체결제 확인은 거절된다.

성공은 `200 { "data": { "deleted": true, "status": "AUTH_DELETED" } }`다. 미종결 결제는 `409 account_settlement_pending`, Storage 실패는 `503 account_storage_cleanup_failed`, Auth 삭제 실패는 `503 account_auth_delete_failed`로 고정한다. 서비스 역할 키와 개인정보 원문은 응답·로그에 노출하지 않는다.

Apple OAuth 로그인에서 Supabase가 반환한 `provider_refresh_token`만 `/functions/v1/register-apple-revocation-token`으로 즉시 전송하고 서버가 AES-256-GCM 암호문으로 보관한다. 단기 access token은 저장하지 않는다. refresh token이 없거나 폐기 때 `invalid_grant`가 오면 반드시 사용자 재인증으로 돌아간다. 모바일 로컬 저장소에는 삭제를 시작한 회원 ID만 둔다. Apple 재인증 또는 일반 인증 상태 변경 뒤 현재 세션 회원 ID가 달라지면 이전 회원의 삭제 정보를 폐기하고 `account-delete`를 재호출하지 않는다.

## POST `/functions/v1/gift-exchange`

요청:

```json
{
  "catalog_item_id": "provider-stable-id",
  "clover_amount": 30,
  "phone_e164": "+82...",
  "request_key": "uuid"
}
```

공급자 기능 플래그 OFF 또는 계약 키 미설정은 `503 gift_provider_unavailable`이며 DB 쓰기 0건이다. 공급사 호출에는 해낼게 request key를 공급사 멱등키로 전달한다. 성공은 `202`와 `gift_exchange_id`, `status=PROVIDER_PENDING`, `masked_destination`을 반환한다. 타임아웃·5xx·연결 종료는 `PENDING_RECONCILIATION`이며 잠금을 유지한다. `GET provider-order-status`가 미발송을 확정한 경우만 `FAILED_CONFIRMED`로 바꾸고 잠금을 해제한다. 전화번호 원문은 암호화 저장하고 화면·로그에는 마스킹만 쓴다.

## GET·POST `/functions/v1/mobile-cashout`

GET은 JWT `sub`의 `clover_eligibility`와 서버의 `cashout_enabled`, `gift_exchange_enabled`를 반환한다. POST 요청은 `{ "clover_amount": 30, "bank_code": "004", "account_number": "숫자 계좌번호", "account_holder": "홍길동", "request_key": "8~128자" }`다. 계좌번호는 TLS 요청 본문에서만 받고 로그·응답에 쓰지 않으며, 기존 환전 RPC가 서버 키로 암호화·지문 처리한 값만 저장한다. 회원 ID는 받지 않고 JWT `sub`에서만 파생한다. 서버의 `CASHOUT_ENABLED`, `MOBILE_CASHOUT_ENABLED`, `MOBILE_CASHOUT_APPROVAL_REFERENCE`, 공통 `CASHOUT_ALLOWED_MEMBER_IDS`를 모두 통과해야 하며 하나라도 없으면 기본 거부한다. 응답 `200`은 `{ "data": { "cashout_request_id": 1, "status": "REQUESTED", "clover_amount": 30, "is_replay": false } }`다. 오류는 `cashout_channel_disabled`, `cashout_not_eligible`, `cashout_amount_invalid`, `cashout_account_invalid`, `request_key_conflict`, `cashout_in_progress`로 고정한다. DB 내부 잠금 순서는 기프티콘·환불과 동일하게 회원 advisory lock → `clover_balance FOR UPDATE`다. A14는 조회·제출 모두 이 endpoint만 사용하며 앱에서 service-role RPC 직접 호출은 금지한다.

## POST `/functions/v1/auth-toss`

토스 authorization code를 서버에서 교환하고 서명 회원 ID를 `member(provider='TOSS', provider_id)`에 유일 매핑한다. 기존 다른 provider 회원과 자동 병합하지 않는다. 명시적 계정 연결 전에는 별도 회원이며, purchase 검증의 토스 구매자 ID도 같은 매핑을 사용한다.

## RPC `clover_eligibility(uuid)` 확장

기존 필드 뒤에 `maturity_locked_amount integer`, `gift_locked_amount integer`, `next_maturity_at timestamptz`를 추가한다. `payable_amount = max(total - welcome - cashout_locked - maturity_locked - gift_locked, 0)`. 권한과 서버 전용 판정 원칙은 유지한다.

## 상품 카탈로그

서버 상수는 채널별 상품 ID, 클로버 수, 통화, 기대 금액, 환전 보류일을 소유한다. 클라이언트 표시 금액은 스토어 조회 결과를 쓰고 서버 정합성 판정에는 쓰지 않는다.

## 보안·관측

영수증·결제키·서비스 계정 값은 로그 금지. 로그 허용 필드는 내부 구매 ID, 공급자, 상태, 처리 시간, 오류 코드, 거래 ID 해시다. 공급자 장애는 502/503으로 분리한다. 재시도 가능 여부는 HTTP 상태와 오류 코드 표가 소유한다.

## 오픈 이슈·개정

- 스토어 프로그램 등록과 production API version은 제출 전 콘솔에서 핀한다.
- Apple·앱인토스 정책 충돌은 production gate OFF로 격리한다.
- v0.1.0-retake1: 독립 리뷰의 구매자 결합, D-047, Google 보고, 환불 정규화, Toss identity, 기프티콘 재조정 반영.
- v0.1.0-retake2: 대체결제 intent·account binding·release gate, 부분환불 정규화 필드, mobile-cashout 안정 계약 보강.
- v0.1.0-retake4: 회원당 서버 삭제 작업, 공통 회원 정산 잠금, Apple refresh token 전용 폐기, 세션 교체 격리를 반영.

RUBRIC_SCORE: 독립 리뷰 재검수 대기
WEAKEST_LINE: 외부 공급자별 실제 응답 스키마는 sandbox 계정 등록 뒤 fixture로 고정해야 한다.

SKILLS_USED: haenael-supabase-build, 서버 검증과 멱등·실패 닫힘 계약에 적용
SKILLS_SKIPPED: 없음
SOURCES/MODEL: GPT-5 Codex. FDD 앱 채널판, 현재 Supabase 결제·환전 코드, Apple·Google·Toss 공식 문서
