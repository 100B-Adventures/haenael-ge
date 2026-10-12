# 해낼게 Apps in Toss v0

Apps in Toss CDN에 올리는 CSR 전용 Vite + React 미니앱이다. Next.js 웹과 배포 단위는 분리하고, 기존 Supabase 프로젝트의 승인된 소셜 계약만 호출한다.

기반 산출물: `docs/eng-design/fdd-core-social-viral-loop-appintoss-v0.1.0-gpt-codex.md`

## 포함 범위

- 목표 문장과 6개 프리셋 커버
- Toss 로그인 후 Supabase 세션 수립
- 친구 목표 목록과 응원 상세 조회
- Toss 딥링크 친구 초대
- 응원 및 마케팅 알림 선호 설정
- Storybook 공용 컴포넌트 카탈로그

결제, 환전, 금액, 잔액, 공개 순위는 번들과 화면에 포함하지 않는다. 미니앱은 새 DB 테이블이나 RPC를 만들지 않는다.

## 실행

```bash
npm install --legacy-peer-deps
npm run dev
npm run typecheck
npm test
npm run build
npm run build-storybook
npm run test:e2e
```

로컬 데이터가 있는 화면 검증은 `?demo=1`을 붙인다.

- 로그인: `http://127.0.0.1:4173/login?demo=1&next=/friends`
- 친구 목록: `http://127.0.0.1:4173/friends?demo=1`
- 응원 상세: `http://127.0.0.1:4173/goals/seoyeon-running?demo=1`

데모 어댑터는 이 쿼리 또는 `VITE_APPINTOSS_MODE=demo`에서만 선택된다. 운영 기본값은 Supabase 어댑터다.

## 운영 환경 계약

로컬 `.env.local`에 이름만 설정하고 실값은 커밋하지 않는다.

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APPINTOSS_MODE=live
```

Toss SDK의 일회성 `authorizationCode`는 `auth-toss` Edge Function에 바로 전달한다. 응답 토큰은 Supabase `auth.setSession`에만 넘기고 앱 자체 저장소에는 기록하지 않는다.

현재 레포에는 FDD가 정의한 `auth-toss`, 친구, 초대, 커버, 선호 RPC 구현이 없다. 배포 환경에 이 계약이 먼저 존재해야 실 Toss 로그인과 라이브 데이터가 동작한다. 클라이언트가 임의로 스키마를 보충하지 않는다.

## Apps in Toss

플랫폼 권한과 WebView 설정은 `apps-in-toss.config.ts`에서 관리한다. 정적 번들은 `dist/`에 생성된다.

```bash
npm run ait:build
npm run deploy
```

배포는 별도 승인 대상이다. Node 22에서는 `@apps-in-toss/ait-format`의 Node 24 이상 엔진 경고가 나므로, Apps in Toss 전용 번들·배포는 Node 24 환경에서 최종 확인한다.

STAMP: line=core | 갱신=2026-10-06 08:36 KST | model=gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=Apps in Toss 공식 생성기, FDD v0.1.0, DESIGN.md v2.0.1 | 고민=운영 계약과 화면 검증용 데모를 코드 경계에서 분리했다.
