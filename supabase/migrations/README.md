# DB 스키마 마이그레이션

파일명 순서대로 Postgres에 적용. `supabase db push` 로 로컬, `supabase db push --linked` 로 클라우드 적용.

## 파일 목록

| 파일 | 내용 |
|---|---|
| `20260705163137_init_schema.sql` | 초기 스키마 — member·goal·cheer·payment·notification·report 테이블 + RLS 정책 |
| `20260705170046_service_role_grants.sql` | Edge Function service_role 권한 부여 |
| `20260706000000_wordmap_storage.sql` | wordmap Storage 버킷 + 접근 정책 |
| `20260708000000_payment_rpc.sql` | 결제 주문/승인 RPC — payment·cheer·ledger 원자 전이 |
| `20260708001000_payment_rpc_qualify_columns.sql` | 결제 승인 RPC 컬럼 명시 보정 + payment_key 멱등 검증 |
| `20260710035000_payment_hardening.sql` | payment_key 유니크·DONE 멱등·amount 검증·수취자 잔액 직렬화 |
| `20260710042000_payment_compensation_audit.sql` | PG 승인 후 DB 반영 실패 보상 기록 + payment raw row 직접 SELECT 차단 |
| `20260710050000_payment_expiry_enum.sql` | payment_status_enum에 EXPIRED 추가 |
| `20260710051000_cheer_order_abuse_guard.sql` | cheer-order 남용 방지 — request_key 멱등 + customer_key/goal rate-limit + stale 정리 |
| `20260713180819_cheer_order_concurrency_fix.sql` | create_cheer_order 동시성 blocker 2건 수정 — advisory lock 기반 rate-limit 직렬화 + request_key INSERT ON CONFLICT 동시성 안전 |
| `20260714090000_lead_capture.sql` | 출시 리드 저장 테이블·RLS·service_role 권한 |
| `20260714110000_payment_webhook_reconciliation.sql` | Toss 승인·전액취소 웹훅 재조정과 원장 반전 |
| `20260714130000_release_review_fixes.sql` | 리드 IP 해시 제한·부분취소 검토 마커·멱등 리스크 이벤트 |
| `20261107010000_payment_conversion_claim.sql` | 결제 브라우저 전환 원자 claim. 웹훅 선확정 첫 callback 허용·이후 replay 차단 |
| `20261107020000_payment_conversion_delivery_lease.sql` | 영구 claim을 만료 가능한 pending lease로 교체. 브라우저는 ack하지 않고 stable event id로 at-least-once 재시도·provider dedupe |
| `20261126010000_welcome_cheer_notification.sql` | 본인의 최근 목표·웰컴 응원을 확인하고 목표당 1회만 알림 전달을 claim하는 표식·RPC |
| `20261126020000_goal_created_notification_type.sql` | 목표 등록 전용 `GOAL_CREATED` enum 비파괴 추가 + 닉네임·전화번호·목표 slug를 함께 반환하는 원자 claim RPC |
| `20261126090000_kakao_oauth_callback_claim.sql` | 카카오 authorization code SHA-256을 15분간 원자 claim해 중복 callback의 EF·세션 발급 경쟁 차단 |
| `20261126091000_restore_confirm_cheer_payment_service_role.sql` | 후속 함수 교체 뒤 누락된 결제 확정 RPC의 service_role 실행 권한 복원 |
| `20261126100000_member_analytics_consent.sql` | 회원별 분석 동의 상태와 선택 시각을 저장하고 본인 갱신 경계를 고정 |
| `20261126110000_friend_goal_message_and_avatar_alignment.sql` | 친구 대표 목표와 최근 응원 메시지를 같은 목표로 정렬하고 환영 응원 집계를 보정 |
| `20261126115000_member_profile_image_https.sql` | 기존 카카오 HTTP 프로필 URL을 비파괴 UPDATE로 HTTPS 승격 |
| `20261126120000_friend_received_recent_message_context.sql` | 친구가 보낸 최근 응원의 내 목표 제목·방향 맥락을 복원 |
| `20261126130000_friend_profile_welcome_and_auto_cover.sql` | 친구 프로필 소개·환영 응원 주인 집계·검증된 목표 사진 자동 공개 계약 추가 |
| `20261126140000_goal_cover_review_and_welcome_owner_counts.sql` | 오래된 목표 사진 검토 차단·관리자 내리기 정리·환영 응원 주인 화면 집계를 보강 |

## 명령어

```bash
# 로컬 DB에 미적용 마이그레이션 적용
supabase migration up --local

# 연결된 클라우드 프로젝트에 적용
supabase migration up --linked

# 새 마이그레이션 파일 생성
supabase migration new <이름>

# 현재 DB 상태와 비교 (diff)
supabase db diff
```

## 주의

- 파일명 앞 타임스탬프(YYYYMMDDHHmmss)가 적용 순서. 절대 변경 금지.
- 이미 클라우드에 적용된 파일은 수정하지 말고 새 마이그레이션을 추가한다.
