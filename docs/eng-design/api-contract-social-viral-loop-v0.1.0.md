# 소셜 바이럴 루프 API 계약

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-10-04 KST |
| 작성자/모델 | tech-architect / claude-opus-4-8 |
| 작업 라인 | core |
| 상태 | 방향 확정. 결제·인증 구간은 크로스모델 리뷰 선행 |
| 상류 핀 | FDD v0.1.0 §8, `erd-social-viral-loop-v0.1.0.md`, 실배포 `supabase/functions/**` |
| 기반 포맷 | `docs/eng-design/api-contract.md`(기존) |

> STAMP: 생성 2026-10-04 KST. claude-opus-4-8. tech-architect. 근거 실배포 Edge Functions(cheer-order·toss-confirm·notify·report·wordmap-render·auth-kakao) 디렉터리 실측 + FDD §8 후보. 고민 지점은 "계약 완결(추후 정의 0)"과 "합의 전 단정 금지"를 동시에 만족시키는 선. 방향이 확정된 것만 완결 계약으로 쓰고, 미합의는 §엔드포인트 없이 갭으로 남겼다.

## 목차
- [0. 규약](#0-규약)
- [1. 친구·초대](#1-친구초대)
- [2. 커버 이미지](#2-커버-이미지)
- [3. 신원·인증](#3-신원인증)
- [4. 선호 설정](#4-선호-설정)
- [5. 조회 RPC](#5-조회-rpc)
- [6. 공통 에러 사전](#6-공통-에러-사전)
- [7. D-003 응답 가드](#7-d-003-응답-가드)
- [8. 갭(계약 미완 영역)](#8-갭계약-미완-영역)

## 0. 규약

- 전송: Supabase RPC(PostgREST) 또는 Edge Function(HTTPS JSON). 변이 중 외부 I/O·토큰 교환이 있는 것은 EF, 순수 DB 변이는 RPC.
- 인증: `Authorization: Bearer <supabase jwt>`. 익명 허용은 명시한 것만.
- 멱등성: 변이 RPC는 `request_key uuid`를 받고 동일 키 재호출 시 동일 결과(기존 cheer-order 멱등 관습 계승).
- 시간: 모든 timestamptz는 UTC ISO8601.
- 금액: 소셜 경로 응답에 ₩·clover 수량·순위 필드 **없음**(D-003). 스키마에 아예 두지 않는다.
- 권한 실패 코드: 403 상당(`forbidden`), 자원 없음 404(`not_found`), 멱등 재생 200 + `is_replay:true`.

## 1. 친구·초대

### 1.1 RPC `create_friend_invite`

인증: 회원 본인. 멱등: 동일 (member, goal, 활성 invite) 존재 시 재사용.

요청
```json
{ "goal_id": 123, "channel": "WEB" }
```
- `goal_id`: bigint, nullable. null이면 프로필 초대. non-null이면 본인 소유 goal이어야 함.
- `channel`: enum `WEB|INTOSS|KAKAO|LINK`.

응답 200
```json
{
  "invite_id": "uuid",
  "token": "opaque-32byte-base64url",
  "expires_at": "2026-10-18T00:00:00Z",
  "web_path": "/invite/{token}",
  "intoss_path": "intoss://haenael/invite?token={token}"
}
```
- `token`은 응답에서 1회만 평문 반환. DB에는 sha256(`token_hash`)만 저장.

에러: `goal_not_owned`(403), `invite_rate_limited`(429, 시간당 20건 초과), `blocked_relationship`(409).

### 1.2 RPC `accept_friend_invite`

인증: 회원 본인. 멱등: 동일 (user, token) 재시도는 동일 관계 반환.

요청
```json
{ "token": "opaque-token", "request_key": "uuid" }
```

응답 200
```json
{ "connection_id": "uuid", "friend_member_id": "uuid", "is_replay": false }
```

처리 규칙
- 서버가 sha256(token)으로 `friend_invite` 조회. 없으면 `invite_not_found`(404).
- 만료(`expires_at < now`): `invite_expired`(410).
- 이미 다른 계정이 수락(`accepted_by`가 타인): `invite_already_used`(409).
- 자기 초대(수락자 == inviter): `self_invite`(409).
- 차단 관계 존재: `blocked_relationship`(409).
- 성공: `friend_invite.accepted_by/accepted_at` 잠금 + `friend_connection` 정렬쌍 1건 생성(이미 있으면 재사용, 중복 생성 안 함).

### 1.3 RPC `block_friend` / `unblock_friend`

인증: 회원 본인. 멱등.

요청 `{ "friend_member_id": "uuid" }`
응답 `{ "connection_id": "uuid", "status": "BLOCKED" }`

- BLOCKED는 양방향 조회에서 상대 목표·활동을 숨긴다. ACTIVE로의 전환은 unblock + 재초대.

## 2. 커버 이미지

### 2.1 EF `goal-cover-sign-upload`

인증: 목표 소유자. 격리 버킷 signed upload URL 발급.

요청 `{ "goal_id": 123, "ext": "jpg", "content_sha256": "hex", "byte_size": 824000 }`
응답 200
```json
{
  "asset_id": "uuid",
  "upload_url": "https://...signed",
  "object_path": "{memberId}/{goalId}/{assetId}.jpg",
  "max_bytes": 5242880
}
```
에러: `goal_not_owned`(403), `file_too_large`(413, 5MB 초과), `unsupported_ext`(415, jpg/png/webp만).

### 2.2 EF `goal-cover-finalize`

인증: 목표 소유자. 업로드 후 검증·모더레이션·공개 전환.

요청
```json
{ "asset_id": "uuid", "goal_id": 123, "object_path": "...", "sha256": "hex" }
```
응답 200
```json
{ "status": "APPROVED|REVIEW|REJECTED", "active_cover_changed": true, "reason_code": null }
```
- 검증 순서: bucket·path·owner 일치 → magic bytes(실제 MIME) → byte_size·해상도 → sha256 대조.
- 모더레이션: 공급자 판정. 고위험→REJECTED, 애매→REVIEW, 통과→APPROVED.
- APPROVED만 public 버킷 복사 + `goal.active_cover_asset_id` 갱신 + 이전 asset `SUPERSEDED`.
- 멱등: 동일 (`asset_id`, `sha256`) 재호출은 동일 판정 반환(`is_replay` 생략, status 동일).
- 불변식: REVIEW·REJECTED·실패는 기존 공개 커버를 바꾸지 않는다.
- 에러: `asset_not_found`(404), `owner_mismatch`(403), `hash_mismatch`(422), `mime_spoof`(422), `moderation_unavailable`(503 → status REVIEW로 수렴, upload 유지).
- `reason_code`: REJECTED 시 안정 코드(`adult`,`violence`,`spoof` 등). 사용자에게 공급자 원문 라벨 노출 금지.

### 2.3 RPC `set_goal_cover_preset`

인증: 목표 소유자. 요청 `{ "goal_id": 123, "preset_key": "c1" }` (c1~c6).
응답 `{ "active_cover_changed": true }`
- custom 커버를 즉시 삭제하지 않음. retention job이 고아 asset 정리.
- 편집 허용 상태: `ACTIVE|CLOSED`. `DELETED` 목표는 `goal_not_editable`(409).

## 3. 신원·인증

> 고위험. 크로스모델 리뷰 필수. 결제·인증 구간.

### 3.1 EF `auth-toss` (앱인토스 채널 전용)

입력: 앱인토스 SDK 일회성 authorization code.
요청 `{ "authorization_code": "...", "request_key": "uuid" }`
처리
- EF가 서버에서 토스 토큰 교환 + 사용자 조회(subject). code는 1회 교환 후 폐기.
- `member_identity(provider='TOSS', provider_subject_hash=sha256(sub))` resolve.
- 기존 연결 있으면 그 member의 Supabase 세션 발급. 없으면 신규 member + identity 생성.
- 자동 병합 안 함. 카카오 member와의 병합은 §3.2 별도 흐름.

응답 200 `{ "access_token": "...", "refresh_token": "...", "member_id": "uuid", "is_new": false }`
에러: `toss_exchange_failed`(502), `code_reused`(409), `age_restricted`(403, 만19세 미만 토스 정책).
보안: code·access·refresh 토큰을 브라우저 로컬·DB 일반 컬럼에 장기 저장 금지. 세션은 Supabase 세션 쿠키/스토리지 표준만.

### 3.2 EF `link-identity` (명시 병합)

인증: 로그인된 member 본인. 다른 공급자 신원을 현 계정에 연결.
요청 `{ "provider": "TOSS", "authorization_code": "...", "consent": true }`
처리: 토큰 교환으로 subject 확인 → 해당 subject가 다른 member에 이미 연결됐으면 `identity_conflict`(409, 수동 지원). 아니면 `member_identity` 추가.
응답 `{ "linked": true, "provider": "TOSS" }`
- `consent:false`면 `consent_required`(400).

## 4. 선호 설정

### RPC `update_member_preferences`

인증: 본인. 멱등.
요청 `{ "notify_cheer": true, "notify_marketing": false }`
응답 `{ "notify_cheer": true, "notify_marketing": false, "updated_at": "..." }`
- row 없으면 생성(upsert). 마케팅은 명시 opt-in.

## 5. 조회 RPC

### 5.1 RPC `my_friend_goals`

인증: 본인. ACTIVE 관계 상대의 공개 가능 목표 요약.
응답
```json
{
  "friends": [
    {
      "friend_member_id": "uuid",
      "nickname": "string",
      "profile_image": "url|null",
      "goals": [
        { "goal_id": 123, "slug": "abc", "title": "...", "due_date": "2026-12-01",
          "status": "ACTIVE", "cover_preset_key": "c1", "cover_public_path": "url|null",
          "cheer_count": 13 }
      ]
    }
  ]
}
```
- `cheer_count`는 사람 수(D-003 허용: 인원수·횟수). 금액·순위 필드 없음.
- BLOCKED 관계·비공개 목표 제외. SECURITY DEFINER 함수 내부에서 active 검사.
- **의존(독립검증에서 발견)**: 이 RPC는 `goal.visibility in ('PUBLIC','FRIENDS')`만 서빙한다. `goal.visibility` enum은 PRD v0.4 §2.5의 v2 추가분으로 현 migration에 아직 없다(`FRIENDS`는 enum 값만 예약·UI 비노출 상태). 따라서 친구 조회 build는 visibility 컬럼 추가(`eng-design-goal-visibility-supporter-v1.0.0` 설계) 적용을 선행 의존으로 가진다. 미적용 시 friend 쿼리는 PUBLIC만 서빙하도록 축소 가동.

### 5.2 RPC `friend_goal_detail`

인증: 본인 + 대상과 ACTIVE 관계일 때만.
요청 `{ "goal_id": 123 }`
응답: goal 요약 + cheer_count + 워드맵 상위 단어(기존 `get_wordmap` 재사용). 금액·응원자 금액 없음.
에러: `not_friend`(403), `goal_not_found`(404).

### 5.3 기존 재사용(변경 없음)

- `get_wordmap(p_goal_id)`: 그대로. owner/친구 읽기 모두 집계 뷰 경유.
- `goal_public` view, `cheer_public` view: 그대로(금액 부재 유지).
- notification read/update, `update_goal`, `create_goal`(멀티골 `multi_goal_create_fn`): 그대로.

## 6. 공통 에러 사전

| code | HTTP | 의미 |
|---|---|---|
| `forbidden` | 403 | 인증됐으나 권한 없음 |
| `goal_not_owned` | 403 | 대상 goal 비소유 |
| `not_friend` | 403 | ACTIVE 관계 아님 |
| `not_found` | 404 | 자원 없음 |
| `invite_expired` | 410 | 초대 만료 |
| `invite_already_used` | 409 | 타 계정 수락 |
| `self_invite` | 409 | 자기 초대 |
| `blocked_relationship` | 409 | 차단 관계 |
| `identity_conflict` | 409 | 신원이 타 계정에 연결됨 |
| `hash_mismatch`/`mime_spoof` | 422 | 커버 검증 실패 |
| `moderation_unavailable` | 503 | 모더레이션 장애(REVIEW로 수렴) |
| `invite_rate_limited` | 429 | 초대 폭주 |

멱등 재생은 2xx + `is_replay:true`(해당 RPC).

## 7. D-003 응답 가드

모든 소셜 응답 스키마에 다음 필드가 **존재하지 않는다**: `amount_krw`, `clover_amount`, `clover_count`, `total`, `rank`, `ranking`, `leaderboard`, `supporter_amount`. 허용: `cheer_count`(사람 수), `due_date`, `status`, 상위 단어. 계약 테스트 TC-D003이 view·RPC·DOM 3층에서 이를 강제한다. 소유자 본인 잔액(b층)은 소셜 경로가 아닌 기존 `SplitBalanceCard`/cashout 경로에만.

## 8. 갭(계약 미완 영역)

이 영역은 상류 미결이라 엔드포인트를 확정하지 않는다. 임의 구현 금지.

| 갭 | 미결 | 닫는 것 |
|---|---|---|
| GAP-08 환불 | 응원 결제 환불 기간·범위 | plan·legal 결정 → 약관·API 동기화 |
| GAP-09 미성년 결제 | 법정대리인 동의 경계·PG 책임 | plan·legal + PG 확인 |
| GAP-02 앱인토스 결제 | 미니앱 결제·환전 surface | 토스 서면 사전검토 회신(현재 유입 전용 가정) |
| GAP-05 업적 | 업적 계산 이벤트 정의 | 첫 build 제외. activity spec 선행 |

앱인토스 미니앱은 §1·§2·§5 조회·초대·커버만 호출한다. §3.1 `auth-toss`는 사용하되 §결제·환전 EF(cheer-order·toss-confirm·cashout*)는 미니앱 번들에서 호출·노출 0(AC-AIT-01).
