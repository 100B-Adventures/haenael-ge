-- =============================================================================
-- haenael-ge: 초기 스키마 마이그레이션
-- 진실원: docs/api-contract.md (ERD) + docs/design-patterns.md (RLS 패턴)
-- 14테이블 + 뷰 + 트리거 + RLS 정책 + 인덱스
-- =============================================================================

-- =====================
-- 0. EXTENSIONS
-- =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- 1. ENUM 타입
-- =====================

CREATE TYPE kyc_status_enum AS ENUM ('NONE', 'VERIFIED');

CREATE TYPE goal_status_enum AS ENUM ('ACTIVE', 'CLOSED', 'DELETED');

CREATE TYPE cheer_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'REFUNDED');

CREATE TYPE payment_status_enum AS ENUM ('READY', 'DONE', 'CANCELED', 'FAILED');

CREATE TYPE clover_entry_type_enum AS ENUM (
  'EARN',
  'CASHOUT_HOLD',
  'CASHOUT_SETTLED',
  'CASHOUT_REVERSAL',
  'REFUND_REVERSAL'
);

CREATE TYPE cashout_status_enum AS ENUM (
  'REQUESTED',
  'KYC_PENDING',
  'APPROVED',
  'PAYOUT_SENT',
  'PAID',
  'REJECTED',
  'FAILED'
);

CREATE TYPE risk_flag_enum AS ENUM ('CLEAR', 'REVIEW', 'BLOCKED');

CREATE TYPE notification_type_enum AS ENUM ('CHEER_RECEIVED');

CREATE TYPE notification_channel_enum AS ENUM ('ALIMTALK', 'INAPP');

CREATE TYPE alimtalk_status_enum AS ENUM ('SENT', 'FAILED');

CREATE TYPE report_target_type_enum AS ENUM ('GOAL', 'CHEER');

CREATE TYPE report_status_enum AS ENUM ('OPEN', 'RESOLVED_DELETED', 'DISMISSED');

-- =====================
-- 2. 테이블 (의존성 순서)
-- =====================

-- 2-1. member — 주인공(공급) 계정
-- auth.users.id 와 1:1 매핑 (Supabase Auth)
CREATE TABLE member (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text,
  provider_id   text,
  nickname      text,
  profile_image text,
  birth_date    date,
  kyc_status    kyc_status_enum NOT NULL DEFAULT 'NONE',
  ci            bytea,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE member IS '주인공(공급자) 계정. auth.users 1:1 FK.';
COMMENT ON COLUMN member.ci IS 'pgcrypto 암호화된 본인인증 CI. KYC 완료 후 설정.';

-- 2-2. goal — 목표(액자)
CREATE TABLE goal (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id  uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  slug       text        UNIQUE NOT NULL DEFAULT '',
  title      text        NOT NULL,
  reason     text,
  due_date   date        NOT NULL,
  status     goal_status_enum NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at  timestamptz,
  deleted_at timestamptz
);
COMMENT ON TABLE goal IS '목표 액자. slug=/g/{slug} 공유 링크. soft-delete 지원.';
COMMENT ON COLUMN goal.deleted_at IS 'soft-delete: set 시 goal_public 및 모든 공개 조회에서 제외.';

-- 2-3. payment — 토스 결제 주문 (cheer 보다 먼저 — cheer FK 의존)
CREATE TABLE payment (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id        text        UNIQUE NOT NULL,
  payment_key     text,
  amount_krw      integer     NOT NULL CHECK (amount_krw >= 1000),
  method          text,
  status          payment_status_enum NOT NULL DEFAULT 'READY',
  pg_customer_key text        NOT NULL DEFAULT 'ANONYMOUS',
  approved_at     timestamptz,
  receipt_url     text,
  raw_response    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment IS '토스 결제 주문. order_id UNIQUE=멱등키. service_role EF만 write.';

-- 2-4. cheer — 응원 1건
CREATE TABLE cheer (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id       bigint      NOT NULL REFERENCES goal(id) ON DELETE RESTRICT,
  supporter_ci  text,
  display_name  text,
  is_anonymous  boolean     NOT NULL DEFAULT false,
  message       varchar(140),
  clover_amount integer     NOT NULL CHECK (clover_amount > 0),
  payment_id    bigint      NOT NULL REFERENCES payment(id) ON DELETE RESTRICT,
  status        cheer_status_enum NOT NULL DEFAULT 'PENDING',
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
COMMENT ON TABLE cheer IS '응원 1건. soft-delete 지원. message=워드맵 소스.';
COMMENT ON COLUMN cheer.deleted_at IS 'soft-delete: set 시 goal_public·워드맵에서 제외.';

-- 2-5. payment_log — 결제 상태전이 로그 (append-only)
CREATE TABLE payment_log (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_id  bigint      NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
  from_status payment_status_enum,
  to_status   payment_status_enum NOT NULL,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE payment_log IS '결제 상태전이 append-only 감사 로그.';

-- 2-6. clover_ledger — 클로버 원장 (append-only, source of truth)
CREATE TABLE clover_ledger (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id     uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  entry_type    clover_entry_type_enum NOT NULL,
  clover_delta  integer     NOT NULL,
  ref_type      text,
  ref_id        bigint,
  balance_after integer     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clover_ledger IS '클로버 원장. append-only. service_role EF만 write. balance_after=잔액 스냅샷.';

-- 2-7. clover_balance — 잔액 파생 캐시 (트리거로 동기화)
CREATE TABLE clover_balance (
  member_id    uuid    PRIMARY KEY REFERENCES member(id) ON DELETE CASCADE,
  clover_count integer NOT NULL DEFAULT 0 CHECK (clover_count >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clover_balance IS '클로버 잔액 캐시. source of truth는 clover_ledger. 트리거 동기화.';

-- 2-8. cashout_request — 환전
CREATE TABLE cashout_request (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id       uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  clover_amount   integer     NOT NULL CHECK (clover_amount > 0),
  gross_krw       integer     NOT NULL,
  fee_krw         integer     NOT NULL,
  withholding_krw integer     NOT NULL,
  net_krw         integer     NOT NULL,
  status          cashout_status_enum NOT NULL DEFAULT 'REQUESTED',
  payout_id       text,
  bank_code       text,
  account_no_enc  bytea,
  risk_flag       risk_flag_enum NOT NULL DEFAULT 'CLEAR',
  requested_at    timestamptz NOT NULL DEFAULT now(),
  paid_at         timestamptz
);
COMMENT ON TABLE cashout_request IS '환전 요청. ₩ 금액은 이 테이블에만(3층 c). service_role EF만 write.';
COMMENT ON COLUMN cashout_request.account_no_enc IS 'pgcrypto 암호화된 계좌번호.';

-- 2-9. kyc_verification — PASS 통합본인인증
CREATE TABLE kyc_verification (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id   uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  real_name   text,
  ci          bytea,
  di          text,
  birth_date  date,
  is_adult    boolean     NOT NULL DEFAULT false,
  provider    text        NOT NULL DEFAULT 'PASS',
  verified_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE kyc_verification IS 'PASS 통합본인인증. CI/DI 암호화. 환전 만19+ 게이트.';

-- 2-10. risk_event — 이상거래 (MVP: 스키마만, no-op)
CREATE TABLE risk_event (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id  uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  type       text        NOT NULL,
  detail     jsonb,
  resolved   boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE risk_event IS 'ACCEPTED-RISK: MVP 미사용. RiskHook no-op. 룰 활성화 시 사용.';

-- 2-11. share_event — 재공유·확산 analytics
CREATE TABLE share_event (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id    bigint      NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  channel    text        NOT NULL CHECK (channel IN ('IMAGE', 'STORY', 'LINK')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE share_event IS '재공유 analytics. channel: IMAGE/STORY/LINK.';

-- 2-12. wordmap_render_cache — 공유 이미지 캐시
CREATE TABLE wordmap_render_cache (
  id          bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  goal_id     bigint      NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  word_count  integer     NOT NULL DEFAULT 0,
  rendered_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE wordmap_render_cache IS '워드맵 공유 이미지 Storage URL 캐시.';

-- 2-13. notification — 알림 (인앱 + 카카오 알림톡)
CREATE TABLE notification (
  id              bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id       uuid        NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  type            notification_type_enum    NOT NULL,
  channel         notification_channel_enum NOT NULL,
  alimtalk_status alimtalk_status_enum,
  read            boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE notification IS '인앱+카카오 알림톡. 정보성만(마케팅 금지). 실패시 INAPP 폴백.';

-- 2-14. report — 신고·모더레이션 (MVP=신고+수동삭제)
CREATE TABLE report (
  id           bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_ref text,
  target_type  report_target_type_enum NOT NULL,
  target_id    bigint      NOT NULL,
  reason       text        NOT NULL,
  status       report_status_enum NOT NULL DEFAULT 'OPEN',
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE report IS '신고 접수. INSERT 개방(게스트 포함). 처리=운영자 수동 soft-delete.';

-- =====================
-- 3. 트리거 함수
-- =====================

-- goal.slug 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_goal_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug text;
  attempts integer := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;
  LOOP
    new_slug := lower(
      regexp_replace(
        encode(gen_random_bytes(6), 'base64'),
        '[^a-zA-Z0-9]', '', 'g'
      )
    );
    IF NOT EXISTS (SELECT 1 FROM goal WHERE slug = new_slug) THEN
      NEW.slug := new_slug;
      RETURN NEW;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'slug 생성 실패: 10회 시도 후 충돌';
    END IF;
  END LOOP;
END;
$$;

CREATE TRIGGER goal_slug_gen
  BEFORE INSERT ON goal
  FOR EACH ROW
  EXECUTE FUNCTION generate_goal_slug();

-- clover_ledger INSERT 시 clover_balance 동기화
CREATE OR REPLACE FUNCTION sync_clover_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO clover_balance (member_id, clover_count, updated_at)
  VALUES (NEW.member_id, NEW.balance_after, now())
  ON CONFLICT (member_id) DO UPDATE
    SET clover_count = EXCLUDED.clover_count,
        updated_at   = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clover_ledger_sync_balance
  AFTER INSERT ON clover_ledger
  FOR EACH ROW
  EXECUTE FUNCTION sync_clover_balance();

-- =====================
-- 4. 뷰
-- =====================

-- goal_public: 공개 뷰 (② 비로그인 열람)
-- 금액 3층 a: ₩ 컬럼 없음, clover_count 없음. deleted_at IS NULL 필터.
CREATE OR REPLACE VIEW goal_public AS
SELECT
  g.id,
  g.slug,
  g.title,
  g.reason,
  g.due_date,
  g.status,
  g.created_at,
  g.closed_at,
  COALESCE((
    SELECT count(*)::integer
    FROM cheer c
    WHERE c.goal_id = g.id
      AND c.status = 'CONFIRMED'
      AND c.deleted_at IS NULL
  ), 0) AS cheer_count
FROM goal g
WHERE g.deleted_at IS NULL
  AND g.status != 'DELETED';

COMMENT ON VIEW goal_public IS '공개 목표 뷰. ₩·clover_count 컬럼 없음(금액 3층 a). anon SELECT 허용.';

-- =====================
-- 5. RPC 함수
-- =====================

-- 워드맵 집계 (G5)
CREATE OR REPLACE FUNCTION get_wordmap(p_goal_id bigint)
RETURNS TABLE(word text, word_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    trim(w)  AS word,
    count(*) AS word_count
  FROM cheer c,
       regexp_split_to_table(c.message, '\s+') AS w
  WHERE c.goal_id    = p_goal_id
    AND c.message    IS NOT NULL
    AND c.deleted_at IS NULL
    AND c.status     = 'CONFIRMED'
    AND length(trim(w)) > 0
  GROUP BY trim(w)
  ORDER BY count(*) DESC, trim(w)
  LIMIT 100;
$$;

COMMENT ON FUNCTION get_wordmap(bigint) IS 'G5 워드맵 집계 RPC. cheer.message 토큰화. SECURITY DEFINER.';

-- =====================
-- 6. 인덱스 (RLS 컬럼 필수)
-- =====================

CREATE INDEX idx_member_provider        ON member(provider, provider_id);
CREATE INDEX idx_goal_member_id         ON goal(member_id);
CREATE INDEX idx_goal_slug              ON goal(slug);
CREATE INDEX idx_goal_active            ON goal(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cheer_goal_id          ON cheer(goal_id);
CREATE INDEX idx_cheer_confirmed        ON cheer(goal_id)
  WHERE status = 'CONFIRMED' AND deleted_at IS NULL;
CREATE INDEX idx_cheer_payment_id       ON cheer(payment_id);
CREATE INDEX idx_payment_order_id       ON payment(order_id);
CREATE INDEX idx_payment_status         ON payment(status);
CREATE INDEX idx_payment_log_payment_id ON payment_log(payment_id);
CREATE INDEX idx_clover_ledger_member   ON clover_ledger(member_id);
CREATE INDEX idx_clover_ledger_ref      ON clover_ledger(ref_type, ref_id);
CREATE INDEX idx_cashout_member_id      ON cashout_request(member_id);
CREATE INDEX idx_cashout_status         ON cashout_request(status);
CREATE INDEX idx_kyc_member_id          ON kyc_verification(member_id);
CREATE INDEX idx_notification_member    ON notification(member_id);
CREATE INDEX idx_notification_unread    ON notification(member_id) WHERE read = false;
CREATE INDEX idx_share_event_goal       ON share_event(goal_id);
CREATE INDEX idx_wordmap_goal_id        ON wordmap_render_cache(goal_id);

-- =====================
-- 7. RLS 활성화
-- =====================

ALTER TABLE member               ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheer                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clover_ledger        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clover_balance       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_request      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_verification     ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_event           ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_event          ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordmap_render_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification         ENABLE ROW LEVEL SECURITY;
ALTER TABLE report               ENABLE ROW LEVEL SECURITY;

-- =====================
-- 8. RLS 정책
-- =====================

-- ── member ──────────────────────────────────────────────────
CREATE POLICY "member_select_own" ON member
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "member_update_own" ON member
  FOR UPDATE
  USING (auth.uid() = id);

-- ── goal ────────────────────────────────────────────────────
CREATE POLICY "goal_insert_owner" ON goal
  FOR INSERT
  WITH CHECK (
    auth.uid() = member_id
    AND (auth.jwt() ->> 'is_anonymous')::boolean IS NOT TRUE
  );

CREATE POLICY "goal_select_own" ON goal
  FOR SELECT
  USING (
    auth.uid() = member_id
    AND deleted_at IS NULL
  );

CREATE POLICY "goal_update_own" ON goal
  FOR UPDATE
  USING (auth.uid() = member_id);

-- ── cheer ───────────────────────────────────────────────────
-- 공개: 확정·삭제 안 된 응원 (anon 포함)
CREATE POLICY "cheer_select_confirmed" ON cheer
  FOR SELECT
  USING (
    status = 'CONFIRMED'
    AND deleted_at IS NULL
  );

-- 목표 소유자: 자신 목표의 모든 응원 조회
CREATE POLICY "cheer_select_goal_owner" ON cheer
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goal g
      WHERE g.id = cheer.goal_id
        AND g.member_id = auth.uid()
    )
  );

-- ── payment ─────────────────────────────────────────────────
-- write 정책 없음 = service_role EF만
CREATE POLICY "payment_select_goal_owner" ON payment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cheer c
      JOIN goal g ON g.id = c.goal_id
      WHERE c.payment_id = payment.id
        AND g.member_id = auth.uid()
    )
  );

-- ── payment_log ─────────────────────────────────────────────
-- 클라이언트 정책 없음 (service_role 전용)

-- ── clover_ledger ───────────────────────────────────────────
-- write 정책 없음 = service_role EF만 (append-only 원장)
CREATE POLICY "clover_ledger_select_own" ON clover_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- ── clover_balance ──────────────────────────────────────────
-- 본인 잔액만 (3층 b: clover_count만, ₩ 없음)
CREATE POLICY "clover_balance_select_own" ON clover_balance
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- ── cashout_request ─────────────────────────────────────────
-- write 정책 없음 = service_role EF만
CREATE POLICY "cashout_request_select_own" ON cashout_request
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- ── kyc_verification ────────────────────────────────────────
CREATE POLICY "kyc_verification_select_own" ON kyc_verification
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

-- ── risk_event ──────────────────────────────────────────────
-- service_role 전용, 클라이언트 정책 없음

-- ── share_event ─────────────────────────────────────────────
CREATE POLICY "share_event_insert_owner" ON share_event
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goal g
      WHERE g.id = share_event.goal_id
        AND g.member_id = auth.uid()
    )
  );

CREATE POLICY "share_event_select_own" ON share_event
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goal g
      WHERE g.id = share_event.goal_id
        AND g.member_id = auth.uid()
    )
  );

-- ── wordmap_render_cache ─────────────────────────────────────
CREATE POLICY "wordmap_render_cache_select_public" ON wordmap_render_cache
  FOR SELECT
  USING (true);

-- ── notification ────────────────────────────────────────────
CREATE POLICY "notification_select_own" ON notification
  FOR SELECT TO authenticated
  USING (auth.uid() = member_id);

CREATE POLICY "notification_update_own" ON notification
  FOR UPDATE TO authenticated
  USING (auth.uid() = member_id);

-- ── report ──────────────────────────────────────────────────
-- INSERT: 누구나 (게스트 신고 허용). SELECT: service_role 전용.
CREATE POLICY "report_insert_any" ON report
  FOR INSERT
  WITH CHECK (true);

-- =====================
-- 9. GRANTS
-- =====================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- goal_public 뷰: anon·authenticated
GRANT SELECT ON goal_public TO anon, authenticated;

-- get_wordmap: anon·authenticated
GRANT EXECUTE ON FUNCTION get_wordmap(bigint) TO anon, authenticated;

-- member
GRANT SELECT, UPDATE ON member TO authenticated;

-- goal
GRANT SELECT, INSERT, UPDATE ON goal TO authenticated;

-- cheer (SELECT 공개, INSERT는 service_role EF만)
GRANT SELECT ON cheer TO anon, authenticated;

-- payment (SELECT: 목표소유자 영수증 조회 — RLS 필터)
GRANT SELECT ON payment TO authenticated;

-- clover_ledger (SELECT: 본인 원장)
GRANT SELECT ON clover_ledger TO authenticated;

-- clover_balance (SELECT: 본인 잔액)
GRANT SELECT ON clover_balance TO authenticated;

-- cashout_request (SELECT: 본인 내역)
GRANT SELECT ON cashout_request TO authenticated;

-- kyc_verification (SELECT: 본인)
GRANT SELECT ON kyc_verification TO authenticated;

-- share_event
GRANT SELECT, INSERT ON share_event TO authenticated;

-- wordmap_render_cache (SELECT: 공개)
GRANT SELECT ON wordmap_render_cache TO anon, authenticated;

-- notification
GRANT SELECT, UPDATE ON notification TO authenticated;

-- report (INSERT: anon·authenticated)
GRANT INSERT ON report TO anon, authenticated;
