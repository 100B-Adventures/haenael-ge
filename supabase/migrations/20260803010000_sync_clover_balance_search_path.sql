-- =============================================================================
-- sync_clover_balance_search_path — 기존 운영 DB용 순방향 트리거 함수 보정
--
-- 20260728010000_cashout_manual_payout.sql이 이미 적용된 것으로 기록된 환경에서도
-- 이 함수 보정이 반드시 실행되도록 별도 migration으로 재선언한다.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_clover_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.clover_balance (member_id, clover_count, updated_at)
  VALUES (NEW.member_id, NEW.balance_after, pg_catalog.now())
  ON CONFLICT (member_id) DO UPDATE
    SET clover_count = EXCLUDED.clover_count,
        updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

COMMIT;
