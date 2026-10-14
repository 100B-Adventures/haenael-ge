# 해낼게 V2 승인 시안 재정렬 build 결과

> 한 줄 결론: D-024 양방향 친구 연결과 소급 마이그레이션은 로컬 DB에서 통과했고 전체 테스트·운영 빌드도 통과했지만, 승인 시안 대 화면 대조는 6화면 불일치·1화면 미확인이어서 디자인 정합 게이트는 미통과다.

기반 포맷: `docs/qa/v2-approved-production-audit-v1-gpt-codex.md`

STAMP: 2026-10-15 02:05 KST | model=gpt-codex | agent=code-builder | skill=haenael-supabase-build | 근거=승인 프로토타입·화면 인벤토리·D-024·로컬 Supabase·Playwright | 고민=테스트와 빌드 성공을 시안 일치로 오인하지 않고 대조 결과를 별도 게이트로 유지했다.

## 1. 판정

| 공정 | 상태 | 직접 증거 |
|---|---|---|
| D-024 마이그레이션 | 테스트됨 | 로컬 `supabase db reset`에서 `20261015010000_cheer_friendship_backfill.sql` 적용. 단일 pgTAP 13/13, 실제 DB 세션 경합 2순서 PASS |
| DB 전체 회귀 | 테스트됨 | pgTAP 19파일, 336테스트 PASS |
| 웹 단위·통합 | 테스트됨 | Vitest 59파일, 334테스트 PASS |
| 운영 빌드 | 테스트됨 | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 PASS |
| 실제 렌더 스모크 | 관찰됨 | 로컬 Supabase 데이터와 dev server에서 9경로×2뷰포트 HTTP 200, 콘솔 오류 0, 가로 넘침 0. Playwright 1/1 PASS |
| 모바일 사용성 | 테스트됨 | 데이터가 있는 공개 목표에서 360·390·412·600·700·780·820·900·1000 전부 PASS |
| 시안 대 구현 대조 | 미통과 | 화면 기준 불일치 6, 미확인 1. 14개 이미지 쌍의 크기·좌우 순서·통짜 덤프 검사는 PASS |
| 운영 적용 | 미실행 | 운영 DB 마이그레이션, 웹 배포, 운영 데이터 쓰기 0건 |

## 2. D-024 양방향 친구 연결

### 2.1 동작 계약

- 로그인 회원의 응원이 `CONFIRMED`가 되면 응원한 회원과 목표 소유자의 UUID를 정규화해 `friend_connection` 1행을 만든다. 관계는 양쪽 조회에서 같은 ACTIVE 연결로 보인다.
- attribution 저장과 응원 확정이 어느 순서로 오더라도 cheer 행 잠금으로 직렬화해 누락을 막는다.
- 기존 `REMOVED`, `BLOCKED` 관계는 응원이 임의로 되살리지 않는다.
- 자기 목표 응원과 웰컴 응원은 친구 관계를 만들지 않는다.
- 환불 또는 soft-delete 뒤에도 과거 `DONE` 결제 로그가 있으면 확정 이력으로 소급한다.
- attribution UPDATE는 기존 친구 관계와 새 귀속이 갈라지는 ghost friendship을 막기 위해 거부한다.
- backfill은 대상 관계를 집합 연산으로 삽입하고 canonical pair unique 충돌은 `DO NOTHING`으로 멱등 처리한다.

### 2.2 로컬 검증

| 시험 | 정상 경로 | 거절·경계 경로 | 결과 |
|---|---|---|---|
| `social_cheer_friendship.test.sql` | 확정 응원, 늦은 attribution, 과거 소급, 삭제 목표 | self, welcome, REMOVED, BLOCKED, client 직접 실행, attribution 수정 | 13/13 PASS |
| `cheer_friendship_race.sh` | attribution 선행, status 선행 | 각 세션 10초 statement timeout, canonical pair 1행 단정 | PASS |
| 전체 DB | 마이그레이션 전체 reset·seed | 기존 결제·환전·RLS·소셜 계약 | 336/336 PASS |

운영에는 적용하지 않았다. 마이그레이션 파일과 로컬 검증만 존재한다.

## 3. 전체 테스트와 빌드

| 명령 | 결과 |
|---|---|
| `supabase db reset --local` | PASS. 신규 마이그레이션과 seed 적용 |
| `supabase test db --local supabase/tests` | 19파일, 336테스트 PASS |
| `npm test` | 59파일, 334테스트 PASS |
| `npm run build` | Next.js 16.4.0 PASS, 정적 생성 17/17 |
| `npm run qa:design-tokens` | 검사 파일 169개, 신규 위반 0. 기준선 위반 71→70 |
| viewport Playwright | 1/1 PASS, 9경로×390·1280, 콘솔 오류 0, 가로 넘침 0 |

테스트 파일 삭제 0건, skip 수는 기준 커밋과 현재가 각각 16건으로 증가 0건이다. 화면 캡처 테스트에서 빠졌던 목표 상세와 관리자 HTTP·overflow·console 단정은 복원했다. 기존 환전 수수료 공식, advisory lock, 계좌 마스킹 단정은 변경하지 않았다.

## 4. 모바일 사용성 원문 증거

측정 대상은 로컬 공개 목표 1건과 확정 응원 fixture 3건이다. 오류 화면이나 빈 화면을 사용하지 않았다.

| 폭 | 13px 미만 | 본문 토큰 | 44px 미만 누름 | 눌림 상태 | 가로 넘침 | 결과 |
|---:|---:|---:|---:|---:|---:|---|
| 360 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 390 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 412 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 600 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 700 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 780 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 820 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 900 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |
| 1000 | 0 | 16px | 0 | 12/12, 100% | 0 | PASS |

전체 JSONL: [`evidence/v2-approved-build-v1.0.0/mobile-ergonomics.jsonl`](evidence/v2-approved-build-v1.0.0/mobile-ergonomics.jsonl)

## 5. 승인 시안 대 구현 대조

대조 보드: [`../design/boards/v2-approved-build-compare-v1-gpt-codex.html`](../design/boards/v2-approved-build-compare-v1-gpt-codex.html)

| 화면 | 390px | 1280px | 핵심 차이 |
|---|---|---|---|
| 비회원 랜딩 | 불일치 | 불일치 | 승인 프리뷰와 구현 실제 워드맵, 설명 토글, 로그인 카피가 다름 |
| 공개 목표 | 불일치 | 불일치 | 프로필·목표 설명·응원 수·CTA의 정보 위계와 배치가 다름 |
| 마이페이지 | 불일치 | 불일치 | 승인 시안은 개별 응원 목록, 구현은 응원 요약 카드로 집계 |
| 초대 생성 | 불일치 | 불일치 | 승인 실사·전달 예시 중심과 구현 아바타·링크 생성 폼이 다름 |
| 초대 수락 | 미확인 | 미확인 | 승인 프로토타입에 전용 수락 화면이 없음 |
| 친구 목록 | 불일치 | 불일치 | 승인 진행률·연속 기록 목록과 구현 카드 구조가 다름 |
| 친구 상세 | 불일치 | 불일치 | 승인 실사·타임라인과 구현 응원 요약·워드맵 구조가 다름 |

`verify-compare-pairs.py` 결과는 크기 대조 14쌍, 통짜 덤프 0, 좌우 순서 위반 0이다. 보드 렌더는 이미지 28개, 깨진 이미지 0, 콘솔 오류 0으로 관찰했다.

## 6. 보존한 기존 기능과 변경한 것

보존한 기존 기능:

- 초대 기반 관계, 친구 조회, 공개범위 RLS, 커버 업로드, 결제·환전·관리자 경로.
- 환전 수수료 공식, A안 advisory lock, 계좌 마스킹 보호.
- 기존 REMOVED·BLOCKED 관계와 익명 응원 처리.

추가·변경한 것:

- D-024 친구 projector, 두 trigger, attribution 불변 guard, 과거 backfill, pgTAP과 실경합 테스트.
- 캡처 fixture의 구현용 sentinel 문구를 사용자 언어로 교체했다. 공개범위 검증 단정은 같은 강도로 유지했다.
- 공개 목표의 모바일 최소 글자·누름 크기와 눌림 상태를 토큰·공용 컴포넌트에서 보정했다.
- 390×844, 1280×900 구현 캡처와 승인 시안 대조 보드를 갱신했다.

## 7. 자기검증과 레드팀

이 결론이 틀릴 가장 그럴듯한 이유는 단위 테스트가 실제 동시 commit 순서를 재현하지 못하거나, 환불된 과거 응원을 현재 상태만 보고 누락하는 경우다. 이를 두 실제 psql 세션의 반대 순서 경합과 `payment_log.to_status='DONE'` 소급 fixture로 반증했다.

까다로운 운영자 관점에서는 빌드 PASS를 시안 일치로 포장할 위험이 가장 크다. 화면별 승인 시안과 로컬 구현을 같은 크기로 나란히 놓고, 실제 차이가 남은 6화면은 모두 불일치로 유지했다. 따라서 이 문서는 배포 승인이 아니라 build 증거와 남은 디자인 부채를 함께 기록한다.

## 8. 다음 실행

QA 소유자가 대조 보드의 6개 불일치를 기준으로 디자인 재오픈 여부를 판정해야 한다. 현 build를 그대로 QA 승인하거나 운영 배포하면 안 된다. 운영 마이그레이션과 웹 배포는 별도 승인 뒤에만 실행한다.

KNOWLEDGE_QUERY: 해낼게 V2 build·D-024·승인 프로토타입, BRAIN 성장응원·공유장벽, Next.js App Router, Supabase DB functions·migrations, PostgreSQL trigger·ON CONFLICT를 조회했다.
HITS_USED: `pipeline-state.v2.md`, 승인 프로토타입·화면 인벤토리, D-024 결정, 기존 감사 문서와 실제 코드·테스트를 계약과 회귀 기준으로 채택했다. PostgreSQL과 Supabase 공식 문서는 trigger 보안·멱등 migration·동시성 검증 근거로 사용했다.
HITS_REJECTED: 일반적인 소셜 앱 UI 사례는 승인 프로토타입보다 우선할 수 없어 화면 구조 결정에는 사용하지 않았다. BRAIN의 범용 바이럴 원칙도 이번 구현 범위를 늘리는 근거로 쓰지 않았다.
CONFLICTS: 외부 일반 권장과 회장 승인 프로토타입이 충돌하는 화면 구조는 승인 프로토타입을 우선했다. 현재 구현이 그 기준과 다른 6화면은 불일치로 남겼다.

SKILLS_USED: haenael-supabase-build, Supabase 수직 슬라이스의 migration→pgTAP→경합→전체 회귀→실렌더 증거 순서에 사용.
SKILLS_SKIPPED: review, PR landing 과업이 아니고 현재 변경은 로컬 build 결과 제출이라 실행하지 않음.

SOURCES/MODEL: gpt-codex/정확 ID 비공개 | `docs/design/prototypes/social-viral-loop-v2-opus48.html`, `docs/design/prototypes/screen-inventory-v3.md`, `docs/qa/v2-approved-production-audit-v1-gpt-codex.md`, `wiki/거버넌스/결정.md`, `/Users/sj/.claude/standards/standard-dev.md`, `/Users/sj/.claude/standards/standard-design.md`, https://nextjs.org/docs/app, https://supabase.com/docs/guides/database/functions, https://supabase.com/docs/guides/deployment/database-migrations, https://www.postgresql.org/docs/current/sql-createtrigger.html, https://www.postgresql.org/docs/current/sql-insert.html
