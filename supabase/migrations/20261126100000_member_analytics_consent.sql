-- =============================================================================
-- 분석 정보 국외 이전 동의 계정 저장
-- - 로그인 회원은 브라우저·도메인이 바뀌어도 같은 선택을 복원한다.
-- - RLS는 기존 member_update_own을 사용하고, 컬럼 권한은 선택값만 허용한다.
-- - 선택 시각은 클라이언트가 아니라 DB 트리거가 기록한다.
-- =============================================================================

BEGIN;

ALTER TABLE public.member
  ADD COLUMN analytics_consent text NULL,
  ADD COLUMN analytics_consent_updated_at timestamptz NULL,
  ADD CONSTRAINT member_analytics_consent_check
    CHECK (analytics_consent IS NULL OR analytics_consent IN ('granted', 'denied')),
  ADD CONSTRAINT member_analytics_consent_timestamp_check
    CHECK ((analytics_consent IS NULL) = (analytics_consent_updated_at IS NULL));

COMMENT ON COLUMN public.member.analytics_consent IS
  '개인정보 보호법 제28조의8 분석 정보 국외 이전 별도 동의 선택. granted 또는 denied.';
COMMENT ON COLUMN public.member.analytics_consent_updated_at IS
  '분석 정보 국외 이전 동의 선택을 DB가 기록한 시각.';

CREATE OR REPLACE FUNCTION public.set_member_analytics_consent_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.analytics_consent IS DISTINCT FROM OLD.analytics_consent THEN
    NEW.analytics_consent_updated_at := CASE
      WHEN NEW.analytics_consent IS NULL THEN NULL
      ELSE clock_timestamp()
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_member_analytics_consent_timestamp()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER member_analytics_consent_timestamp
  BEFORE INSERT OR UPDATE OF analytics_consent ON public.member
  FOR EACH ROW
  EXECUTE FUNCTION public.set_member_analytics_consent_timestamp();

GRANT UPDATE (analytics_consent)
  ON TABLE public.member TO authenticated;

COMMIT;
