# V2 서버 계약 최종 인계

> STAMP: 생성 2026-10-25 KST. 모델 gpt-5.6-sol. 에이전트 code-builder. 스킬 haenael-supabase-build. 근거는 로컬 Supabase PostgreSQL, Edge Functions, Storage runtime 직접 실행과 독립 보안 리뷰다. 가장 오래 검토한 지점은 Presigned URL 만료 전 재업로드와 동시 finalize가 ACTIVE 프로필 사진을 삭제하지 않게 하는 경계였다.

## 판정

- 로컬 서버 계약: PASS.
- 독립 보안 리뷰: `NO_FINDINGS`. 리뷰어가 아래 7개 로그와 migration SHA-256을 직접 확인했다.
- Supabase staging: 54번째 migration과 Edge Functions 16개 배포, 신규 RPC 존재·EXECUTE 권한은 관찰됨. 실제 쓰기 경로는 미검증이며 별도 staging E2E가 판정한다.
- production: 적용하지 않았다.

동결 migration SHA-256:

`131046072ee84a5306f6578826ff74767e0d1b4e7f2d8b4277a9819b95630999  supabase/migrations/20261025010000_v2_prototype_contract_completion.sql`

## 실행 증거

| 검증 | 결과 | 로그 SHA-256 |
|---|---|---|
| `npx supabase test db` | 22 files, 412 tests PASS. 신규 V2 계약 43 tests 포함 | `762bcb04d4e9482e62f6f248e83f9e7b0aef7c9d4f47c82a89d1de79c1fee161` |
| Storage cleanup schedule | active cron 3, command contracts PASS, forbidden durable mutation 0 | `5c9b289138f27175627d053f0e3337a4c23ea0b8d86a133bc062409de2662e3a` |
| Storage cleanup concurrency | 병렬 claim 교집합 0, overlapping transaction 관찰, short lease reclaim 0 | `21abd1c12210d03cf2ec8026ac37e1799fa7d9ff1fe7eb22cdfc49afbf3293cf` |
| Storage cleanup runtime | profile object 삭제, queue `DONE`, cron·재시도·동시 호출 PASS | `30886b1aecb40cb51838d226fb4f064d549d8ed136c43368540061af8715e124` |
| Cheer summary index | index 사용, recent branch 60 rows에서 3 rows로 감소 | `a08968e0842b77f0259ebc63f8490539525e44048e2413e88d76f24309664490` |
| 프로필 사진 HTTP·Storage | sign 200, PUT 200, 정상 finalize 200, 오류 hash 422, 타인 404, magic bytes 415 | `067d8d9332818b4b91baa830241bb890c4e463ecda623bc1601bbf0fb96c6a0e` |
| `create_goal` 동시성 | 1건 성공, 1건 상한 거절, ACTIVE 목표 총 3건 | `ec32a6d5df94f315072d4c398fab107b8a85addaa05cfedb8a24c2858bbb50a0` |

각 SHA-256은 이 디렉터리의 같은 이름 `.log` 파일에 대응한다.

## 배포 입력

- 신규 Edge Function: `profile-update`.
- 변경 Edge Function: `auth-kakao`.
- 새 필수 secret: 없음. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 기본 환경변수다.
- 새 optional 환경변수: `PROFILE_PUBLIC_BASE_URL`.
- `storage-cleanup-worker` 소스는 바꾸지 않았다. migration의 cleanup RPC만 확장했다.

## 자체 반증

이 판정이 틀렸다면 가장 가능성 높은 이유는 로컬 Supabase와 staging의 Edge Function URL 또는 Storage 정책 차이다. 그래서 로컬 PASS를 staging PASS로 승격하지 않았고, 실제 staging sign→PUT→finalize→preset 복귀 E2E를 별도 필수 판정으로 남겼다.

까다로운 보안 검수 관점에서는 service-role RPC 우회, 동시 finalize의 ACTIVE object 삭제, Presigned URL 만료 전 orphan, Kakao 재로그인의 사용자 편집 덮어쓰기가 주요 공격점이다. migration과 Edge Function은 각각 권한 회수, compare-and-set 상태 전이, 만료 뒤 cleanup queue, 원자적 default hydration으로 닫았고 독립 리뷰가 실행 로그까지 확인했다.

SKILLS_USED: haenael-supabase-build, Supabase 서버 계약 구현·로컬 DB·Storage·Edge Function 검증에 사용
SKILLS_SKIPPED: 없음
SOURCES: `docs/design/prototypes/social-viral-loop-v3-opus5.html`, `docs/eng-design/fdd-social-viral-loop-web-first-v1.2.5.md`, https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
MODEL: gpt-5.6-sol
