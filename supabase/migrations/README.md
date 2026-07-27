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
