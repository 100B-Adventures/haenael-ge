# V2 프로토타입 서버 계약 보완 v1.0.0

승인된 `social-viral-loop-v3-opus5.html`의 프로필, 친구 메시지, 응원 내역, 목표 커버, 목표 종료 흐름을 FDD/API v1.2.5 위에 구현하기 위한 변경 기록이다. 기존 승인 문서는 재작성하지 않고, 실제 migration과 Edge Function에서 추가된 계약만 기록한다.

## 1. 프로필과 아바타

- `member.bio`: 1~80자 또는 `NULL`. nickname의 기존 authenticated column write 권한은 유지하고 `profile_image` 직접 write 권한은 회수한다.
- `profile-update` Edge Function:
  - `save`: nickname, bio, preset 또는 현재 활성 profile image를 저장한다.
  - `sign_avatar`: JPEG, PNG, WebP, 최대 5 MiB, SHA-256을 입력받아 Supabase Storage signed upload URL을 발급한다. signed upload URL의 실제 유효기간은 2시간이다.
  - `finalize_avatar`: Storage의 실제 byte length, MIME magic bytes, SHA-256, owner를 검증한 뒤 service-role 전용 RPC로 활성화한다.
- 업로드 실패와 교체된 사진은 `storage_cleanup_queue.available_at` 이후 cleanup worker가 삭제한다. signed upload URL 만료 전 재업로드 가능성을 추적하기 위해 tombstone metadata와 queue를 즉시 삭제하지 않는다.
- member 삭제 시 BEFORE DELETE trigger가 avatar를 `DELETED`로 바꾸고 queue를 남긴다. 이후 owner FK만 `NULL`이 되므로 fixture 또는 계정 삭제 뒤에도 Storage cleanup이 완료되고 DONE 영수증이 남는다.

## 2. 소셜 조회와 개인정보 경계

- `my_friend_goals.recent_message`: CONFIRMED, nondeleted, nonanonymous, 직접 연결된 친구쌍, PUBLIC 또는 FRIENDS 목표에 한해 가장 최근 메시지를 반환한다. PRIVATE, 익명, 제3자 원문은 반환하지 않는다.
- `friend_goal_detail.supporter_avatars`: 최대 3개. 익명 응원은 이름과 사진을 `NULL`로 반환한다.
- `my_social_dashboard.received_cheers`와 `sent_cheers`: 최대 20개. 금액, payment ID, member UUID는 반환하지 않는다.
- `my_goal_cheer_summary(goal, search, limit)`: owner-only. `total_count`는 전체 고유 supporter 수이고 `items`만 최대 20명이다. 검색은 최대 80자이며 과거 메시지가 검색에 일치해도 supporter의 전체 응원 횟수와 최신 메시지를 보존한다.

## 3. 목표와 커버

- `cover_preset_key`: legacy `c1`~`c6`와 semantic `study`, `run`, `health`, `career`, `money`, `writing`, `habit`, `travel`을 함께 허용한다.
- 사용자가 선택한 preset 또는 custom upload가 제목 자동 선택보다 우선한다. `AUTO` 목표만 제목 수정 시 자동 재매핑한다.
- `close_my_goal(goal_id)`: owner-only, ACTIVE→CLOSED, `closed_at` 1회 기록, CLOSED 재호출 멱등. 클로버 원장과 잔액은 변경하지 않는다.
- `create_goal`: ACTIVE이고 삭제되지 않았으며 마감일이 지나지 않은 목표만 진행 중 3개 상한에 포함한다. CLOSED 목표는 지난 목표로 분리한다. 기존 3-argument RPC와 preset을 받는 4-argument RPC를 모두 유지한다.

## 4. 회원 탈퇴 사전 확인

- 승인 프로토타입대로 탈퇴는 고객센터 문의 접수다. auth/member를 직접 삭제하는 client RPC는 만들지 않는다.
- `account_withdrawal_eligibility()`: 본인의 클로버 잔액과 비종결 환전 요청만 읽는다. 잔액이 0이 아니거나 REQUESTED, KYC_PENDING, APPROVED, PAYOUT_SENT 환전이 있으면 접수를 거부한다.
- 기존 금융 테이블 FK가 member 삭제 시 cascade될 수 있으므로 금융 기록 보존 스키마가 별도 승인되기 전 자동 계정 삭제는 금지한다.

## 5. 구현과 검증 위치

- Migration: `supabase/migrations/20261025010000_v2_prototype_contract_completion.sql`
- Edge Function: `supabase/functions/profile-update/index.ts`
- Kakao 재로그인 보존: `supabase/functions/auth-kakao/index.ts`
- generated DB types: `web/src/lib/supabase/database.types.ts`
- pgTAP: `supabase/tests/v2_prototype_contract_completion.test.sql`
- 실제 Storage와 동시 finalize: `scripts/qa/verify-profile-avatar-runtime.mjs`
- cleanup runtime: `scripts/qa/verify-storage-cleanup-runtime.mjs`

## 6. 배포 경계

- 적용 대상은 local과 free Supabase staging이다. production migration과 function deploy는 이 변경 기록의 범위 밖이다.
- 신규 Edge Function: `profile-update`.
- 필수 Supabase Edge Function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. 선택값 `PROFILE_PUBLIC_BASE_URL`은 브라우저가 접근할 public Storage base URL을 override할 때만 쓴다.

## 근거

- 승인 prototype: `docs/design/prototypes/social-viral-loop-v3-opus5.html`
- 결정: `wiki/거버넌스/결정.md` D-049
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase signed upload URL: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- Supabase upload to signed URL: https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl

---

🏷 STAMP | line: v2 | 생성: 2026-10-25 06:53 KST | model: gpt-5.6-sol | agent: code-builder
skills: haenael-supabase-build | 근거: 승인 prototype v3, D-049, Supabase 공식 문서 3건
고민: 실제 계정 삭제를 편의상 열지 않고 금융 기록 보존과 승인 프로토타입의 고객센터 접수 계약을 우선했다.

SOURCES: `docs/design/prototypes/social-viral-loop-v3-opus5.html`; `wiki/거버넌스/결정.md`; https://supabase.com/docs/guides/storage/security/access-control
MODEL: gpt-5.6-sol
