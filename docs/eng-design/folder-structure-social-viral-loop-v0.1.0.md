# 소셜 바이럴 루프 폴더 구조

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-10-04 KST |
| 작성자/모델 | tech-architect / claude-opus-4-8 |
| 상류 핀 | FDD v0.1.0 §5, 실배포 `web/`·`supabase/` 현 구조 |

> STAMP: 생성 2026-10-04 KST. claude-opus-4-8. tech-architect. 근거 실배포 디렉터리(web/src/app·components, supabase/functions·migrations·tests). 고민 지점은 기존 web을 깨지 않고 miniapp·packages를 얹는 모노레포 경계. 결정 2(별도 CSR 미니앱) 채택 전제.

## 목차
- [1. 현행(보존)](#1-현행보존)
- [2. 소셜 확장 (신규/변경)](#2-소셜-확장-신규변경)
- [3. 폴더 책임·금지](#3-폴더-책임금지)
- [4. 관습 (기존 계승)](#4-관습-기존-계승)
- [5. 모노레포 빌드 직렬 주의](#5-모노레포-빌드-직렬-주의)

## 1. 현행(보존)
```
haenael-ge/
├── web/                    Next.js 운영 앱 (SSR, 카카오, 결제·환전·admin)
│   └── src/
│       ├── app/            라우트. (receiver)/wordmap 등 역할 분리
│       └── components/     goal/SplitBalanceCard 등
└── supabase/
    ├── migrations/         *.sql (진실원)
    ├── functions/          _shared·auth-kakao·cashout·cheer-order·kyc-verify·
    │                       lead-capture·notify·report·toss-confirm·toss-webhook·wordmap-render
    └── tests/              rls_policy.test.sql 등 pgTAP
```

## 2. 소셜 확장 (신규/변경)
```
haenael-ge/
├── web/src/
│   ├── app/(receiver)/
│   │   ├── me/goal/[id]/        신규: 목표 관리(인라인 편집·커버)
│   │   ├── friends/            신규: 친구목록
│   │   ├── friends/[id]/       신규: 친구 목표 상세
│   │   ├── invite/[token]/     신규: 초대 수락
│   │   └── my/                 신규: 마이페이지·선호
│   └── components/
│       ├── goal/               확장: GoalCoverPicker·GoalCoverUploader·InlineGoalEditor
│       └── social/             신규: FriendsPage·InvitePage·PreferenceToggles
├── miniapp/                    신규(결정2-A): Vite+React+Apps in Toss SDK
│   ├── src/app/                route·navigation·provider
│   ├── src/features/goal/      목표·커버 CSR
│   ├── src/features/social/    친구·초대
│   ├── src/features/wordmap/   owner 워드맵
│   ├── src/adapters/toss/      login·share·album·analytics
│   └── granite.config.ts
├── packages/                   신규: 순수 계약만(UI 전체 공유 아님)
│   ├── domain/                 DTO·validator·event names (런타임 import 0)
│   └── design-tokens/          색·간격·타입 토큰
└── supabase/
    ├── migrations/             신규: member_identity·member_preference·goal_cover_asset·
    │                           friend_invite·friend_connection·goal 컬럼·버킷·RPC·view
    ├── functions/              신규: goal-cover-sign-upload·goal-cover-finalize·
    │                           auth-toss·link-identity
    └── tests/                  신규 pgTAP: friend·cover·d003·identity
```

## 3. 폴더 책임·금지

| 블록 | 책임 | 금지 |
|---|---|---|
| `web` | SSR 공개목표, 카카오, 결제·환전·admin, 소셜 웹 화면 | 앱인토스 SDK import |
| `miniapp` | 토스 네비·CSR·로그인·공유·앨범 | 카카오 로그인, SSR, 외부 웹 임베드, 결제·환전 |
| `packages/domain` | 순수 타입·검증·이벤트 | Next·Toss·Supabase 런타임 import |
| `supabase` | 채널 공통 소셜 상태·권한 | 클라이언트에 service_role 노출 |
| cover worker(EF) | 업로드 검증·모더레이션·공개전환 | 승인 전 public URL 발급 |

## 4. 관습 (기존 계승)
- migration 파일명: `YYYYMMDDHHMMSS_<slug>.sql` 타임스탬프 순. 되돌리는 법을 주석에 명시.
- EF: `functions/<name>/index.ts` + `_shared` 공용. service_role은 EF만.
- pgTAP: `tests/<domain>.test.sql`. 통과분은 리그레션 누적.
- `docs/구현현황.md`는 docs 최상위 유일 허용 파일. build 단계가 갱신.

## 5. 모노레포 빌드 직렬 주의
같은 `supabase/`를 web·miniapp 두 라인이 동시에 빌드하면 충돌(헌법 §6). build 이후는 직렬. 소셜 migration은 한 라인에서만.
