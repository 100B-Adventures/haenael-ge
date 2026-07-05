-- =============================================================================
-- service_role_grants — service_role 테이블 권한 추가
-- =============================================================================
-- 배경: Supabase Edge Function 은 service_role 키로 createClient 를 생성한다.
--   service_role 은 rolbypassrls=true 로 RLS 를 우회하지만,
--   PostgREST 경유 시 테이블 수준 GRANT 가 없으면 "permission denied" 가 발생한다.
--   슬라이스 #3 auth-kakao EF 가 member 테이블에 INSERT 해야 하므로 패치.
--
-- 규칙: service_role 은 돈 테이블(clover_ledger)에 대해 INSERT 만(append-only 보존).
-- =============================================================================

-- ── 사용자·목표 (EF: auth-kakao)
GRANT SELECT, INSERT, UPDATE ON member TO service_role;
GRANT SELECT, INSERT, UPDATE ON goal TO service_role;
GRANT SELECT ON goal_public TO service_role;

-- ── 응원·결제 (EF: cheer-order, toss-confirm, toss-webhook)
GRANT SELECT, INSERT, UPDATE ON cheer TO service_role;
GRANT SELECT, INSERT, UPDATE ON payment TO service_role;
GRANT SELECT, INSERT ON payment_log TO service_role;

-- ── 클로버 원장·잔액 (EF: toss-confirm ledger.ts)
--   원장은 INSERT 만(append-only 원칙), DELETE 는 의도적으로 부여 안 함.
GRANT SELECT, INSERT ON clover_ledger TO service_role;
GRANT SELECT, INSERT, UPDATE ON clover_balance TO service_role;

-- ── 환전·KYC (EF: cashout, cashout-payout, kyc-verify)
GRANT SELECT, INSERT, UPDATE ON cashout_request TO service_role;
GRANT SELECT, INSERT, UPDATE ON kyc_verification TO service_role;

-- ── 알림·공유·신고·이상거래 (EF: notify, wordmap-render, report)
GRANT SELECT, INSERT, UPDATE ON notification TO service_role;
GRANT SELECT, INSERT ON share_event TO service_role;
GRANT SELECT, INSERT, UPDATE ON wordmap_render_cache TO service_role;
GRANT SELECT, INSERT, UPDATE ON report TO service_role;
GRANT SELECT, INSERT ON risk_event TO service_role;

-- ── 시퀀스 (GENERATED ALWAYS AS IDENTITY)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── 함수·RPC
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
