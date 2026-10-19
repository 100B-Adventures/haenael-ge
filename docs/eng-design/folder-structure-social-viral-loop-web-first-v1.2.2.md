# 해낼게 V2 소셜 바이럴 루프 웹 우선 폴더 구조
| 항목 | 값 |
|---|---|
| 버전 | **v1.2.2** (Codex 4차 15/25 반려 반영: 문서 내부 모순 전수 제거) |
| 작성일 | 2026-10-19 17:0x KST |
| 작성자/모델 | tech-architect / claude-opus-5[1m] |
| 작업 라인 | v2 |
| 상태 | **현재 실물 + 6차 개정이 요구하는 추가 파일**. 목표 구조가 아니라 명령으로 확인한 실제 구조다 |
| 상류 핀 | `docs/design/prototypes/social-viral-loop-v3-opus5.html` **3.0.0** sha256 `f9398150755d42b2afbf5bdd7b6d982fd52b10ba8b6dd7da9b1ff72b3b9dca0c` · `DESIGN.md` sha256 `0ddeed8caff763de7b91ed5a0c178bf406c59a6ccefa65dcf5f057929e04c24a` · `docs/design/standard-ux-writing.md` sha256 `06e4ba1007bbb37c552d6c56a4fdfe4abbe86bcc06c9776dc4579b009fe26ece` · 동급 설계 `fdd-social-viral-loop-web-first-v1.2.2.md` · `architecture-…-v1.2.2.md` |
| 기반 포맷 | `docs/eng-design/folder-structure.md` v1.0.0 (2026-08-29) 의 트리·경계 서식 |

> STAMP: 생성 2026-10-19 17:0x KST. 모델 claude-opus-5[1m]. 에이전트 tech-architect. 스킬 미사용. 근거는 `find web/src/app -name page.tsx`·`ls web/src/components/social`·`ls supabase/functions`·`ls supabase/migrations` 실행 결과와 승인 프로토타입. 고민 한 줄: FDD v1.1.0 §3.3 이 적은 "신규 예정" 목록이 이미 전부 실재해서, 그 목록을 그대로 두면 구현자가 있는 파일을 다시 만든다는 점이었다.

## 목차
- [1. 현재 실물 (실측)](#1-현재-실물-실측)
- [2. 6차 개정이 요구하는 추가 파일](#2-6차-개정이-요구하는-추가-파일)
- [3. 폴더별 책임](#3-폴더별-책임)
- [4. 임포트 경계](#4-임포트-경계)
- [5. 관습 (이 레포에서 이미 합의된 것)](#5-관습-이-레포에서-이미-합의된-것)
- [5.5 벤치마크: 공식 문서와 대조](#55-벤치마크-공식-문서와-대조)
- [6. 개정 이력](#6-개정-이력)

## 1. 현재 실물 (실측)
FDD v1.1.0 §3.3 은 아래 대부분을 "신규" 로 적었다. **실측 결과 전부 실재한다.** 재창조 금지 대상이다.

```text
web/src/
  proxy.ts                      ← 실재(3,333B, 2026-07-19). canonical 도메인 308 전용
  app/
    page.tsx                    ← 랜딩
    layout.tsx
    globals.css                 ← :root 토큰 정본
    how/page.tsx                ← 이용안내 (R1 로 사업자 정보를 소유하게 됨)
    terms/page.tsx  privacy/page.tsx  child-safety/page.tsx
    g/[slug]/page.tsx           ← 공개 목표 (비로그인 SSR)
    invite/[token]/page.tsx     ← 초대 미리보기·수락 (비회원 경계)
    payment/success|fail/page.tsx
    admin/page.tsx
    api/health/route.ts
    auth/{callback,logout}/route.ts
    auth/kakao/{start,callback}/route.ts
    (receiver)/
      layout.tsx                ← ReceiverAppShell(locked=!user): D-034 의 구조적 원인
      me/page.tsx
      me/goal/[id]/page.tsx
      me/achievements/page.tsx
      my/page.tsx
      friends/page.tsx
      friends/[friendId]/page.tsx
      invite/page.tsx
      onboarding/page.tsx
      wordmap/[goalId]/page.tsx
      cashout/{page,history,status}.tsx   ← 변경 금지 영역
  components/
    social/                     ← 12파일 전부 실재
      FriendGoalDetail.tsx  FriendGoalList.tsx  FriendInviteCard.tsx
      FriendRelationshipBadge.tsx  GoalCover.tsx  GoalCoverPicker.tsx
      GoalVisibilityControl.tsx  InviteAcceptCard.tsx  MyPageOverview.tsx
      ReceiverBottomNav.tsx  SocialComponents.stories.tsx  MyPageOverview.stories.tsx
      __tests__/
    goal/        MyGoalListCard.tsx  GoalCard.tsx  DdayChip.tsx  CheerCount.tsx  MyLinkCard.tsx
    receiver/    ReceiverShell.tsx  ReceiverTopBar.tsx  CheerList.tsx  SplitBalanceCard.tsx
    admin/  auth/  cashout/  common/  pwa/  ui/  analytics/
  lib/
    social/server.ts            ← 커버 서명 URL 일괄 발급(103행)·친구 응답 조립
    supabase/server.ts

supabase/
  functions/                    ← 9개 실재. 운영 배포 확인분 포함
    goal-cover-sign-upload/  goal-cover-finalize/  admin-review-goal-cover/
    notify/  report/  wordmap-render/  toss-confirm/  toss-webhook/
    kyc-verify/  lead-capture/
  migrations/                   ← 49건. V2 관련 4건
    20261013050000_social_viral_loop_web_first.sql
    20261013060000_social_my_page_achievements.sql
    20261015010000_cheer_friendship_backfill.sql        ← D-024
    20261016021000_friend_relationship_direction.sql    ← D-026
  tests/cashout_security_hardening.test.sql             ← 삭제·약화 금지

web/e2e/cashout-manual.spec.ts                          ← 삭제·약화 금지
scripts/qa/                     ← 프로토타입 린트 5종(overflow·voice·collapse·interact·motion)
qa/contracts/                   ← 계약 데이터 (deploy-env.contract.json 등)
```

**확인 명령**: `find web/src/app -name "page.tsx" -o -name "route.ts" -o -name "layout.tsx"` · `ls web/src/components/social` · `ls supabase/functions supabase/migrations` · `ls -la web/src/proxy.ts` (2026-10-19).

## 2. 6차 개정이 요구하는 추가 파일
**신설은 5개뿐이고 그중 2개는 결정에 종속된다.** 나머지는 기존 파일 수정이다.

| 경로 | 종류 | 왜 | 조건 |
|---|---|---|---|
| `web/src/lib/legal/exposure.ts` | 신설 | 법적 고지 노출 표를 **코드 데이터**로 둔다. 프로토타입 `LEGAL_EXPOSURE` 와 같은 키·같은 값(D-032) | R1. 무조건 |
| `web/src/components/common/LegalFooter.tsx` | 신설 | 표를 읽고 **표에 없으면 DOM 을 만들지 않는다.** 화면마다 손으로 쓰지 않는다 | R1. 무조건 |
| `web/src/components/social/CheerSummaryBar.tsx` | 신설 | 아바타 스택 · 인원수 · 최근 응원 한 줄(R6). `MyGoalListCard` 와 `MyPageOverview` 가 공유 | R6. 무조건 |
| `qa/contracts/protected-routes.json` | 신설 | 보호 라우트 목록을 데이터로. **경계와 테스트가 같은 파일을 읽는다**(D-032) | D-OPEN-2 가 A안일 때 |
| `web/src/components/common/ClampText.tsx` | 신설 | 2줄 말줄임 + 꺾쇠 펼침을 4경로가 공유. 클램프 줄 수는 CSS 변수 1개 | D-030-C. 무조건 |
| `web/src/lib/copy/guest-preview.ts` | 신설 | 비회원 미리보기 **예시 데이터 상수**(회장 확정). 서버를 호출하지 않는다 | R2. 무조건 |
| `web/src/lib/copy/` (카피 모듈) | 신설 | 사용자에게 보이는 문구를 한 자리로. 말투 교정이 한 번에 되게 | R4. 무조건 |
| `web/src/components/common/Collapsible.tsx` | 신설 | 접기 정책의 **단일 집행자**. 세 조건을 판정하고 어기면 접지 않는다 | R8. 무조건 |
| `supabase/migrations/<ts>_goal_cover_abandoned_cleanup.sql` | 신설 | `storage_cleanup_queue.reason` CHECK 교체 + `locked_at` 컬럼 + 부분 인덱스 + `purge_abandoned_goal_covers()` + cron job 2개 | R5. 무조건 |
| `supabase/functions/storage-cleanup-worker/index.ts` | **신설** | **`storage_cleanup_queue` 를 비우는 주체.** Storage API `remove()` 로 객체를 지운다. DB 함수로는 할 수 없다(DB 행 삭제는 객체를 지우지 않는다) | R5. 무조건 |

**폐기된 후보**: `platform_social_stats()`: 회장이 집계 수치 안을 택하지 않았다. **이번 개정의 신설 RPC 는 정리 함수 1개뿐이고 조회용 신설 RPC 는 0건이다.**

| 경로 | 종류 | 무엇을 고치나 |
|---|---|---|
| `web/src/proxy.ts` | **수정** | canonical 308 뒤에 보호 라우트 판정을 더한다. **새 파일·새 matcher 를 만들지 않는다**(matcher 가 이미 전 경로를 덮는다) |
| `web/src/app/globals.css` | 수정 | `:root` 에 `--sp-0`~`--sp-6`·`--cta-h`·`--cheer-clamp-lines` 추가. 폐지된 `--tabbar-lock-size` 제거 |
| `web/src/components/social/ReceiverBottomNav.tsx` | 수정 | 자물쇠 배지 제거, 비회원 탭은 티저 시트를 연다(R2) |
| `web/src/components/social/GoalCoverPicker.tsx` | 수정 | 업로드 버튼을 스크롤 줄 밖으로, 선택 상태를 단일 변수로(R5) |
| `web/src/components/social/GuestTeaserSheet.tsx` | 신설 | `role="dialog"`·`aria-modal`. **`guest-preview.ts` 상수만 그리고 서버를 호출하지 않는다.** 흐림 처리를 쓰지 않는다(R2 회장 확정) |
| `web/src/components/social/MyPageOverview.tsx` | 수정 | 업적 블록의 **등급 토글 제거**(R7) · 응원 메시지 2줄 clamp · 법적 고지 1단 목록 |
| `web/src/components/goal/MyGoalListCard.tsx` | 수정 | `cheerCount` 만 받던 계약에 `supporter_avatars`·`recent_cheer` 추가 |
| `web/src/app/page.tsx` | 수정 | 법적 고지 블록 **제거**(노출 표 `landing: 'none'` 확정) |
| `web/src/app/(receiver)/my/page.tsx` | 수정 | 1단: 약관·개인정보처리방침·**사업자 정보** 세 항목 목록. 전문을 펼치지 않는다(회장 확정) |
| `web/src/app/(receiver)/my/legal/page.tsx` | **신설** | 2단: **사업자 정보 전문을 이 화면이 소유한다**(D-040). 법정 기재 6항목 전수. `/how` 는 법적 고지를 소유하지 않는다 |
| `web/src/components/receiver/CheerList.tsx` 외 3종 | 수정 | `truncate`(1줄) → `ClampText`(2줄) + `Collapsible` |
| `supabase/migrations/20261013050000` 계열 | **수정 금지** | 이미 운영 적용됐다. 변경은 새 migration 으로만 |

## 3. 폴더별 책임
| 폴더 | 책임 | 금지 |
|---|---|---|
| `web/src/proxy.ts` | 도메인 정규화 + **보호 라우트 선제 판정**(낙관적) | 최종 인가 판정. Server Action 을 덮지 못하므로 여기서만 막지 않는다 |
| `web/src/app/(receiver)/` | 인증 회원 화면. SSR 데이터 조립 | service role 사용, RLS 우회 |
| `web/src/app/{g,invite/[token],how,terms,privacy}/` | 비회원이 닿는 화면 | 회원 셸·하단탭 회원 전용 데이터 |
| `web/src/components/social/` | V2 소셜 기능 부품 | 금액·순위 계산, 공개범위 판정 |
| `web/src/components/common/` | 화면 교차 공유 부품(`LegalFooter`·`ClampText`) | 기능 고유 로직 |
| `web/src/lib/legal/` | **노출 규칙 데이터**(SSOT) | 렌더 로직 |
| `web/src/lib/social/` | 서버 전용 조립(서명 URL 발급·응답 투영) | 클라이언트 번들 포함 |
| `supabase/migrations/` | 스키마·RPC·권한. **additive 만** | 운영 적용분 수정, 파괴적 변경 |
| `supabase/functions/` | Storage 서명·검증·관리자 승인 | 승인 전 공개 URL 발급 |
| `qa/contracts/` | **검사가 읽는 계약 데이터** | 코드 로직 |
| `scripts/qa/` | 출고 전 린트 | 제품 코드 임포트 |

## 4. 임포트 경계
```text
app/(receiver)/*  →  components/{social,goal,receiver,common}  →  lib/*
app/{g,invite/[token],how}/*  →  components/{goal,common}
proxy.ts  →  qa/contracts/protected-routes.json (읽기 전용 import)
components/*  ↛  lib/social/server.ts        (서버 전용. 서버 컴포넌트만 호출)
components/*  ↛  supabase service role       (어떤 경로로도 금지)
components/common/LegalFooter  →  lib/legal/exposure  (단방향)
lib/legal/exposure  ↛  components/*          (데이터는 코드를 모른다)
```

**새로 못박는 두 줄**

1. `LegalFooter` 외에 법적 고지 문구를 직접 쓰는 컴포넌트를 만들지 않는다(LG-05 가 린트로 잡는다).
2. 보호 라우트 목록은 `proxy.ts` 와 Playwright 가 **같은 파일**을 읽는다. 둘이 각자 배열을 들고 있으면 갈라진다.

## 5. 관습 (이 레포에서 이미 합의된 것)
| 관습 | 내용 | 근거 |
|---|---|---|
| 라우트 그룹 | 인증 회원 화면은 `(receiver)` 그룹 | 기존 구조 |
| 컴포넌트 이름 | 기능 폴더 + PascalCase. `GoalCard`(공개)와 `MyGoalListCard`(내 목록)는 **다른 파일**이고 덮어쓰지 않는다 | `MyGoalListCard.tsx` 주석의 명시 경고 |
| 토큰 | 색·반경·간격·타이포는 전부 `globals.css :root` 한 곳. 새 토큰 파일을 만들지 않는다 | `DESIGN.md` · R10 |
| migration 이름 | `<YYYYMMDDHHMMSS>_<snake_case>.sql` | 기존 49건 |
| 함수 보안 | `SECURITY DEFINER` + `SET search_path = ''` + PUBLIC revoke + 최소 grant | 기존 V2 migration 전수 |
| Storybook | 소셜 부품은 `*.stories.tsx` 를 함께 둔다 | `SocialComponents.stories.tsx` 선례 · 레인 규약 |
| 검사 위치 | 프로토타입 린트는 `scripts/qa/`, 계약 데이터는 `qa/contracts/` | 기존 구조 |
| 변경 금지 | `web/e2e/cashout-manual.spec.ts` · `supabase/tests/cashout_security_hardening.test.sql` · cashout 라우트·RPC·원장 | 라인 불변식 |

## 5.5 벤치마크: 공식 문서와 대조
v1.2.0 이 "외부 조사 0건" 을 자인해 벤치마크 축이 깎였다(Codex 지적). 공식 문서 2건을 실제로 조회해 이 구조가 프레임워크 권고와 어긋나지 않는지 대조했다.

| 출처 | 문서가 말하는 것 | 우리 구조 | 판정 |
|---|---|---|---|
| [Next.js · Project Organization and File Colocation](https://nextjs.org/docs/app/building-your-application/routing/colocation) | Next.js 는 라우팅 규약 밖의 구조를 강제하지 않는다. **`page.js`·`route.js` 가 있는 폴더만 공개 라우트가 되므로** 다른 파일은 라우트 폴더 옆에 둬도 노출되지 않는다 | 우리는 컴포넌트를 `app/` 밖(`components/`)에 두는 쪽을 택했다. 둘 다 허용되며, 기존 레포가 이미 그렇게 합의돼 있어 유지한다 | 어긋나지 않음 |
| [Next.js · Project structure](https://nextjs.org/docs/app/getting-started/project-structure) | 밑줄 접두어 비공개 폴더는 **필수가 아니고** UI 와 라우팅 로직 분리를 돕는 선택이다. 괄호 폴더(route group)는 **URL 에 반영되지 않는 조직 수단**이다 | `(receiver)` route group 으로 인증 회원 화면을 묶는 것이 바로 그 용법이다. 밑줄 폴더는 쓰지 않는다(컴포넌트가 이미 `app/` 밖이라 불필요) | **공식 용법과 일치** |
| 같은 문서 | 기능 폴더(feature folder)는 **프레임워크 규약이 아니라 선택**이다 | `components/{social,goal,receiver,common,admin,…}` 기능 폴더는 우리 선택이고 프레임워크가 요구한 것이 아니다. 그래서 이 문서가 그 선택을 관습으로 명시한다 | 선택임을 명시 |

**차용한 것** route group 을 조직 수단으로만 쓰고 URL 의미를 부여하지 않는 원칙. **다르게 한 것** 공식 문서가 선택으로 둔 기능 폴더와 `components/` 외부 배치를 이 레포의 **관습으로 고정**했다. 판마다 재협상되면 그것이 비용이기 때문이다(D-032 와 같은 이유).

**조사하지 않은 것** 모노레포 패키지 분리 전략. 이 레포는 단일 `web/` 이고 분리 계획이 없어 적용점이 없다.

## 6. 개정 이력
| 버전 | 일자 | 변경 | 작성자 |
|---|---|---|---|
| v1.2.2 | 2026-10-19 | Codex 4차 반려 반영. 상단 핀에 프로토타입 이름·버전·sha256 추가(종전엔 없었다). `storage-cleanup-worker` 엣지 함수 신설분 추가. `my/legal` 소유권 서술을 D-040 으로 단일화 | tech-architect / claude-opus-5[1m] |
| v1.2.1 | 2026-10-19 | 회장 확정 4건 반영: 비회원 미리보기 예시 데이터 상수(`guest-preview.ts`), 법적 고지 2단 구조(마이페이지 목록 → `my/legal` 전문), `proxy.ts` 확장, 업로드 3단 유지. `platform_social_stats()` 폐기하고 정리 migration 1건으로 교체. R4 카피 모듈·R8 `Collapsible.tsx` 신설분 추가. **§5.5 벤치마크 신설**(Next.js 공식 문서 2건 실조사: v1.2.0 의 "외부 조사 0건" 해소) | tech-architect / claude-opus-5[1m] |
| v1.2.0 | 2026-10-19 | 신설. FDD v1.1.0 §3.3 이 "신규" 로 적은 파일 대부분이 실재함을 실측으로 확인해 재창조를 막았다. 6차 개정이 요구하는 신설 7건·수정 10건을 분리하고 그중 2건을 결정 종속으로 표시했다. 노출 규칙 데이터와 렌더의 단방향 경계를 임포트 규칙으로 못박았다 | tech-architect / claude-opus-5[1m] |

---

SKILLS_USED: 없음.

SKILLS_SKIPPED: `document-generate` = 기존 `folder-structure.md` 의 서식을 상속한 라인 전용 개정이고 백지 생성이 아니다. `diagram` = 트리 표현에 다이어그램 파일이 불필요하다.

KNOWLEDGE_QUERY: 레포 실측 + **외부 공식 문서 2건 실조사**. `find`·`ls`·`grep` 으로 라우트 29개·소셜 컴포넌트 12개·엣지 함수 9개·migration 49건·`proxy.ts` 확인. 웹에서 Next.js App Router 프로젝트 구조·route group·colocation 규약 조회(§5.5).

HITS_USED: `docs/eng-design/folder-structure.md` v1.0.0 의 "목표 구조가 아니라 실제 구조" 원칙과 임포트 경계 서식을 상속. `MyGoalListCard.tsx` 주석의 덮어쓰기 경고를 관습표에 승격.

HITS_REJECTED: Makerkit 등 3자 가이드의 모노레포 기능 패키지·`_components`/`_lib` 권고는 **공식 규약이 아니고** 이 레포가 단일 `web/` 이라 적용점이 없어 미채택. 밑줄 접두어 비공개 폴더도 컴포넌트가 이미 `app/` 밖이라 불필요해 미채택. `vendor_selection` 해당 없음: 외부 공급자 추천 0건.

CONFLICTS: FDD v1.1.0 §3.3 의 "신규" 목록과 실측이 충돌 → 실측이 이김. 그 목록을 그대로 두면 구현자가 있는 파일을 다시 만든다.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "공식 문서가 기능 폴더를 선택으로 두므로 우리 배치가 최선이라는 외부 근거는 없다. 어긋나지 않는다는 것만 확인했다."

SOURCES/MODEL: claude-opus-5[1m] | https://nextjs.org/docs/app/building-your-application/routing/colocation · https://nextjs.org/docs/app/getting-started/project-structure · `docs/eng-design/folder-structure.md` · `docs/eng-design/fdd-social-viral-loop-web-first-v1.1.0.md` §3.3 · `web/src/` 실측 · `supabase/` 실측 · `web/src/components/goal/MyGoalListCard.tsx` · `web/src/proxy.ts` · `DESIGN.md`

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 확인 / 컨트롤러 표시용 창은 열지 않음
