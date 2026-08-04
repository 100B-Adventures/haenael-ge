-- =============================================================================
-- member.phone — 카카오 로그인 phone_number 동의항목 기반 알림톡 수신번호
-- =============================================================================
-- 개인정보 경계:
--   * authenticated는 기존 member_select_own RLS로 자기 행만 SELECT 가능
--   * service_role은 Edge Function(auth-kakao/toss-confirm)에서만 접근
--   * anon/PUBLIC에는 member 테이블 권한이 없어 전화번호를 읽을 수 없음
-- 값은 국내 휴대전화 숫자 표기(예: 01012345678)로만 저장한다.

BEGIN;

ALTER TABLE public.member
  ADD COLUMN phone varchar(20) NULL;

ALTER TABLE public.member
  ADD CONSTRAINT member_phone_domestic_mobile_check
  CHECK (phone IS NULL OR phone ~ '^01[016789][0-9]{7,8}$');

COMMENT ON COLUMN public.member.phone IS
  '카카오 phone_number 동의항목에서 받은 국내 휴대전화 번호. 알림톡 발송 전용 개인정보이며 본인 RLS와 service_role만 접근.';

COMMIT;
