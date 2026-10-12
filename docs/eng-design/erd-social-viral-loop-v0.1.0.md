# 소셜 바이럴 루프 ERD (스키마 확장 설계)

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-10-04 KST |
| 작성자/모델 | tech-architect / claude-opus-4-8 |
| 작업 라인 | core |
| 상태 | 방향 확정(2026-10-04 세션 3묶음 채택). 컬럼·제약 세부는 build 착수 전 migration 리뷰로 확정 |
| 상류 핀 | `docs/eng-design/fdd-core-social-viral-loop-appintoss-v0.1.0-gpt-codex.md`, `supabase/migrations/20260705163137_init_schema.sql`, D-003, D-SOCIAL-V6 |
| 기반 포맷 | `docs/eng-design/erd.md`(기존), FDD §9 |

> STAMP: 생성 2026-10-04 KST. 모델 claude-opus-4-8. 에이전트 tech-architect. 근거는 실배포 init_schema.sql(member·goal·cheer·notification·share_event·report 실측), wordmap_storage.sql의 버킷 패턴, D-003(지갑은 조용하게), 2026-10-04 세션 확정. 가장 오래 고민한 지점은 member가 auth.users와 1:1 FK인 현 구조에서 다중 신원(카카오·토스)을 깨지 않고 얹는 경계다.

## 목차
- [0. 이 문서의 위치와 안전 원칙](#0-이-문서의-위치와-안전-원칙)
- [1. 기존 스키마 실측(재창조 금지 기준선)](#1-기존-스키마-실측재창조-금지-기준선)
- [2. 확장 ERD](#2-확장-erd)
- [3. 신규 테이블 계약](#3-신규-테이블-계약)
- [4. 기존 테이블 변경](#4-기존-테이블-변경)
- [5. Storage 버킷과 RLS](#5-storage-버킷과-rls)
- [6. 무결성 제약과 인덱스](#6-무결성-제약과-인덱스)
- [7. 마이그레이션 순서와 롤백](#7-마이그레이션-순서와-롤백)
- [8. 데이터 손실·유출 가능 지점](#8-데이터-손실유출-가능-지점)
- [9. 열린 결정과 차단 갭](#9-열린-결정과-차단-갭)

## 0. 이 문서의 위치와 안전 원칙

이 문서는 FDD §9의 데이터 모델 후보를 실배포 스키마에 맞춰 확정 방향으로 좁힌 것이다. 판정 우선순위는 품질헌법대로 데이터 안전 > 상류 정합 > 기존 연속성 > 우아함이다.

불변식 세 개를 모든 테이블 설계가 지킨다.
1. 금액·순위 비노출(D-003): 소셜 경로의 어떤 테이블·뷰·응답에도 ₩·clover_count·순위 컬럼을 만들지 않는다. 금액은 현행 3층 격리(공개뷰 a층, 본인 b층, 환전 c층)를 그대로 둔다.
2. 승인 전 비노출: 공개 이미지는 승인된 asset만 public URL을 가진다.
3. 동의 기반 관계: 친구는 초대 수락으로만 성립한다. 결제·조회가 관계를 만들지 않는다.

## 1. 기존 스키마 실측(재창조 금지 기준선)

`20260705163137_init_schema.sql` 직접 확인 결과다.

| 테이블 | PK | 소셜 관련 사실 |
|---|---|---|
| `member` | `id uuid` = `auth.users(id)` FK (1:1) | `provider text`, `provider_id text` **단일 슬롯**. 다중 신원 불가. `idx_member_provider(provider, provider_id)` |
| `goal` | `id bigint` identity | `slug`, `title`, `reason`, `due_date`, `status`, `closed_at`, `deleted_at`(soft-delete). **커버 컬럼 없음** |
| `cheer` | `id bigint` identity | `goal_id` FK, `message varchar(140)`(워드맵 소스), `is_anonymous`, `clover_amount`(b/c층), soft-delete |
| `payment` | `id bigint` | `order_id` UNIQUE 멱등키, `amount_krw` |
| `clover_ledger`/`clover_balance` | - | 금액·잔액 진실원. service_role만 write |
| `notification` | `id` | `member_id`, `read`, `idx_notification_unread` partial index |
| `share_event` | `id` | 워드맵 공유 기록 |
| `report` | `id` | 신고. target type 확장 대상 |
| view `goal_public` | - | ₩·clover_count 컬럼 **부재**. cheer_count만 집계. anon SELECT |
| view `cheer_public` | - | clover_amount·supporter_ci **부재**. 익명시 display_name NULL |
| bucket `wordmap-images` | - | public=true, service upload/update, public select. **커버 버킷 설계의 참조 패턴** |

결론: 친구·초대·활동·선호·다중신원·커버 asset은 **전부 신규**다. 금액 격리와 soft-delete 관습은 그대로 계승한다.

## 2. 확장 ERD

```mermaid
erDiagram
  AUTH_USERS ||--|| MEMBER : "1:1"
  MEMBER ||--o{ MEMBER_IDENTITY : "has"
  MEMBER ||--o| MEMBER_PREFERENCE : "configures"
  MEMBER ||--o{ GOAL : "owns"
  MEMBER ||--o{ FRIEND_INVITE : "creates"
  MEMBER ||--o{ FRIEND_CONNECTION : "low/high"
  GOAL ||--o{ GOAL_COVER_ASSET : "uploads"
  GOAL }o--o| GOAL_COVER_ASSET : "active_cover(approved only)"
  FRIEND_INVITE ||--o| FRIEND_CONNECTION : "establishes"
  MEMBER_IDENTITY {
    uuid id PK
    uuid member_id FK
    text provider "KAKAO|TOSS"
    text provider_subject_hash "sha256, no raw id"
    timestamptz linked_at
  }
  MEMBER_PREFERENCE {
    uuid member_id PK_FK
    boolean notify_cheer
    boolean notify_marketing
    timestamptz updated_at
  }
  GOAL_COVER_ASSET {
    uuid id PK
    bigint goal_id FK
    uuid owner_member_id FK
    text quarantine_path
    text public_path "APPROVED only"
    text status "PENDING_UPLOAD|PENDING_MODERATION|APPROVED|REVIEW|REJECTED|SUPERSEDED|DELETED"
    text moderation_provider
    jsonb moderation_result
    text content_sha256
    timestamptz created_at
  }
  FRIEND_INVITE {
    uuid id PK
    uuid inviter_member_id FK
    bigint goal_id FK "nullable"
    text token_hash UK "sha256, no raw token"
    text channel "WEB|INTOSS|KAKAO|LINK"
    timestamptz expires_at
    uuid accepted_by FK "nullable"
    timestamptz accepted_at
  }
  FRIEND_CONNECTION {
    uuid id PK
    uuid member_low_id FK
    uuid member_high_id FK
    text status "ACTIVE|BLOCKED"
    uuid origin_invite_id FK
    timestamptz connected_at
  }
```

`GOAL`에 추가되는 컬럼: `cover_preset_key text`, `active_cover_asset_id uuid` (APPROVED asset만 참조하는 FK).

## 3. 신규 테이블 계약

### 3.1 `member_identity` (신원 연결)

현 `member.provider/provider_id` 단일 슬롯을 깨지 않고 추가하는 side table이다. 기존 카카오 로그인 경로는 그대로 두고, 신규/추가 신원만 이 테이블에 적재한다.

| 컬럼 | 타입 | 제약 | 비고 |
|---|---|---|---|
| `id` | uuid | PK default `gen_random_uuid()` | |
| `member_id` | uuid | NOT NULL FK → member(id) ON DELETE CASCADE | |
| `provider` | text | NOT NULL CHECK in ('KAKAO','TOSS') | |
| `provider_subject_hash` | text | NOT NULL | 공급자 subject(sub)의 sha256. 원문 id 저장 금지 |
| `linked_at` | timestamptz | NOT NULL default now() | |
| UNIQUE | | (`provider`, `provider_subject_hash`) | 한 공급자 계정은 한 member에만 연결 |

- 병합(merge)은 자동이 아니다. 검증된 식별자 + 명시 동의 흐름(별도 RPC)에서만. 전화번호 자동 병합은 기각(계정 탈취 위험).
- 백필: 기존 member의 카카오 신원을 이 테이블로 복제하는 1회성 backfill을 migration에 포함(멱등, `ON CONFLICT DO NOTHING`).

### 3.2 `member_preference` (알림·마케팅 설정)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `member_id` | uuid | PK FK → member(id) ON DELETE CASCADE |
| `notify_cheer` | boolean | NOT NULL default true |
| `notify_marketing` | boolean | NOT NULL default false |
| `updated_at` | timestamptz | NOT NULL default now() |

마케팅 수신 동의는 opt-in(기본 false). 알림은 기본 on.

### 3.3 `friend_invite` (초대)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK default gen_random_uuid() |
| `inviter_member_id` | uuid | NOT NULL FK → member(id) ON DELETE CASCADE |
| `goal_id` | bigint | NULL FK → goal(id) ON DELETE SET NULL |
| `token_hash` | text | NOT NULL UNIQUE. 발급 토큰의 sha256. 원문 미저장 |
| `channel` | text | NOT NULL CHECK in ('WEB','INTOSS','KAKAO','LINK') |
| `expires_at` | timestamptz | NOT NULL. 발급 +14일 기본 |
| `accepted_by` | uuid | NULL FK → member(id) |
| `accepted_at` | timestamptz | NULL |
| `created_at` | timestamptz | NOT NULL default now() |

- 토큰 원문은 DB에 없다. 링크의 opaque 토큰을 서버가 sha256해 대조한다.
- 1회성: `accepted_by` set 후 재사용 거부.

### 3.4 `friend_connection` (양방향 관계)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK default gen_random_uuid() |
| `member_low_id` | uuid | NOT NULL FK → member(id) ON DELETE CASCADE |
| `member_high_id` | uuid | NOT NULL FK → member(id) ON DELETE CASCADE |
| `status` | text | NOT NULL CHECK in ('ACTIVE','BLOCKED') default 'ACTIVE' |
| `origin_invite_id` | uuid | NULL FK → friend_invite(id) ON DELETE SET NULL |
| `connected_at` | timestamptz | NOT NULL default now() |
| CHECK | | `member_low_id < member_high_id` (self-relation 방지 + 정렬 강제) |
| UNIQUE | | (`member_low_id`, `member_high_id`) |

- 정렬쌍으로 양방향 관계를 단일 row로 표현. (A,B)와 (B,A) 중복 불가.
- `BLOCKED`가 `ACTIVE`를 이긴다(RPC 레벨 우선순위).

### 3.5 `goal_cover_asset` (커버 자산)

| 컬럼 | 타입 | 제약 |
|---|---|---|
| `id` | uuid | PK default gen_random_uuid() |
| `goal_id` | bigint | NOT NULL FK → goal(id) ON DELETE CASCADE |
| `owner_member_id` | uuid | NOT NULL FK → member(id) ON DELETE CASCADE |
| `quarantine_path` | text | NOT NULL. 격리 버킷 object path |
| `public_path` | text | NULL. APPROVED 시에만 채워짐 |
| `status` | text | NOT NULL CHECK in (수명주기 7상태) default 'PENDING_UPLOAD' |
| `moderation_provider` | text | NULL |
| `moderation_result` | jsonb | NULL. 공급자·모델버전·라벨·신뢰도·판정만. 원문 최소화 |
| `content_sha256` | text | NOT NULL. 멱등 판정 + 변형 아님 보조 |
| `created_at` | timestamptz | NOT NULL default now() |

수명주기: `PENDING_UPLOAD → PENDING_MODERATION → APPROVED | REVIEW | REJECTED`, APPROVED가 교체되면 이전 것은 `SUPERSEDED`, 정리되면 `DELETED`.

## 4. 기존 테이블 변경

### 4.1 `goal` 컬럼 추가

```
ALTER TABLE goal ADD COLUMN cover_preset_key text;
ALTER TABLE goal ADD COLUMN active_cover_asset_id uuid
  REFERENCES goal_cover_asset(id) ON DELETE SET NULL;
```

- 둘 다 nullable. 커버 없는 기존 목표는 영향 0(기본 프리셋을 앱에서 렌더).
- `active_cover_asset_id`는 반드시 `status='APPROVED'` asset만 가리킨다(트리거 또는 finalize RPC에서 강제).
- `goal_public` 뷰에 `cover_preset_key`와 승인 커버의 `public_path`만 노출한다. quarantine_path·moderation_result는 절대 노출 금지.

### 4.2 `report` target 확장

`report`에 커버 이미지를 신고 대상으로 넣기 위해 `target_type`(기본 'GOAL')과 `target_asset_id` nullable 추가, 또는 기존 컬럼 재사용. 세부는 build 시 report EF 현행 스키마 확인 후 확정(GAP, §9).

## 5. Storage 버킷과 RLS

`wordmap-images`(public, service write) 패턴을 참조하되 커버는 2버킷으로 분리한다.

| 버킷 | public | write | read |
|---|---|---|---|
| `goal-cover-quarantine` | false | authenticated, path `{auth.uid()}/{goal_id}/{asset_id}.{ext}`만 | owner + service only |
| `goal-cover-public` | true | **service_role worker만** | public select |

- 격리 버킷 insert 정책: path의 첫 세그먼트가 `auth.uid()`이고 그 goal이 실제 본인 소유인지 signed-upload 발급 함수에서 재검사.
- upsert 금지. asset마다 새 object. overwrite 권한을 안 열어 공격면을 줄인다.
- 공개 버킷은 승인 object만 존재(worker가 복사). 승인 전 이미지는 public URL이 물리적으로 없다.

## 6. 무결성 제약과 인덱스

| 대상 | 제약/인덱스 | 이유 |
|---|---|---|
| friend_connection | UNIQUE(low,high) + CHECK(low<high) | 중복·자기관계 차단 |
| friend_invite | UNIQUE(token_hash) | 토큰 충돌·재사용 탐지 |
| friend_invite | idx(inviter_member_id, created_at) | rate limit 조회 |
| member_identity | UNIQUE(provider, provider_subject_hash) | 신원 오연결 차단 |
| goal_cover_asset | idx(goal_id, status), idx(content_sha256) | 활성 커버 조회·중복 해시 |
| goal | FK active_cover_asset_id (ON DELETE SET NULL) | asset 삭제 시 목표 보존 |

## 7. 마이그레이션 순서와 롤백

순서(FK 의존 역순 생성):
1. `member_identity`, `member_preference` + 카카오 신원 backfill
2. `goal_cover_asset`
3. `goal` 컬럼 2개 추가 + FK
4. `friend_invite` → `friend_connection`
5. Storage 버킷 2개 + 정책
6. RPC·view 변경(별도 migration)

롤백 가능성:
- 모든 신규 테이블은 `DROP TABLE IF EXISTS` 역순으로 되돌림(데이터 없으면 무손실).
- `goal` 컬럼 추가는 nullable이라 `ALTER TABLE goal DROP COLUMN`으로 안전 롤백. 단 운영 데이터가 쌓인 뒤에는 커버 데이터 손실이므로 asset 백업 후 drop.
- backfill은 멱등(ON CONFLICT DO NOTHING)이라 재실행 안전.
- 되돌릴 수 없는 지점: Storage object 삭제. 롤백 시 버킷은 비우지 말고 정책만 되돌린다.

## 8. 데이터 손실·유출 가능 지점

| 지점 | 위험 | 가드 |
|---|---|---|
| 커버 승인 전 노출 | UGC 유해 이미지 공개 | public 버킷에 승인본만 존재. finalize가 유일 통로 |
| moderation_result 과보관 | 민감 라벨·원문 누적 | 공급자·판정·신뢰도만. 원문 바이트 미보관 |
| provider subject 원문 저장 | 신원 식별자 유출 | sha256만 저장 |
| 초대 토큰 원문 저장 | 토큰 탈취 시 관계 위조 | token_hash만. 원문은 링크에만 |
| 친구 상세 RLS 과개방 | 타인 목표 금액·비공개 노출 | 친구 RPC는 SECURITY DEFINER + 함수 내부 active 관계 검사. goal RLS 완화 금지 |
| 계정 삭제 | asset object 고아 | member/goal ON DELETE CASCADE + Storage 정리 job |

## 9. 열린 결정과 차단 갭

| ID | 열린 것 | build 전 닫는 증거 |
|---|---|---|
| GAP-06a | moderation 공급자(Google Vision vs AWS Rekognition) | 비용·계정 검토 후 회장 결정. schema는 공급자 중립(`moderation_provider` 컬럼) |
| GAP-report | report target 확장 방식 | report EF 현행 스키마 Read 후 확정 |
| GAP-03 | 카카오·토스 계정 병합 UI·동의 흐름 | 인증 threat review(크로스모델) |
| GAP-05 | 활동 타임라인·업적 진실원 | 첫 build 제외 확정(세션). 이후 `goal_activity` 이벤트 정의를 plan에서 |
| GAP-visibility | `goal.visibility` enum(PUBLIC/PRIVATE/FRIENDS) 미적용 | 친구 조회가 FRIENDS 공개를 서빙하려면 선행. PRD v0.4 §2.5 + `eng-design-goal-visibility-supporter-v1.0.0` 설계를 build에서 함께 적용. 미적용 시 친구 조회는 PUBLIC만 |

방향은 확정이나 위 4개가 닫히기 전 build 전체 진입은 불가. 커버·친구·신원·선호 4개 테이블은 build 가능(방향 확정 + 계약 완결).
