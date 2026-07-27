-- =============================================================================
-- admin_readonly — 회장 계정 allowlist 기반 읽기전용 관리자 RPC
--
-- 보안 경계:
--   - web은 anon key + 로그인 사용자의 JWT만 사용한다.
--   - admin_member는 RLS를 켜고 정책을 두지 않아 일반 쿼리를 차단한다.
--   - 모든 조회 RPC는 SECURITY DEFINER이며 첫 실행문에서 auth.uid() allowlist를 검증한다.
--   - cashout_request의 계좌·지급 식별자 등 민감 필드는 반환 타입과 SELECT에서 제외한다.
-- =============================================================================

BEGIN;

CREATE TABLE public.admin_member (
  member_id  uuid PRIMARY KEY REFERENCES public.member(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_member ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.admin_member IS
  '읽기전용 관리자 allowlist. RLS 정책 없음: SECURITY DEFINER 관리자 RPC만 조회.';

REVOKE ALL ON TABLE public.admin_member FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_member AS am
    WHERE am.member_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  '현재 Supabase Auth 사용자가 admin_member allowlist에 포함됐는지 반환한다.';

CREATE OR REPLACE FUNCTION public.admin_list_members(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id uuid,
  nickname text,
  provider text,
  kyc_status public.kyc_status_enum,
  created_at timestamptz,
  clover_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.nickname,
    m.provider,
    m.kyc_status,
    m.created_at,
    COALESCE(cb.clover_count, 0)::integer AS clover_count
  FROM public.member AS m
  LEFT JOIN public.clover_balance AS cb ON cb.member_id = m.id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

COMMENT ON FUNCTION public.admin_list_members(integer) IS
  '관리자 전용 회원 목록. 최근 가입순, 클로버 잔액 포함.';

CREATE OR REPLACE FUNCTION public.admin_list_ledger(p_limit integer DEFAULT 200)
RETURNS TABLE (
  id bigint,
  member_id uuid,
  nickname text,
  entry_type public.clover_entry_type_enum,
  clover_delta integer,
  ref_type text,
  ref_id bigint,
  balance_after integer,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    cl.id,
    cl.member_id,
    m.nickname,
    cl.entry_type,
    cl.clover_delta,
    cl.ref_type,
    cl.ref_id,
    cl.balance_after,
    cl.created_at
  FROM public.clover_ledger AS cl
  JOIN public.member AS m ON m.id = cl.member_id
  ORDER BY cl.created_at DESC, cl.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);
END;
$$;

COMMENT ON FUNCTION public.admin_list_ledger(integer) IS
  '관리자 전용 클로버 원장. 최근 기록순, 회원 닉네임 포함.';

CREATE OR REPLACE FUNCTION public.admin_list_cashouts(p_limit integer DEFAULT 100)
RETURNS TABLE (
  id bigint,
  member_id uuid,
  nickname text,
  clover_amount integer,
  gross_krw integer,
  fee_krw integer,
  withholding_krw integer,
  net_krw integer,
  status public.cashout_status_enum,
  requested_at timestamptz,
  paid_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION '권한 없음' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    cr.id,
    cr.member_id,
    m.nickname,
    cr.clover_amount,
    cr.gross_krw,
    cr.fee_krw,
    cr.withholding_krw,
    cr.net_krw,
    cr.status,
    cr.requested_at,
    cr.paid_at
  FROM public.cashout_request AS cr
  JOIN public.member AS m ON m.id = cr.member_id
  ORDER BY cr.requested_at DESC, cr.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
END;
$$;

COMMENT ON FUNCTION public.admin_list_cashouts(integer) IS
  '관리자 전용 환전 요청 목록. 계좌번호·은행코드·payout 식별자 등 민감 필드는 반환하지 않는다.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_members(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_ledger(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_cashouts(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_members(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_ledger(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cashouts(integer) TO authenticated;

COMMIT;
