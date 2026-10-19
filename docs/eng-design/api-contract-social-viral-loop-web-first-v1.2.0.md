# 해낼게 V2 소셜 바이럴 루프 웹 우선 API 계약

| 항목 | 값 |
|---|---|
| 버전 | **v1.2.0** (v1.1.0 의 개정) |
| 작성일 | v1.1.0 2026-10-13 02:42 KST · **v1.2.0 개정 2026-10-19 16:3x KST** |
| 작성자/모델 | v1.1.0 tech-architect / gpt-5-codex · **v1.2.0 tech-architect / claude-opus-5[1m]** |
| 작업 라인 | v2 |
| 상태 | 웹 1차·모바일 2차 공통 계약. **§A.5 의 D-OPEN-1·3 은 합의 대기** |
| 상류 핀 | `fdd-social-viral-loop-web-first-v1.2.0.md` · `erd-social-viral-loop-web-first-v1.2.0.md` · `docs/design/prototypes/social-viral-loop-v3-opus5.html` 3.0.0 sha256 `f9398150755d…` · `DESIGN.md` sha256 `0ddeed8caff7…` |
| 기반 포맷 | `docs/eng-design/api-contract-social-viral-loop-web-first-v1.1.0.md` (v1.1.0, sha256 `ab54f04fd13f…`) |

> STAMP: 생성 2026-10-13 02:42 KST. 모델 gpt-5-codex. 에이전트 tech-architect. 스킬 docs. 근거는 `miniapp/src/gateway.ts`의 실호출, 기존 Supabase RPC·Edge Function 관습, Supabase 공식 함수 보안 문서다. 가장 오래 고민한 지점은 토큰 원문을 저장하지 않으면서 초대 생성 재시도를 어떻게 설명할지였다. 결론은 생성은 비멱등, 수락은 관계 기준 멱등으로 분리하는 것이다.

> PATCH v1.0.1 사유: D-019 확정에 따라 PUBLIC 승인 커버만 public bucket으로 복사하고, FRIENDS 승인 커버는 private bucket에 유지한 뒤 친구 자격 확인 후 120초 Presigned URL로만 제공하도록 서버 함수 계약을 바로잡았다.

> v1.1.0 사유: D-022의 마이페이지와 반증 가능한 업적을 위해 `my_social_dashboard()`를 추가한다. 회원-응원 귀속 원본은 service role 전용 테이블에 격리하고 응답에는 집계와 미응원 목표만 노출한다.

## 목차

- [A. v1.2.0 개정 (6차 개정 반영)](#a-v120-개정-6차-개정-반영)
  - [A.1 운영 실물 실측표](#a1-운영-실물-실측표)
  - [A.2 비회원 응답 계약 (FR-W18 · OWASP Excessive Data Exposure)](#a2-비회원-응답-계약-fr-w18--owasp-excessive-data-exposure)
  - [A.3 `my_social_dashboard()` 응원 요약 확장 (R6)](#a3-my_social_dashboard-응원-요약-확장-r6)
  - [A.4 커버 자산 상태기계 (R5 · FR-W13)](#a4-커버-자산-상태기계-r5--fr-w13)
  - [A.5 관계 방향 필드 (D-024 · D-026)](#a5-관계-방향-필드-d-024--d-026)
  - [A.6 응답 예시 교정](#a6-응답-예시-교정)
- [0. 결론과 호환성 결정](#0-결론과-호환성-결정)
- [1. 공통 규약](#1-공통-규약)
- [2. RPC 카탈로그](#2-rpc-카탈로그)
- [3. 기존 미니앱 호환 RPC 5종](#3-기존-미니앱-호환-rpc-5종)
- [4. 웹 추가 RPC 5종](#4-웹-추가-rpc-5종)
- [5. 커버 Edge Function 3종](#5-커버-edge-function-3종)
- [6. 오류 사전](#6-오류-사전)
- [7. 권한·필드·로그 금지](#7-권한필드로그-금지)
- [8. 추적성·수용기준](#8-추적성수용기준)
- [9. 개정 이력](#9-개정-이력)

## A. v1.2.0 개정 (6차 개정 반영)

> **§A 와 본문이 충돌하면 §A 가 이긴다.** 기존 RPC 이름·인자 이름은 하나도 바꾸지 않는다(미니앱 호환 계약 유지).

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

### A.2 비회원 응답 계약 (FR-W18 · OWASP Excessive Data Exposure)

R2 로 비회원이 회원 전용 탭을 누르면 가치 미리보기 시트가 열린다. 승인 프로토타입은 그 안에 이름·사진·목표 제목·`🍀 8` 을 넣고 CSS `filter: blur(5px)` 로 가린다. **CSS 가림은 인가가 아니다.** 흐림은 그림만 가리고 HTML 응답과 DOM 에는 원문이 남는다. 프로토타입 값은 합성 샘플이므로 시안 자체는 결함이 아니고, **서버가 그 필드를 애초에 보내지 않도록 못박는 것이 이 계약의 일이다.**

**비회원(anon)에게 보낼 수 있는 것은 아래 둘뿐이다.**

1. `friend_invite_preview(token)` 의 기존 최소 응답(초대자 닉네임, 선택된 목표 제목, 승인 커버). 토큰 소지가 인가 근거다.
2. 기존 공개 목표 경로(`/g/[slug]`)가 이미 노출하는 범위. D-003 대로 인원수까지, 금액·순위는 없다.

**티저 전용 응답의 금지 필드.** 아래 key 또는 의미가 비회원 응답에 **하나라도** 있으면 계약 위반이다. §7.2 의 금지 목록에 더해 적용한다.

```text
nickname, display_name, profile_image, avatar_url, member_id, goal_title,
goal_slug, goal_id, cheer_message, clover_count, supporter_count_per_member,
due_date, 그리고 특정 개인을 가리킬 수 있는 모든 식별자
```

**데이터 범위는 합의 대기(D-OPEN-1).** 두 안 모두 위 금지 목록을 지킨다.

| | A안 (추천) | B안 |
|---|---|---|
| 서버 호출 | **0건.** 시트는 기능 설명과 무채색 자리표시만 그린다 | `platform_social_stats()` 신설 1건 |
| 응답 | 없음 | `{"cheering_member_count": 1284}` **정수 1개만** |
| grant | 해당 없음 | `anon`·`authenticated` EXECUTE, PUBLIC revoke, `SECURITY DEFINER`, `search_path=''`, `STABLE` |
| 멱등·인증 | 해당 없음 | 멱등(읽기 전용), 인증 불요 |
| 오류 | 해당 없음 | 집계 실패 시 `0` 을 반환하지 않고 500 `stats_unavailable`. 화면은 수치 없는 A안 문안으로 되돌린다 |
| 하한 규칙 | 해당 없음 | 100 미만이면 서버가 `null` 을 반환하고 화면은 수치를 쓰지 않는다. 작은 수를 부풀리지 않는다 |

**어느 안이든 수치는 실측값이어야 한다.** 샘플 데이터를 사회적 증거로 제시하는 것은 금지다(회장 지식 정본의 윤리 1선: 거짓·가짜 희소성 금지).

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

### A.4 커버 자산 상태기계 (R5 · FR-W13)

v1.1.0 §5 는 엔드포인트 3개를 각각 적었으나 **중단 상태를 누가 치우는지**가 없었다. 회장이 겪은 업로드 오류의 재발 자리가 그 공백이다. 구조는 바꾸지 않는다(D-OPEN-3 추천안 A: 서버 변경 0).

| 전이 | 주체 | 호출 | 결과 상태 | 실패 시 |
|---|---|---|---|---|
| (없음) → `PENDING_UPLOAD` | 소유자 | `goal-cover-sign-upload` | `PENDING_UPLOAD` + Presigned URL(서명이 붙은 임시 접근 주소) | 404 `goal_not_found` · 403 `not_goal_owner` · 429 `rate_limited`. 행 생성 0 |
| `PENDING_UPLOAD` → `PENDING_UPLOAD` | 소유자 | Storage `PUT` (격리 버킷) | 변화 없음 | 업로드 실패 시 행은 `PENDING_UPLOAD` 로 남는다 → 아래 정리 대상 |
| `PENDING_UPLOAD` → `REVIEW` | 소유자 | `goal-cover-finalize` | `REVIEW`. **기존 활성 커버는 그대로** | 422 `invalid_request` · 415 `unsupported_mime` · 413 `too_large` · 409 `hash_mismatch`. 상태 유지 |
| `REVIEW` → `APPROVED` | 관리자 | `admin-review-goal-cover` `{decision:"APPROVE"}` | `APPROVED` + `goal.active_cover_asset_id` 원자 교체. PUBLIC 목표만 공개 버킷 복사, FRIENDS 는 격리 유지(D-019) | 403 `admin_forbidden` · 409 `already_reviewed`. 활성 커버 불변 |
| `REVIEW` → `REJECTED` | 관리자 | 같음 `{decision:"REJECT"}` | `REJECTED`. 격리 객체 삭제 큐 등록 | 같음 |
| `PENDING_UPLOAD` → (삭제) | **정리 작업** | 스케줄 작업 | 행 삭제 + 격리 객체 삭제 | 24시간 경과분만. 선례 = `docs/eng-design/cashout-account-purge-scheduler.md` |

**클라이언트 쪽 수용기준 2건을 계약에 올린다**(R5 가 밝힌 두 원인. 기계로 셀 수 있으므로 검사로 집행한다 — D-032).

1. 업로드 버튼은 가로 스크롤 영역 **밖**에 있어 스크롤 위치와 무관하게 항상 눌린다. 스크롤 스냅 지점이 없는 요소를 스크롤 줄 안에 두지 않는다.
2. 선택 상태는 단일 변수가 소유하고, 렌더된 체크 표시 개수는 **정확히 1개**다.

### A.5 관계 방향 필드 (D-024 · D-026)

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
      "profile_image": null,
      "goals": [
        {
          "goal_id": 101,
          "slug": "seoyeon-running",
          "title": "이번 달엔 세 번씩 꼭 달릴게",
          "due_date": "2026-12-01",
          "cover_preset_key": "c1",
          "cover_public_path": null,
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
  "cover_public_path": null,
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
  "cover_public_path": null,
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
  "cover_preset_key": "c1",
  "cover_public_path": null,
  "expires_at": "2026-10-20T02:42:00Z",
  "requires_login": true
}
```

최소 필드만 반환한다. profile image, member id, goal id, reason, cheer, wordmap은 수락 전에 반환하지 않는다. invalid·expired·revoked·accepted token은 모두 token 상태에 맞는 404 또는 410이고 invite row 존재 여부 외 추가 정보는 주지 않는다.

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
      "cover_preset_key": "c1"
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

Edge Function 오류 envelope:

```json
{
  "error": {
    "code": "file_too_large",
    "message": "5MB 이하 이미지를 선택해 주세요.",
    "retryable": false
  }
}
```

RPC 오류는 `message`에 domain code를 넣고 web server action이 동일 envelope로 normalize한다.

## 7. 권한·필드·로그 금지

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

## 8. 추적성·수용기준

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
