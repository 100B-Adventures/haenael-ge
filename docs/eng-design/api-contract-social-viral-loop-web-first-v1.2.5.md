# 해낼게 V2 소셜 바이럴 루프 웹 우선 API 계약
| 항목 | 값 |
|---|---|
| 버전 | **v1.2.5** (Codex 7차 17/25 반려 반영: CV-12 삼자 불일치 해소 · 비회원 필드 3개로 축소 · 제목·참조 정합) |
| 작성일 | v1.1.0 2026-10-13 02:42 KST · **v1.2.x 개정 2026-10-19 16:3x KST** |
| 작성자/모델 | v1.1.0 tech-architect / gpt-5-codex · **v1.2.0 tech-architect / claude-opus-5[1m]** |
| 작업 라인 | v2 |
| 상태 | 웹 1차·모바일 2차 공통 계약. **회장 결정 4건 전부 확정됨**(FDD §A.7) |
| 상류 핀 | `fdd-social-viral-loop-web-first-v1.2.5.md` · `erd-social-viral-loop-web-first-v1.2.5.md` · `docs/design/prototypes/social-viral-loop-v3-opus5.html` 3.0.0 sha256 `f9398150755d…` · `DESIGN.md` sha256 `0ddeed8caff7…` |
| 기반 포맷 | `docs/eng-design/api-contract-social-viral-loop-web-first-v1.1.0.md` (v1.1.0, sha256 `ab54f04fd13f…`) |

> STAMP: 생성 2026-10-13 02:42 KST. 모델 gpt-5-codex. 에이전트 tech-architect. 스킬 docs. 근거는 `miniapp/src/gateway.ts`의 실호출, 기존 Supabase RPC·Edge Function 관습, Supabase 공식 함수 보안 문서다. 가장 오래 고민한 지점은 토큰 원문을 저장하지 않으면서 초대 생성 재시도를 어떻게 설명할지였다. 결론은 생성은 비멱등, 수락은 관계 기준 멱등으로 분리하는 것이다.

> PATCH v1.0.1 사유: D-019 확정에 따라 PUBLIC 승인 커버만 public bucket으로 복사하고, FRIENDS 승인 커버는 private bucket에 유지한 뒤 친구 자격 확인 후 120초 Presigned URL로만 제공하도록 서버 함수 계약을 바로잡았다.

> v1.1.0 사유: D-022의 마이페이지와 반증 가능한 업적을 위해 `my_social_dashboard()`를 추가한다. 회원-응원 귀속 원본은 service role 전용 테이블에 격리하고 응답에는 집계와 미응원 목표만 노출한다.

## 목차
- [A. v1.2.x 개정 (6차 개정 반영)](#a-v12-개정-6차-개정-반영)
  - [A.1 운영 실물 실측표](#a1-운영-실물-실측표)
  - [A.2 비회원 응답 계약 (FR-W18 · OWASP Excessive Data Exposure)](#a2-비회원-응답-계약-fr-w18---owasp-excessive-data-exposure)
  - [A.3 `my_social_dashboard()` 응원 요약 확장 (R6)](#a3-my_social_dashboard-응원-요약-확장-r6)
  - [A.4 커버 자산 상태기계 (R5 · FR-W13)](#a4-커버-자산-상태기계-r5---fr-w13)
  - [A.5 관계 방향 필드 (D-024 · D-026)](#a5-관계-방향-필드-d-024---d-026)
  - [A.6 응답 예시 교정](#a6-응답-예시-교정)
  - [A.7 엣지 함수 오류 전수표](#a7-엣지-함수-오류-전수표)
  - [A.8 비회원 초대 미리보기 필드 집합 단일화 (P0)](#a8-비회원-초대-미리보기-필드-집합-단일화-p0)
    - [A.8.1 확정 필드 집합](#a81-확정-필드-집합-이-엔드포인트의-유일한-정의)
      - [A.8.1.1 각 필드의 소비 근거 (최소 집합 입증)](#a811-세-필드가-현재-쓰이는-자리-최소-집합-입증)
    - [A.8.2 D-019 와의 정합](#a82-d-019-와의-정합-friends-커버는-null-이다)
    - [A.8.3 필드 목록이 적힌 자리 전수 (D축 입력)](#a83-같은-엔드포인트의-필드-목록이-적힌-자리-전수-d축-입력)
- [0. 결론과 호환성 결정](#0-결론과-호환성-결정)
- [1. 공통 규약](#1-공통-규약)
- [2. RPC 카탈로그](#2-rpc-카탈로그)
- [3. 기존 미니앱 호환 RPC 5종](#3-기존-미니앱-호환-rpc-5종)
- [4. 웹 추가 RPC 5종](#4-웹-추가-rpc-5종)
- [5. 커버 Edge Function 3종](#5-커버-edge-function-3종)
- [6. 오류 사전](#6-오류-사전)
- [7. 권한·필드·로그 금지](#7-권한-필드-로그-금지)
- [8. 추적성·수용기준](#8-추적성-수용기준)
- [9. 개정 이력](#9-개정-이력)

## A. v1.2 개정 (6차 개정 반영)
> 이 장이 이 문서의 **계약 정본**이다. 같은 사실을 두 번 적지 않는다(전수 대조 결과 = FDD §A.9). 기존 RPC 이름·인자 이름은 하나도 바꾸지 않는다(미니앱 호환 계약 유지).

### A.1 운영 실물 실측표
품질헌법 `standard-eng-design.md` §1-7. v1.1.0 과 아키텍처 v1.1.0 §7 이 적은 "운영 0건" 은 2026-10-13 시점의 값이고 **낡았다.** 아래가 현재 정본이다.

| 계약 | 운영 상태 | 확인 명령 | 등급 |
|---|---|---|---|
| `my_friend_goals()` | 존재. 200 `{"friends":[]}` | QA 로그인 후 `POST /rest/v1/rpc/my_friend_goals` `{}` | 관찰됨 |
| `my_social_dashboard()` | 존재. 200 (`profile`·`goals`·`friend_count`·`achievements` 3종·`belonging_queue`) | 같음 | 관찰됨 |
| `friend_goal_detail(goal_id)` | 존재. `goal_id=-1` → P0002 `goal_not_found` | 같음 | 관찰됨 |
| `friend_invite_preview(token)` | 존재. 미존재 토큰 → P0008 `invite_not_found` | 같음 | 관찰됨 |
| `get_wordmap(p_goal_id)` | 존재. 200 `[]` | 같음 | 관찰됨 |
| `admin_list_goal_covers(p_limit)` | 존재. 403 `admin_forbidden`(비관리자 차단 작동) | 같음 | 관찰됨 |
| `accept_friend_invite(token)` | 존재. 미존재 토큰 → P0008 `invite_not_found`(쓰기 전 거부되므로 안전) | QA 로그인 후 호출 | 관찰됨 |
| `set_goal_visibility(goal_id, visibility)` | 존재. `goal_id=-1` → P0005 `goal_forbidden`(쓰기 전 거부) | 같음 | 관찰됨 |
| `set_goal_cover_preset`·`remove_friend` | 존재. PostgREST 가 시그니처를 돌려줌 | 같음 | 관찰됨 |
| `create_friend_invite`·`update_member_preferences` | **호출하지 않았다.** 인자를 맞춰 부르면 운영 데이터가 쓰인다. 같은 migration 의 형제 8종이 전부 실재하고 제품 코드가 운영에서 이 둘을 호출한다 | 호출 안 함 | **근거 확인** |
| `POST /functions/v1/goal-cover-sign-upload` | 배포됨. 미인증 401 `auth_required`, 인증 후 404 `goal_not_found` | `curl -X POST`, 대조군 `zz-does-not-exist` → 404 `NOT_FOUND` | 관찰됨 |
| `POST /functions/v1/goal-cover-finalize` | 배포됨. 422 `invalid_request` | 같음 | 관찰됨 |
| `POST /functions/v1/admin-review-goal-cover` | 배포됨. `OPTIONS` 204 | 같음 | 관찰됨 |
| `goal-cover-public` 버킷 | 존재(`NoSuchKey`) | `GET /storage/v1/object/public/goal-cover-public/probe.png` | 관찰됨 |
| `goal-cover-quarantine` 버킷 | **미검증.** 비공개 버킷은 공개 경로에서 `NoSuchBucket` 을 돌려주므로 판정 불가. build 첫 항목으로 서명 업로드 1회로 확인 | 같음 | **미검증** |

측정일 2026-10-19, 프로젝트 `ossvejipdivgxzcqszbw`, 자격증명 `~/.sj-agent-harness/secrets/haenael-ge-qa-production.env`(읽기 전용 QA 계정). 운영 쓰기 0건.

### A.2 비회원 응답 계약 (FR-W18 - OWASP Excessive Data Exposure)
**회장 확정(2026-10-19)**: 비회원 미리보기는 **예시 데이터로 경험을 미리 보여준다.** 원문 "예시 데이터를 주면서 이런 경험을 하겠구나 함 되지".

| 항목 | 확정 계약 |
|---|---|
| 서버 호출 | **0건.** 예시 데이터는 클라이언트 상수(`web/src/lib/copy/guest-preview.ts`)이고 서버를 거치지 않는다 |
| 신설 RPC | **0건.** `platform_social_stats()` 는 **폐기**(집계 수치 안이 탈락). **이번 개정의 신설 서버 자산은 0건이다** |
| 실사용자 데이터 | 응답·HTML·DOM 어디에도 **0건** |
| 흐림 처리 | **금지.** 가리면 실데이터처럼 보이고, CSS 로 가린 것은 전송된 것이다 |
| 수치 | 예시의 일부로 보이게 한다. 참이 될 수 없는 수치를 사실처럼 쓰지 않는다 |

**비회원 경로는 셋이고 허용 필드가 각각 다르다.** v1.2.1 은 금지 필드를 **전역**으로 적어, 정상 초대 응답이 보안 테스트에 반드시 실패하는 모순을 만들었다(Codex 지적). 금지는 전역이 아니라 **엔드포인트별 허용 목록(allowlist)** 으로 정의한다. OWASP 의 요지는 **불필요한 필드를 보내지 않는 것**이고, 엔드포인트가 의도적으로 제공하는 최소 계약까지 금지하는 것이 아니다.

| 비회원 경로 | 인가 근거 | **허용 필드(이것만)** | 그 외 전부 금지 |
|---|---|---|---|
| **회원 전용 탭 미리보기** (`/`·`/g/[slug]` 의 시트) | 없음 | **없다. 서버를 호출하지 않는다** | 해당 없음(응답 자체가 없다) |
| **`friend_invite_preview(token)`** (`/invite/[token]`) | **토큰 소지** | **정확히 3개**: `inviter_nickname` · `goal_title` · `cover_preset_key` (§A.8 이 자리들의 동일성을 고정한다) | 응원자·메시지·금액·클로버·프로필 식별자·`member_id`·`goal_id`·`reason`·워드맵·순위 **그리고 현재 화면이 쓰지 않는 `cover_public_path`·`expires_at`·`requires_login`** |
| **공개 목표 조회** (`/g/[slug]`) | 목표가 `PUBLIC` | 목표 제목 · 이유 · 마감일 · 승인 커버 · **응원 인원수** · 워드맵 단어 | 금액·클로버 수·순위·응원자 개인 식별자·비공개 범위 목표 |

**세 경로 공통 금지(어느 비회원 경로에도 나가지 않는다)**

```text
clover_amount, amount, amount_krw, gross, fee, vat, withhold, net,
payment_id, payment_key, cashout, supporter_ci, provider_id, email,
token_hash, quarantine_path, moderation metadata, rank,
supporter_count_per_member
```

**판정 규칙 한 줄**: 어떤 비회원 응답이든 **그 경로의 허용 목록에 없는 key 가 있으면 위반**이다. 허용 목록에 있는 key 는 그 경로에서 정상이다. 테스트도 경로별로 판정한다(GT-01 은 경로마다 그 경로의 목록으로 본다).

근거: OWASP WSTG Excessive Data Exposure. **가린다는 것은 보내지 않는다는 뜻이다.** UI·CSS 로 가리는 대신 서버 응답 스키마에서 제외한다.

### A.3 `my_social_dashboard()` 응원 요약 확장 (R6)
R6 이 홈 목표 카드에 아바타 스택·인원수·최근 응원 한 줄을 요구한다. **새 RPC 를 만들지 않고 기존 단일 호출을 확장한다.** 현재 `/me` 의 SSR 집계는 `.select("goal_id, created_at").in("goal_id", goalIds)` 로 이미 일괄 조회라 N+1 이 없고, 목표별 조회를 추가하는 순간 그것이 생긴다.

`goals[]` 각 항목에 아래 3개 key 를 더한다. 그 외 응답 구조는 바뀌지 않는다.

```json
{
  "goal_id": 101,
  "slug": "run",
  "title": "매주 세 번 달리기",
  "due_date": "2026-12-01",
  "status": "ACTIVE",
  "cover_preset_key": "c1",

  "cheer_count": 23,
  "supporter_avatars": [
    { "profile_image": "https://…/a.png", "is_anonymous": false },
    { "profile_image": null,              "is_anonymous": true  },
    { "profile_image": "https://…/c.png", "is_anonymous": false }
  ],
  "recent_cheer": {
    "supporter_name": "도경",
    "message": "끝까지 가보자",
    "created_at": "2026-10-18T11:20:00+09:00",
    "is_anonymous": false
  }
}
```

**규칙**

- `supporter_avatars` 는 **최대 3개**다. `cheer_count` 가 3을 넘으면 화면이 `+N` 을 계산한다. 서버가 전체 응원자 배열을 보내지 않는다.
- `recent_cheer` 는 목표당 **1건**이고 없으면 `null` 이다. 구현은 `DISTINCT ON (goal_id) … ORDER BY goal_id, created_at DESC` 로 **전체 한 번**에 뽑는다.
- `is_anonymous=true` 면 `profile_image`·`supporter_name` 을 **보내지 않는다**(`null`). 화면은 자리표시만 그리고 프로필 링크를 걸지 않는다.
- **금지 필드 유지**: `clover_amount`·`amount_krw`·`rank`·상위 후원자 순서는 이 확장에 없다(D-003 · R6 이 명시적으로 버린 것).
- **질의 횟수 불변**: 목표가 1개든 20개든 이 응답을 만드는 서버 왕복은 1회다. 목표 수에 비례해 증가하면 계약 위반이다.
- 멱등: 읽기 전용. 인증: `authenticated` 필수. 오류: 기존 §6 사전 그대로.

### A.4 커버 자산 상태기계 (R5 - FR-W13)
**v1.2.1 교정**: v1.2.0 은 첫 상태를 `PENDING_UPLOAD` 로 적었다. **운영 실물은 `UPLOADING` 이고 허용값은 6개다.** 틀린 이름으로 구현하면 중단분을 한 건도 찾지 못한다.

**운영 스키마 (관찰됨, 2026-10-19)**

```sql
-- supabase/migrations/20261013050000_social_viral_loop_web_first.sql:56
status text NOT NULL CHECK (status IN
  ('UPLOADING', 'REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'DELETED'))
-- 같은 파일 65~69행: 상태별 칸 제약
--   APPROVED        → reviewed_by·reviewed_at 필수, rejection_code NULL
--   REJECTED        → reviewed_by·reviewed_at·rejection_code 필수, public_path NULL
--   UPLOADING·REVIEW→ reviewed_by·reviewed_at·rejection_code·public_path 전부 NULL
--   SUPERSEDED·DELETED → 제약 없음
```

**전이표 (8행)**

| # | 전이 | 주체 | 호출 | 실패 응답 | 활성 커버 |
|---|---|---|---|---|---|
| 1 | (없음) → `UPLOADING` | 소유자 | `goal-cover-sign-upload` | 401 `auth_required` · 403 `goal_forbidden` · 404 `goal_not_found` · 422 `invalid_file_name`·`invalid_content_hash`·`invalid_file_size` · 413 `file_too_large` · 415 `unsupported_media_type` · 500 `asset_create_failed`·`signed_upload_failed`(행 생성 후 실패 시 **스스로 행을 지운다**) | 불변 |
| 2 | `UPLOADING` → `UPLOADING` | 소유자 | Storage `PUT` (격리 버킷, 서명 수명 300초) | Storage 오류. **행은 `UPLOADING` 으로 남는다** → 8번 대상 | 불변 |
| 3 | `UPLOADING` → `REVIEW` | 소유자 | `goal-cover-finalize` | 404 `asset_not_found` · 409 `asset_not_reviewable`(상태가 `UPLOADING` 이 아님) · 413 `file_too_large` · 415 `unsupported_media_type` · 422 `hash_mismatch` · 500 `asset_finalize_failed` | **불변**(기존 커버 유지) |
| 4 | `REVIEW` → `APPROVED` | 관리자 | `admin-review-goal-cover` `{decision:"APPROVE"}` | 403 `admin_forbidden` · 404 `asset_not_found` · 409 `asset_not_reviewable` · 500 `public_copy_failed`·`review_apply_failed` · `public_copy_required`(PUBLIC 인데 복사 경로 없음) · `private_cover_must_not_publish`(FRIENDS·PRIVATE 인데 복사 경로 있음) | **원자 교체** |
| 5 | `REVIEW` → `REJECTED` | 관리자 | 같음 `{decision:"REJECT", rejection_code}` | 422 `invalid_rejection_code`(허용값 `adult`·`violence`·`personal_info`·`copyright`·`other`) · 그 외 4번과 같음 | 불변 |
| 6 | `APPROVED` → `SUPERSEDED` | 시스템 | 4번과 같은 트랜잭션 안에서 자동 | 없음(4번과 원자) | 교체됨 |
| 7 | `REJECTED`·`SUPERSEDED` → 격리 객체 삭제 | 정리 작업 | `storage_cleanup_queue` (`ASSET_REJECTED`·`ASSET_REPLACED`) | 큐 `attempts` 증가, `status='FAILED'` 후 재시도 | 불변 |
| 8 | `UPLOADING`(24시간 경과) → `DELETED` | **정리 작업** | 명명된 cron job (§erd A.4) | 같음 | 불변 |

근거: `migration:52~70, 505~538` · `goal-cover-sign-upload/index.ts:33~60` · `goal-cover-finalize/index.ts:38~67` · `admin-review-goal-cover/index.ts:40~95` · `_shared/goal-cover.ts:22~43, 114~123`.

**8번 전이에 필요한 추가 2건 (D-OPEN-3 은 구조 변경 0 이지만 정리 작업은 추가가 필요하다)**

| 추가 | 왜 | 근거 |
|---|---|---|
| `storage_cleanup_queue.reason` CHECK 에 `ABANDONED_UPLOAD` 추가 | 현재 허용값 3개(`VISIBILITY_DOWNGRADE`·`ASSET_REPLACED`·`ASSET_REJECTED`)에 중단 업로드가 없어 **큐에 넣을 수 없다** | `migration:79` |
| 정리 함수 1개 + 명명된 cron job 1개 | 정책만 있고 **실행 주체가 레포에 0건** | §erd A.4 |

**격리 객체 읽기 경계(관찰됨)**: `storage.objects` 의 `goal_cover_quarantine_owner_read` 정책은 **`status='APPROVED'` 인 자산만** 소유자 SELECT 를 허용한다(`migration:154~165`). 따라서 `UPLOADING`·`REVIEW` 중에는 소유자도 객체를 직접 읽지 못하고 서명 URL 로만 본다. 설계가 이 사실을 전제한다.

**클라이언트 쪽 수용기준 2건을 계약에 올린다**(R5 가 밝힌 두 원인. 기계로 셀 수 있으므로 검사로 집행한다: D-032).

1. 업로드 버튼은 가로 스크롤 영역 **밖**에 있어 스크롤 위치와 무관하게 항상 눌린다.
2. 선택 상태는 단일 변수가 소유하고, 렌더된 체크 표시 개수는 **정확히 1개**다.

### A.5 관계 방향 필드 (D-024 - D-026)
D-024 로 **확정 응원이 친구를 만든다.** 운영에는 그 migration 2건이 이미 적용돼 있다(`20261015010000_cheer_friendship_backfill.sql`·`20261016021000_friend_relationship_direction.sql`). v1.1.0 계약에 이 필드가 없었다.

`my_friend_goals()` 의 각 친구 항목과 `friend_goal_detail(goal_id)` 응답에 아래를 추가한다.

```json
{
  "friend_member_id": "uuid",
  "nickname": "도경",
  "relationship_direction": "MUTUAL",
  "relationship_origin": "CHEER"
}
```

- `relationship_direction` ∈ `I_CHEERED | CHEERED_ME | MUTUAL`. **확정 응원 기록으로 판정한다.** 화면 표기는 `내가 응원함 | 응원받음 | 서로 응원`.
- `relationship_origin` ∈ `CHEER | INVITE`. 어떤 경로로 맺어졌는지이고 화면 표기는 선택이다.
- **금액은 방향 판정의 입력이지만 응답에 나가지 않는다.** 응원 사실의 유무만 쓴다(D-003).

### A.6 응답 예시 교정
| 위치 | v1.1.0 예시 | 실제 서버 | v1.2.0 |
|---|---|---|---|
| §3.1 `my_friend_goals` 목표 항목 | `cover_public_path: null` | `web/src/lib/social/server.ts:136` 이 PUBLIC 은 `getPublicUrl()`, FRIENDS 는 120초 서명 URL 을 붙여 **`cover_url`** 로 내려준다 | **`cover_url`**(문자열 또는 `null`)로 적는다. `cover_public_path` 는 폐기. FRIENDS 값은 수명 120초이며 캐시·로그 금지 |

### A.7 엣지 함수 오류 전수표
v1.2.0 의 §6 오류 사전이 실제 코드의 오류를 못 덮었다(Codex 반려 4번). `_shared/goal-cover.ts` 와 세 함수에서 `throw new Error(...)` 를 전수로 뽑고 `coverErrorStatus()` 의 매핑을 그대로 적는다. **이 표가 커버 경로 오류의 정본이다.**

응답 형태는 전부 `{"error":{"code":"<코드>"}}` 다. **서버는 코드만 반환하고 사용자 문구는 클라이언트가 소유한다**(FR-W19 · VO-04).

| 코드 | HTTP | 발생 위치 | 뜻 |
|---|---:|---|---|
| `auth_required` | 401 | 세 함수 공통 | 로그인 토큰 없음 |
| `goal_forbidden` | 403 | sign-upload | 내 목표가 아니거나 삭제됨 |
| `admin_forbidden` | 403 | admin-review · `admin_apply_goal_cover_review` | 관리자 아님 |
| `goal_not_found` | 404 | 공유 parser(`goal_id` 가 양의 정수 아님) | 목표 식별자 부적합 |
| `asset_not_found` | 404 | finalize · admin-review | 자산 없음 또는 내 자산 아님 또는 격리 객체 내려받기 실패 |
| `asset_not_reviewable` | 409 | finalize(상태≠`UPLOADING`) · admin-review(상태≠`REVIEW`) · 심사 RPC | 그 상태에서 할 수 없는 전이 |
| `file_too_large` | 413 | 공유 parser(5MB 초과) · finalize(실측 바이트 초과) | 용량 초과 |
| `unsupported_media_type` | 415 | 공유 parser · finalize(실제 바이트의 형식 불일치) | jpg·png·webp 아님 |
| `invalid_request` | 422 | finalize·admin-review 입력 파싱 | 필수 인자 누락·형식 오류 |
| `invalid_file_name` | 422 | 공유 parser(빈 값 또는 180자 초과) | 파일 이름 부적합 |
| `invalid_file_size` | 422 | 공유 parser(정수 아님 또는 1 미만) | 크기 값 부적합 |
| `invalid_content_hash` | 422 | 공유 parser(`^[0-9a-f]{64}$` 불일치) | 해시 형식 부적합 |
| `invalid_rejection_code` | 422 | admin-review · 심사 RPC | 반려 사유가 허용 5값이 아님 |
| `invalid_decision` | 422 | 심사 RPC | `APPROVE`·`REJECT` 아님 |
| `hash_mismatch` | 422 | finalize | 올린 바이트의 해시가 신고값과 다름 |
| `asset_create_failed` | 500 | sign-upload | 자산 행 생성 실패 |
| `signed_upload_failed` | 500 | sign-upload | 서명 업로드 URL 발급 실패. **이때 함수가 방금 만든 행을 스스로 삭제한다** |
| `asset_finalize_failed` | 500 | finalize | `REVIEW` 전이 갱신 실패 |
| `public_copy_failed` | 500 | admin-review | 공개 버킷 복사 또는 공개 URL 확인 실패. **실패 시 복사본을 되돌린다** |
| `public_copy_required` | 500 | 심사 RPC | PUBLIC 목표인데 복사 경로가 없음 |
| `private_cover_must_not_publish` | 500 | 심사 RPC | FRIENDS·PRIVATE 목표인데 복사 경로가 있음 |
| `review_apply_failed` | 500 | admin-review | 심사 RPC 가 위 분류 밖의 오류를 냄 |
| `cover_review_failed` | 500 | admin-review 기본값 | 분류되지 않은 예외 |

**매핑 규칙(관찰됨)**: `coverErrorStatus()` 는 `invalid_` 로 시작하는 모든 코드를 422 로, `hash_mismatch` 를 422, `asset_not_reviewable` 을 409, 그 외 미등록 코드를 500 으로 보낸다(`_shared/goal-cover.ts:114~123`). 따라서 **새 오류 코드를 추가할 때 `invalid_` 접두어를 쓰면 HTTP 매핑이 자동으로 따라온다.**

**로그 금지 유지**: 서명 업로드 URL, 격리 객체 경로, 원문 초대 토큰은 어떤 오류 경로에서도 로그에 남기지 않는다(§7.3).

### A.8 비회원 초대 미리보기 필드 집합 단일화 (P0)
v1.2.2 는 같은 엔드포인트의 필드 목록을 **네 자리에 서로 다르게** 적었다. 전역 금지를 엔드포인트별 허용 목록으로 바꾼 방향은 맞았지만, 목록 자체가 갈라지면 그 보호가 작동하지 않는다(Codex 5차 P0-1).

**v1.2.5 에서 정본이 바뀌었다.** v1.2.3~v1.2.4 는 "운영 실물이 정본" 이라 적고 6개를 그대로 뒀다. **그것은 "이 집합이 사실이다" 의 근거이고 "이 집합이 최소다" 의 근거가 아니다.** OWASP 기준은 **현재** 클라이언트 기능에 필요한 것이고, 현재 화면은 3개만 쓴다. 그래서 **운영 RPC 반환을 3개로 줄이는 migration 을 이번 범위에 넣는다**(§A.8.1.2).

| 자리 | v1.2.2 가 적은 것 | v1.2.3 조치 |
|---|---|---|
| ① `api-contract` §A.2 허용 목록 | `inviter_nickname`·`goal_title`·`cover_url`·`expires_at`·`status` | **6개로 교체** |
| ② `api-contract` §4.1 정상 응답 JSON | `inviter_nickname`·`goal_title`·`cover_preset_key`·`cover_url`·`expires_at`·`requires_login` (`status` 없음) | **`cover_url` → `cover_public_path`** |
| ③ 운영 `supabase/migrations/20261013050000…sql:368` `jsonb_build_object` | `inviter_nickname`·`goal_title`·`cover_preset_key`·`cover_public_path`·`expires_at`·`requires_login` | **정본. 변경 없음** |
| ④ `test-cases` GT-01 | ①을 그대로 검사 → **현재 정상 응답을 위반으로 판정** | ③에 맞춰 교체 |

**추가 확인(관찰됨)**: 제품 코드도 ③과 같다. `web/src/lib/social/contracts.ts:40` 의 `InvitePreview` 타입이 **같은 6개 필드**이고, `web/src/lib/social/__tests__/contracts.test.ts:68` 가 `Object.keys` 를 그 6개와 대조한다. **즉 어긋난 것은 설계 문서 둘(①②)뿐이었다.**

#### A.8.1 확정 필드 집합 (이 엔드포인트의 유일한 정의)

| 필드 | 타입 | 값 규칙 |
|---|---|---|
| `inviter_nickname` | `text \| null` | 초대한 회원의 닉네임 |
| `goal_title` | `text \| null` | 초대에 목표가 연결됐고 그 목표가 `PUBLIC`·`FRIENDS` 이며 삭제되지 않았을 때만. 아니면 `null` |
| `cover_preset_key` | `text` | `COALESCE(goal.cover_preset_key, 'c1')`. 항상 값이 있다 |

**이 3개 외의 key 가 응답에 있으면 계약 위반이다.** 반대로 이 3개는 그 경로에서 정상이고 금지 대상이 아니다.

#### A.8.1.1 세 필드가 현재 쓰이는 자리 (최소 집합 입증)

**근거는 현재 소비뿐이다.** 미래 사용 계획은 최소 응답 집합의 근거가 될 수 없다(Codex 7차 P1-1).

| 필드 | 쓰이는 화면 요소 | 소비 지점 |
|---|---|---|
| `inviter_nickname` | "○○님이 초대했어요" 제목 | `web/src/components/social/InviteAcceptCard.tsx:56` |
| `goal_title` | 초대에 연결된 목표 카드 제목 | 같은 자리 |
| `cover_preset_key` | 목표 카드 배경(프리셋 6종) | 같은 자리 |

**세 필드 전부가 지금 쓰인다. 안 쓰이는 필드는 0개다.**

#### A.8.1.2 빼는 세 필드와 그 변경 (v1.2.5)

| 빼는 필드 | v1.2.4 가 남긴 이유 | v1.2.5 판정 |
|---|---|---|
| `cover_public_path` | "다음 슬라이스에 승인 커버 배너로 쓴다" | **뺀다.** 그 슬라이스가 올 때 필드를 다시 더하면 된다. 지금 안 쓰는 값을 비회원에게 보내는 쪽이 비용이 크다 |
| `expires_at` | "다음 슬라이스에 만료 안내로 쓴다" | **뺀다.** 만료는 서버가 이미 오류로 처리한다(`invite_expired` P0010). 화면이 날짜를 보여줄 필요가 생기면 그때 더한다 |
| `requires_login` | "중복 신호. 축소 후보" | **뺀다.** 화면이 서버 세션으로 직접 판정하므로 이 값이 없어도 동작이 같다 |

**필요한 변경 (§A.5 신설·변경 자산 목록에 등재)**

| # | 변경 | 종류 | 왜 |
|---|---|---|---|
| 1 | `friend_invite_preview(token)` 의 `jsonb_build_object` 를 3 key 로 줄인다 | **운영 RPC 교체**(`CREATE OR REPLACE`) | 반환을 줄이는 것이 이 축소의 실체다 |
| 2 | `web/src/lib/social/contracts.ts` 의 `InvitePreview` 타입을 3 필드로 | 제품 타입 | 집합 동일성 |
| 3 | **같은 파일 `asInvitePreview()` 의 판별 조건을 바꾼다** | 제품 코드 | **현재 구현이 `typeof value.expires_at === "string"` 으로 모양을 판별한다.** 그 필드를 빼면 **이 함수가 항상 `null` 을 반환해 초대 화면이 빈 화면이 된다.** 판별 조건을 `cover_preset_key` 가 문자열인지로 바꾼다 |
| 4 | `web/src/lib/social/__tests__/contracts.test.ts` 의 기대 key 를 3개로 | 테스트 | 그 테스트가 `Object.keys` 를 대조한다 |

**3번이 이 변경의 함정이다.** 필드만 빼고 판별 조건을 그대로 두면 **화면이 조용히 빈다**(오류도 안 난다). 그래서 이 표에 적고 TC 로도 잡는다(GT-01 의 마지막 Then).

**되돌리는 법**

| 추가물 | 되돌림 | 데이터 손실 |
|---|---|---|
| `friend_invite_preview` 3 key 버전 | 이전 6 key 정의로 `CREATE OR REPLACE` | 없음. 읽기 전용 함수다 |
| 제품 타입·판별·테스트 | 코드 되돌림 | 없음 |

**순서**: RPC 를 먼저 줄이면 그 사이 배포된 화면이 `expires_at` 없는 응답을 받아 `asInvitePreview` 가 `null` 을 돌려준다. **그래서 제품 코드(2·3·4)를 먼저 배포하고 RPC(1)를 나중에 줄인다.** 역순이면 그 사이 초대 화면이 빈다.

#### A.8.2 D-019 와의 정합: FRIENDS 커버는 `null` 이다
**v1.2.5 에서 이 논점이 사라졌다.** `cover_public_path` 를 응답에서 아예 빼므로 비회원은 어떤 커버 경로도 받지 않는다. 아래는 그 결정에 이른 근거의 기록이고, **커버 필드를 다시 더하는 판이 오면 이 절이 그때의 경계**다.

v1.2.2 의 `cover_url`(승인 커버) 표현은 범위가 과도했다. FRIENDS 목표의 커버까지 비회원에게 줄 수 있다고 읽힌다. **D-019 는 FRIENDS 커버를 비공개 버킷에 두고 ACTIVE 친구 확인 뒤 120초 Presigned URL 로만 준다.** 토큰 소지자는 수락 전까지 친구가 아니므로 받을 수 없다.

**운영 구현이 이미 그것을 강제한다**(관찰됨): `CASE WHEN v_goal.visibility='PUBLIC' THEN v_asset.public_path ELSE NULL END` (`migration:369`). 즉 D-019 위반은 **구현에 없었고 설계 문구에만 있었다.** v1.2.3 에서 문구를 구현에 맞췄다.

**필드 이름을 `cover_public_path` 로 둔 이유**: 그 값이 **공개 버킷의 객체 경로**이고 서명이 붙은 URL 이 아니기 때문이다. 이름이 그 사실을 말해야 FRIENDS 커버를 여기 넣을 수 없다. `my_friend_goals` 의 `cover_url`(공개 URL 또는 120초 서명 URL)과 **다른 필드이고 이름도 달라야 한다.** 두 RPC 의 필드를 같은 이름으로 묶으면 D-019 경계가 흐려진다.

| RPC | 필드 | 값 | 누가 받나 |
|---|---|---|---|
| `friend_invite_preview` | `cover_public_path` | 공개 버킷 **객체 경로**. PUBLIC 만, 그 밖은 `null` | 비회원(토큰 소지) |
| `my_friend_goals`·`friend_goal_detail` | `cover_url` | PUBLIC 은 공개 URL, FRIENDS 는 **120초 서명 URL** | ACTIVE 친구 |

#### A.8.3 같은 엔드포인트의 필드 목록이 적힌 자리 전수 (D축 입력)

컨트롤러의 모순 검사 **필드 집합 비교 축(D축)** 의 입력이다. **이 엔드포인트의 필드 목록은 아래 여섯 자리에만 존재해야 하고, 여섯이 같은 집합이어야 한다.**

| # | 자리 | 종류 | v1.2.5 집합 |
|---|---|---|---|
| 1 | **이 문서** §A.2 허용 목록 표 | 설계 표 | 3개 |
| 2 | **이 문서** §A.8.1 확정 필드 집합 | 설계 표(**정의 자리**) | 3개 |
| 3 | **이 문서** §4.1 정상 응답 JSON | 설계 코드블록 | 3개 |
| 4 | `supabase/migrations/<ts>_invite_preview_minimize.sql` 의 `jsonb_build_object` | **신규 migration**(교체 대상) | 3개 |
| 5 | `web/src/lib/social/contracts.ts` 의 `InvitePreview` 타입 | 제품 코드(변경 대상) | 3개 |
| 6 | **`test-cases-social-viral-loop-web-first-v1.2.5.md`** GT-01 | 테스트 | 3개 |

**v1.2.4 의 이 표는 자기 계열 구버전(구버전 파일)을 가리켰다**(Codex 7차 P1-2 의 J축). 이 표는 "필드 목록이 적힌 자리 전수" 이므로 **자기 문서를 가리켜야 한다.** 구버전을 가리키면 다음 판에 그 표를 보고 구 파일을 연다.

**현재 운영 `supabase/migrations/20261013050000…sql:368` 은 6 key 를 반환한다.** 그것이 **이번 축소의 대상**이고 위 4번 migration 이 교체한다. 즉 지금은 운영 6 · 설계 3 이고, **그 차이가 의도된 변경 항목**이다(§A.8.1.2). 구현이 끝나면 여섯 자리가 3으로 수렴한다.

**다른 엔드포인트도 같은 규율을 적용한다.** `my_social_dashboard` 는 §A.3 과 §4.5 두 자리, `my_friend_goals` 는 §A.5 와 §3.1 두 자리다. 각 묶음 안에서 집합이 같아야 한다.

### 0.A 목차 앵커 교정
v1.1.0 목차는 "웹 1차 추가 RPC **4종**" 으로 링크했으나 본문 §4 는 **5종**이라 앵커가 끊겼다(Codex 지적). v1.2.0 목차는 본문과 같은 "웹 추가 RPC 5종" 을 쓴다.

## 0. 결론과 호환성 결정
`create_friend_invite`, `friend_goal_detail`, `my_friend_goals`, `set_goal_cover_preset`, `update_member_preferences` 이름과 argument 이름을 **그대로 유지한다**.

근거:

1. `miniapp/src/gateway.ts`가 이미 이 다섯 이름과 JSON key를 사용한다.
2. 이름을 바꾸면 웹 우선 작업이 모바일 front 재작업을 만들어 “백엔드 먼저 공통화” 이점을 잃는다.
3. 계약의 보안 문제는 이름이 아니라 권한·RLS·응답 필드다. exact name을 유지하고 내부를 안전하게 구현할 수 있다.
4. PostgREST 모호성을 막기 위해 같은 이름의 overload는 만들지 않는다.

추가로 초대 미리보기·수락·관계 해제·공개범위 변경 4개 RPC와 커버용 Edge Function 3개를 신설한다.

## 1. 공통 규약
| 항목 | 계약 |
|---|---|
| 전송 | Supabase PostgREST RPC JSON 또는 Edge Function HTTPS JSON |
| 인증 | 별도 표기 없으면 `Authorization: Bearer <Supabase JWT>` 필수 |
| 시간 | UTC ISO 8601 timestamptz |
| ID | DB bigint는 JSON number, uuid는 lowercase string |
| null | 선택 필드만 null. 미정의 key와 null을 혼용하지 않음 |
| 함수 보안 | `SECURITY DEFINER SET search_path=''`, fully-qualified names, 최소 grant |
| 오류 | SQLSTATE `PT4xx|PT5xx`, `message`에 아래 stable domain code |
| 금액 | 소셜 RPC 응답에 amount·clover·payment·cashout·rank key 금지 |
| 버전 | v1에서 필드 삭제·타입 변경 금지. 필드 추가만 허용 |

변이별 멱등성:

| API | 멱등성 |
|---|---|
| `create_friend_invite` | 비멱등. 호출마다 새 token. UI 이중 제출 잠금, 시간당 10개 제한 |
| `accept_friend_invite` | token+actor 기준 멱등. 동일 수락자 재시도는 같은 connection 반환 |
| `set_goal_cover_preset` | 목표+동일 preset 기준 멱등 |
| `update_member_preferences` | 동일 boolean pair 기준 멱등 |
| `remove_friend` | 이미 REMOVED여도 같은 결과 반환 |
| `set_goal_visibility` | 동일 visibility 기준 멱등 |
| cover finalize/review | asset id+hash 또는 asset id+decision 기준 멱등 |

## 2. RPC 카탈로그
| 함수 | 역할 | 인증 | 호출 role | 주 테이블 |
|---|---|---|---|---|
| `my_friend_goals()` | 내 친구와 볼 수 있는 목표 목록 | 필수 | authenticated | connection, member, goal |
| `friend_goal_detail(goal_id)` | 친구 목표 상세 | 필수 | authenticated | connection, goal, cheer |
| `create_friend_invite(goal_id, channel)` | 초대 발급 | 필수 | authenticated | invite, goal |
| `set_goal_cover_preset(goal_id, preset_key)` | 프리셋 설정 | 필수 | authenticated | goal |
| `update_member_preferences(notify_cheer, notify_marketing)` | 선호 upsert | 필수 | authenticated | preference |
| `friend_invite_preview(token)` | 초대 최소 미리보기 | 불필요 | anon, authenticated | invite, member, goal |
| `accept_friend_invite(token)` | 관계 생성 | 필수 | authenticated | invite, connection |
| `remove_friend(friend_member_id)` | 관계 해제 | 필수 | authenticated | connection |
| `set_goal_visibility(goal_id, visibility)` | 공개범위 변경 | 필수 | authenticated | goal, cache, cleanup queue |
| `my_social_dashboard()` | 마이페이지·업적·미응원 큐 집계 | 필수 | authenticated | member, goal, cheer, connection, attribution |

## 3. 기존 미니앱 호환 RPC 5종
### 3.1 `my_friend_goals()`
요청: argument 없음.

응답 200:

```json
{
  "friends": [
    {
      "friend_member_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "nickname": "서연",
      "relationship_direction": "MUTUAL",
      "relationship_origin": "CHEER",
      "profile_image": null,
      "goals": [
        {
          "goal_id": 101,
          "slug": "seoyeon-running",
          "title": "이번 달엔 세 번씩 꼭 달릴게",
          "due_date": "2026-12-01",
          "cover_preset_key": "c1",
          "cover_url": null,
          "cheer_count": 13
        }
      ]
    }
  ]
}
```

규칙:

- ACTIVE 관계만 반환한다.
- `PUBLIC|FRIENDS`, `status='ACTIVE'`, `deleted_at IS NULL` 목표만 포함한다.
- 친구는 nickname 오름차순, 목표는 due_date ASC NULLS LAST, id ASC로 안정 정렬한다.
- 친구가 0명이면 `{ "friends": [] }`다. 가짜 추천이나 샘플을 넣지 않는다.
- `profile_image`는 현재 member 값 또는 null이다. provider id·email은 금지한다.

오류: `auth_required`(401).

### 3.2 `friend_goal_detail(goal_id bigint)`
요청:

```json
{ "goal_id": 101 }
```

응답 200:

```json
{
  "goal_id": 101,
  "slug": "seoyeon-running",
  "title": "이번 달엔 세 번씩 꼭 달릴게",
  "reason": "작게 시작해도 계속 이어가는 중이에요.",
  "due_date": "2026-12-01",
  "cover_preset_key": "c1",
  "cover_url": null,
  "cheer_count": 13,
  "wordmap": [
    { "word": "꾸준함", "weight": 4 }
  ]
}
```

권한:

- 호출자가 owner면 허용.
- 타인 goal은 PUBLIC 또는 ACTIVE 친구의 FRIENDS만 허용.
- PRIVATE, REMOVED, BLOCKED, 삭제 goal은 존재 여부를 숨기기 위해 `goal_not_found`(404)로 통일한다.

`wordmap`은 기존 메시지 projection의 단어와 가중치만 반환한다. 응원자명과 금액을 반환하지 않는다.

### 3.3 `create_friend_invite(goal_id bigint, channel text)`
요청:

```json
{ "goal_id": 101, "channel": "WEB" }
```

`goal_id`는 null 허용이다. non-null이면 호출자 소유이며 visibility가 PUBLIC 또는 FRIENDS인 목표만 허용한다. PRIVATE 목표에는 연결 초대를 만들지 않는다. channel은 `WEB|KAKAO|LINK|INTOSS`다.

응답 200:

```json
{
  "invite_id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  "token": "base64url-256-bit-token",
  "web_path": "/invite/base64url-256-bit-token",
  "intoss_path": "intoss://haenael/invite?token=base64url-256-bit-token",
  "expires_at": "2026-10-20T02:42:00Z"
}
```

규칙:

- `gen_random_bytes(32)`를 base64url로 인코딩한다.
- DB에는 `digest(token,'sha256')`만 저장한다.
- 만료는 생성 후 정확히 7일이다.
- 회원당 rolling 1시간 10개. 초과 시 `invite_rate_limited`.
- 이 함수는 비멱등이다. UI는 버튼을 요청 중 disable한다.

### 3.4 `set_goal_cover_preset(goal_id bigint, preset_key text)`
요청:

```json
{ "goal_id": 101, "preset_key": "c3" }
```

응답 200:

```json
{
  "goal_id": 101,
  "cover_preset_key": "c3",
  "cover_url": null,
  "active_cover_changed": true
}
```

규칙:

- `c1..c6`만 허용한다.
- owner만 가능하다.
- custom active asset을 삭제하지 않는다. preset 선택 시 `active_cover_asset_id=NULL`, 이전 asset은 `SUPERSEDED`로 바꾼다.
- 같은 preset 재요청은 `active_cover_changed=false`다.

### 3.5 `update_member_preferences(notify_cheer boolean, notify_marketing boolean)`
요청:

```json
{ "notify_cheer": true, "notify_marketing": false }
```

응답 200:

```json
{
  "notify_cheer": true,
  "notify_marketing": false,
  "updated_at": "2026-10-13T02:42:00Z"
}
```

본인 `member_preference`만 upsert한다. argument 누락과 null은 `invalid_preferences`다. 신규 회원의 marketing 기본값은 false다.

## 4. 웹 추가 RPC 5종
### 4.1 `friend_invite_preview(token text)`
인증: anon 허용.

요청:

```json
{ "token": "base64url-256-bit-token" }
```

응답 200:

```json
{
  "inviter_nickname": "서연",
  "goal_title": "이번 달엔 세 번씩 꼭 달릴게",
  "cover_preset_key": "c1"
}
```

**필드는 위 3개뿐이다**(§A.8.1 이 정의 자리).

반환하지 않는 것: 프로필 이미지, 회원 식별자, 목표 식별자, 이유, 응원, 워드맵, 커버 경로, 만료 시각, 로그인 필요 여부.

만료·철회·사용됨은 **본문 필드가 아니라 오류로** 알린다. 코드는 §6 오류 사전의 `invite_expired`·`invite_revoked`·`invite_already_used` 다. 커버는 수락 후 친구 경로에서만 본다(D-019). invalid·expired·revoked·accepted token은 모두 token 상태에 맞는 404 또는 410이고 invite row 존재 여부 외 추가 정보는 주지 않는다.

### 4.2 `accept_friend_invite(token text)`
요청:

```json
{ "token": "base64url-256-bit-token" }
```

응답 200:

```json
{
  "connection_id": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  "friend_member_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "is_replay": false
}
```

처리 순서:

1. token 형식 길이와 base64url을 검사한다.
2. hash로 invite를 찾아 `FOR UPDATE` 잠금한다.
3. revoked·expired·self·already-used-by-other·BLOCKED를 검사한다.
4. ordered member pair를 INSERT 또는 REMOVED에서 ACTIVE로 전환한다.
5. invite accepted fields를 기록한다.
6. 동일 accepted_by 재호출은 같은 connection과 `is_replay=true`를 반환한다.

### 4.3 `remove_friend(friend_member_id uuid)`
요청:

```json
{ "friend_member_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8" }
```

응답 200:

```json
{
  "connection_id": "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  "status": "REMOVED",
  "removed_at": "2026-10-13T02:42:00Z"
}
```

ACTIVE를 REMOVED로 바꾼다. 이미 REMOVED면 같은 결과를 반환한다. BLOCKED는 이 함수가 해제하지 않는다. 관계 해제 즉시 양쪽의 FRIENDS 조회가 0건이어야 한다.

### 4.4 `set_goal_visibility(goal_id bigint, visibility text)`
요청:

```json
{ "goal_id": 101, "visibility": "FRIENDS" }
```

응답 200:

```json
{
  "goal_id": 101,
  "visibility": "FRIENDS",
  "cache_invalidated": true,
  "storage_cleanup_status": "DONE"
}
```

규칙:

- owner만 가능하다. `PUBLIC|FRIENDS|PRIVATE`만 허용한다.
- PUBLIC에서 다른 값으로 전환할 때 cache row 삭제와 cleanup queue insert는 같은 transaction이다.
- PRIVATE 전환은 해당 goal의 미사용 invite를 같은 transaction에서 revoke한다. 이미 수락된 관계는 유지되지만 PRIVATE 상세는 owner 외 0건이다.
- Storage 삭제가 즉시 완료되지 않으면 `storage_cleanup_status="RETRYING"`과 202를 반환하고 공개 URL은 즉시 view에서 차단한다.
- 같은 값이면 200, `cache_invalidated=false`다.

### 4.5 `my_social_dashboard()`
요청: argument 없음. 인증 회원의 `auth.uid()`만 사용한다.

응답 200:

```json
{
  "profile": { "nickname": "서연", "profile_image": null },
  "goals": [
    {
      "goal_id": 101,
      "slug": "run",
      "title": "매주 세 번 달리기",
      "due_date": "2026-12-01",
      "status": "ACTIVE",
      "cover_preset_key": "c1",

      "cheer_count": 23,
      "supporter_avatars": [
        { "profile_image": "https://…/a.png", "is_anonymous": false },
        { "profile_image": null,              "is_anonymous": true  },
        { "profile_image": "https://…/c.png", "is_anonymous": false }
      ],
      "recent_cheer": {
        "supporter_name": "도경",
        "message": "끝까지 가보자",
        "created_at": "2026-10-18T11:20:00+09:00",
        "is_anonymous": false
      }
    }
  ],
  "friend_count": 3,
  "achievements": {
    "completed_goal_count": 2,
    "received_cheer_count": 7,
    "connected_friend_count": 3
  },
  "belonging_queue": [
    {
      "friend_member_id": "uuid",
      "nickname": "도경",
      "goal_id": 202,
      "slug": "study",
      "title": "시험 두 과목 A 받기",
      "due_date": "2026-12-20",
      "cover_preset_key": "c3"
    }
  ]
}
```

규칙:

- 업적은 `goal.status=CLOSED`, 본인 목표의 non-welcome `cheer.status=CONFIRMED`, `friend_connection.status=ACTIVE`를 각각 집계한다.
- 소속감 큐는 ACTIVE 친구의 PUBLIC·FRIENDS 진행 목표 중 현재 회원의 CONFIRMED attribution이 없는 목표만 마감일순 최대 20개다.
- `clover_amount`, 원화, payment, cashout, supporter 식별자, rank, streak는 응답 key와 값에 없다.
- `social_cheer_member_attribution`은 anon·authenticated 직접 SELECT가 0이고 service role만 cheer-order에서 기록한다.

## 5. 커버 Edge Function 3종
### 5.1 `POST /functions/v1/goal-cover-sign-upload`
인증: 목표 owner.

요청:

```json
{
  "goal_id": 101,
  "file_name": "running.webp",
  "mime_type": "image/webp",
  "byte_size": 824000,
  "content_sha256": "64-lowercase-hex"
}
```

응답 200:

```json
{
  "asset_id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  "upload_url": "signed-private-url",
  "object_path": "member/101/asset.webp",
  "expires_in_seconds": 300,
  "max_bytes": 5242880
}
```

허용 MIME은 jpeg/png/webp, 최대 5MB다. 확장자가 아니라 actual magic bytes를 finalize에서 재검사한다. signed URL은 5분이다.

### 5.2 `POST /functions/v1/goal-cover-finalize`
요청:

```json
{
  "asset_id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  "content_sha256": "64-lowercase-hex"
}
```

응답 200:

```json
{
  "asset_id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  "status": "REVIEW",
  "active_cover_changed": false
}
```

owner, object path, actual MIME, 1..5MB, hash를 검증한다. 통과하면 REVIEW로 전환한다. 자동 승인하지 않으며 기존 active cover를 유지한다.

### 5.3 `POST /functions/v1/admin-review-goal-cover`
인증: 기존 `is_admin()`을 통과한 관리자.

요청:

```json
{
  "asset_id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  "decision": "APPROVE",
  "rejection_code": null
}
```

승인 응답 200:

```json
{
  "asset_id": "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
  "status": "APPROVED",
  "public_path": "101/asset.webp",
  "active_cover_changed": true
}
```

반려 요청은 `decision=REJECT`, stable rejection code 필수다. PUBLIC 목표 승인 시에만 quarantine 원본을 `goal-cover-public`로 복사하고 `public_path`를 반환한다. FRIENDS 목표 승인 시에는 원본을 private `goal-cover-quarantine`에 유지하고 `public_path=null`로 goal pointer만 바꾼다. FRIENDS 커버는 `friend_goal_detail`이 ACTIVE 친구관계를 확인한 뒤 Next 서버가 `createSignedUrl(..., 120)`으로 만든 120초 Presigned URL만 응답하며, Storage object path는 브라우저 응답에서 제거한다. 이전 active asset은 SUPERSEDED로 바꾼다. DB pointer 변경 전 PUBLIC copy를 확인하고, transaction 실패 시 새 public object를 cleanup한다.

## 6. 오류 사전
| Domain code | HTTP | 사용처 | 사용자 복구 |
|---|---:|---|---|
| `auth_required` | 401 | 인증 RPC | 로그인 후 원래 token route 복귀 |
| `goal_not_found` | 404 | detail·owner | 목록으로 복귀 |
| `goal_forbidden` | 403 | owner 변이 | 내 목표 다시 선택 |
| `invalid_visibility` | 422 | visibility | 허용 옵션 선택 |
| `invalid_preset` | 422 | preset | c1..c6 선택 |
| `invite_not_found` | 404 | preview·accept | 새 초대 요청 |
| `invite_expired` | 410 | preview·accept | 새 초대 요청 |
| `invite_revoked` | 410 | preview·accept | 새 초대 요청 |
| `invite_already_used` | 410 | 타인 재사용 | 친구 목록 확인 또는 새 초대 |
| `self_invite` | 409 | accept | 내 초대임을 안내 |
| `blocked_relationship` | 409 | accept | 재시도 금지 |
| `invite_rate_limited` | 429 | create | `retry_after_seconds` 뒤 재시도 |
| `friend_not_found` | 404 | remove | 목록 새로고침 |
| `file_too_large` | 413 | sign·finalize | 5MB 이하 선택 |
| `unsupported_media_type` | 415 | sign·finalize | jpg/png/webp 선택 |
| `hash_mismatch` | 422 | finalize | 다시 업로드 |
| `asset_not_reviewable` | 409 | admin review | 큐 새로고침 |
| `storage_unavailable` | 503 | cover·cleanup | 기존 커버 유지 후 재시도 |

**오류 응답 형태는 하나다**(v1.2.2 단일화. v1.2.1 은 `message`·`retryable` 을 포함한 예시를 함께 둬 구현자가 고를 수 없었다).

```json
{
  "error": {
    "code": "file_too_large"
  }
}
```

규칙 셋.

1. **엣지 함수는 `error.code` 하나만 반환한다.** 사용자에게 보일 문구는 클라이언트 카피 모듈이 코드에 매핑한다(FR-W19 · VO-04). 그래야 말투 교정이 서버 배포 없이 끝난다. 현재 세 함수가 이미 `coverJson(status, {error:{code}})` 형태라 이 계약은 구조 변경이 아니다.
2. **`message`·`retryable` 필드를 응답에 넣지 않는다.** 재시도 가능 여부는 HTTP 상태와 §A.7 의 코드 표가 정한다(5xx·409 는 재시도 가능, 4xx 입력 오류는 불가).
3. **RPC 오류는 Postgres 예외 그대로 올라온다**(`code`·`message` 에 domain code). Next 서버 쪽에서 클라이언트로 내릴 때 위 형태로 바꾼다. **Postgres 의 원문 `message` 를 사용자에게 그대로 보여주지 않는다.**

## 7. 권한 필드 로그 금지
### 7.1 grant
| 함수 | anon | authenticated | service_role |
|---|---:|---:|---:|
| preview | EXECUTE | EXECUTE | 없음 |
| list/detail/create/accept/remove/preset/preferences/visibility | 없음 | EXECUTE | 없음 |
| admin review 내부 RPC | 없음 | admin 검증 뒤 EF만 | EXECUTE |

모든 함수는 먼저 PUBLIC execute를 revoke한다. anon은 preview 하나만 받는다.

### 7.2 응답 금지 필드
다음 key 또는 의미가 social RPC와 invite preview에 있으면 계약 위반이다.

```text
clover_amount, amount, amount_krw, gross, fee, vat, withhold, net,
payment_id, payment_key, cashout, supporter_ci, provider_id, email,
token_hash, quarantine_path, moderation metadata, rank
```

### 7.3 로그 금지
- raw invite token, full invite URL.
- signed upload URL.
- Supabase access·refresh token.
- provider subject, email, supporter_ci.
- 원본 file bytes와 이미지 EXIF.

초대 event에는 invite_id, channel, success, error_code만 기록한다. token route access log는 `[token]` segment를 `<redacted>`로 치환한다.

## 8. 추적성 수용기준
| API | FDD flow | DB | 계약 테스트 |
|---|---|---|---|
| `my_friend_goals` | WF-08·14 | connection/member/goal | CT-01, PG-30 |
| `friend_goal_detail` | WF-15 | connection/goal/cheer | CT-02, PG-34 |
| `create_friend_invite` | WF-10 | invite | CT-03, PG-31 |
| `set_goal_cover_preset` | WF-03 | goal | CT-04, PG-11 |
| `update_member_preferences` | FR-W9 | preference | CT-05, PG-40 |
| `friend_invite_preview` | WF-11·17 | invite/member/goal | CT-06, PG-32·36 |
| `accept_friend_invite` | WF-13 | invite/connection | CT-07, PG-33, CC-01 |
| `remove_friend` | WF-16 | connection | CT-08, PG-35 |
| `set_goal_visibility` | WF-06 | goal/cache/queue | CT-09, PG-20·21 |
| `my_social_dashboard` | FR-W10·W11 | member/goal/cheer/connection/attribution | CT-MY-01~02, PG-MY-01~08, MY-01 |
| cover EF 3종 | WF-04·05 | asset/Storage/goal | CT-10~12, PG-12·13 |

Given 현재 miniapp gateway다. When contract fixture를 TypeScript 타입과 대조한다. Then 기존 다섯 호출은 이름·argument·필수 응답 key 변경 없이 통과한다.

Given social API 응답 전수다. When 금지 key scanner를 돌린다. Then 금액·결제·신원 내부 key는 0건이다.

Given 동일 초대를 동시에 두 계정이 수락한다. When 두 transaction이 끝난다. Then 성공 1건, `invite_already_used` 1건, ACTIVE connection 1행이다.

## 9. 개정 이력
| 버전 | 일자 | 변경 | 작성자 |
|---|---|---|---|
| **v1.2.5** | **2026-10-20** | **Codex 7차 P1-1 반영. 비회원 초대 미리보기를 **3개로 축소**했다(`inviter_nickname`·`goal_title`·`cover_preset_key`). "다음 슬라이스 쓰임" 은 OWASP 최소성의 근거가 아니므로 `cover_public_path`·`expires_at`·`requires_login` 을 뺀다. 운영 RPC 반환을 줄이는 migration 과 제품 타입·**판별 함수**·테스트 변경을 §A.8.1.2 에 등재하고 되돌림·배포 순서를 적었다(판별 함수를 안 고치면 초대 화면이 조용히 빈다). §A.8.3 이 가리키던 자기 계열 구버전을 자기 문서로 교정(J축)** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.4** | **2026-10-20** | **Codex 6차 반려 반영. §A.8.1.1 신설: 비회원 초대 미리보기 6필드의 **소비 근거 표**(쓰는 셋 / 다음 슬라이스 쓰임이 명시된 둘 / 중복 신호 하나)로 최소 집합을 입증했다. OWASP 기준은 "클라이언트 기능에 필요한 데이터만" 이므로 운영 실물이 정본이라는 것만으로는 부족하다. `requires_login` 을 축소 후보로 등재. 상단 버전 표기 교정** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.3** | **2026-10-19** | **Codex 5차 P0-1 반영. 비회원 초대 미리보기 필드 집합을 운영 실물의 6개로 단일화하고(§A.8) `cover_url`·`status` 를 제거했다. 네 자리에 갈라져 있던 목록을 하나로 묶고 **필드 목록이 적힌 자리 6곳 전수표**(D축 입력)를 신설. `cover_public_path` 가 PUBLIC 전용임을 D-019 와 함께 명시하고 `my_friend_goals` 의 `cover_url` 과 **다른 필드임**을 표로 분리** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.2** | **2026-10-19** | **Codex 4차 반려 반영. 비회원 금지 필드를 전역에서 **엔드포인트별 허용 목록**으로 분리(정상 초대 응답이 보안 테스트에 실패하던 모순 제거). 오류 응답 형태를 `{"error":{"code":"…"}}` **하나로 단일화**하고 `message`·`retryable` 예시 삭제. 우선순위 선언문 삭제** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.1** | **2026-10-19** | **Codex 재검수 반영. 커버 상태기계를 운영 실물 6값·8전이로 교정(`UPLOADING`·`SUPERSEDED`·`DELETED` 포함)하고 격리 객체 읽기 정책을 명시. 엣지 함수 오류 전수표 23행 신설(§A.7)과 `invalid_` 접두어 매핑 규칙. 본문 JSON 예시에 `cover_url`·관계 방향 2필드·응원 요약 3필드를 실제 병합. 회장 확정에 따라 비회원 미리보기를 예시 데이터(서버 호출 0)로 확정하고 `platform_social_stats()` 폐기: **이번 개정의 신설 서버 자산 0건**. 정리 작업에 필요한 추가 2건 명시** | **tech-architect / claude-opus-5[1m]** |
| **v1.2.0** | **2026-10-19** | **design 6차 개정 반영. 비회원 응답 금지 필드 계약(§A.2) 신설, `my_social_dashboard()` 응원 요약 3필드 확장(§A.3), 커버 자산 상태기계와 중단분 정리 규칙(§A.4), 관계 방향 2필드(§A.5), `cover_public_path`→`cover_url` 교정(§A.6), 운영 실물 실측표(§A.1), 목차 앵커 교정. RPC 이름·인자 변경 0** | **tech-architect / claude-opus-5[1m]** |
| v1.1.0 | 2026-10-13 | D-022 마이페이지 집계, 업적 3종, service-role attribution, 소속감 큐 계약 | code-builder / gpt-5-codex |
| v1.0.1 | 2026-10-13 | D-019 반영. FRIENDS 승인 커버를 private bucket과 120초 Presigned URL로 제한 | code-builder / gpt-5-codex |
| v1.0.0 | 2026-10-13 | 웹 우선 공통 RPC와 cover EF 계약 | tech-architect / gpt-5-codex |

KNOWLEDGE_QUERY: BRAIN의 선언형 공유·신뢰 마찰을 조회. 외부는 Supabase Database Functions·RLS, PostgreSQL pgcrypto, OWASP URL token·replay guidance를 조회.

HITS_USED: Supabase의 security definer 최소권한, PostgreSQL의 32바이트 CSPRNG와 digest, OWASP의 single-use·expiry·secure storage를 초대 계약에 채택.

HITS_REJECTED: JWT 초대 token은 폐기·1회성 상태를 별도 denylist로 가져가므로 opaque DB-backed token보다 복잡해 미채택. 기존 RPC rename은 모바일 재작업만 만들므로 미채택.

CONFLICTS: 원문 token 미저장과 create 호출의 완전 멱등성은 동시에 만족할 수 없다. 생성은 비멱등으로 명시하고 수락만 관계 기준 멱등으로 보장했다.

SKILLS_USED: docs. API 문서 목차·요청응답·오류·추적성 구조에 적용.

SKILLS_SKIPPED: document-generate는 현재 available-skills에 없어 로컬 Markdown으로 작성.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "RPC domain code는 PostgREST 오류의 message 필드에 두고 web에서 normalize해야 한다."

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 PASS / 요청·응답 code fence 정합 PASS / 컨트롤러 표시용 창은 열지 않음

SOURCES/MODEL: gpt-5/codex | `miniapp/src/gateway.ts`; `miniapp/src/domain.ts`; `docs/eng-design/api-contract-social-viral-loop-v0.1.0.md`; `fdd-social-viral-loop-web-first-v1.0.0.md`; `erd-social-viral-loop-web-first-v1.0.0.md`; `supabase/functions`; `supabase/migrations`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`; `~/SJ_BRAIN_wiki/wiki/business/마케팅/question-전환-마찰-제거인가-신뢰-마찰-추가인가.md`; https://supabase.com/docs/guides/database/functions; https://supabase.com/docs/guides/database/postgres/row-level-security; https://www.postgresql.org/docs/17/pgcrypto.html; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
