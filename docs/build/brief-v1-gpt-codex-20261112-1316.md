<!-- STAMP
created: 2026-11-12 13:16 KST
model: gpt-5-codex
agent: code-builder
skills: haenael-supabase-build
sources: ~/.claude/pipeline/product-lane.yaml stage_brief_rule, ~/.claude/standards/standard-qa-methodology.md, /Users/sj/sj-ops-assets/paid-ads/검색등록-이벤트-점검-2026-11-12-v0.1.0.md
consideration: 공개 페이지의 검색 등록 기반과 동의 기반 GA4 행동 이벤트를 복원하되 개인정보가 포함될 수 있는 공개 목표 URL은 판단 전 색인하지 않는다.
-->

# 검색 등록·GA4 이벤트 개발 착수 브리프 v1

## 목적

해낼게의 공개 안내 페이지를 검색 엔진이 발견하고 소유권을 확인할 수 있게 하며, 사용자가 분석 정보 국외 이전에 동의한 경우에만 가입·로그인·워드맵·환전 행동을 GA4로 측정한다. 그로스 세션이 후속으로 사이트맵 제출과 네이버 소유확인을 실행할 수 있는 배포물을 만드는 단계다.

## 달성 기준

1. `/robots.txt`가 공개 정적 페이지를 허용하고 로그인·관리·API·회원·결제·환전 경로와 판단 대기 중인 `/g/<slug>`를 차단한다.
2. `/sitemap.xml`이 `https://haenael-ge.vercel.app` 기준으로 `/`, `/how`, `/terms`, `/privacy`, `/child-safety`와 `lastmod`만 제공한다.
3. 루트 HTML에 `naver-site-verification=e360b73dcf21099e19c1acf7aaf3ae67242f68fe` 메타 태그가 있다.
4. `wordmap_shared`, `wordmap_viewed`, `cashout_initiated`, GA4 권장 이벤트 `sign_up`, `login`이 분석 동의 후 `gtag`에 전달되고, 거부·미선택 상태에서는 큐와 네트워크 전송이 모두 없다.
5. 단위 시험·Vitest 전체·디자인 토큰 검사가 통과하고, 스테이징의 세 메타데이터 경로와 메타 태그를 직접 확인하며, 동일 소스 커밋 전체 회귀가 45/45다.

## 제약

- 운영 배포·main push·독립 검증은 하지 않는다. 작업 브랜치 push만 시도한다.
- `/g/<slug>`는 공개 목표의 제목·응원 문구가 개인정보가 될 수 있어 색인 허용과 사이트맵 등재를 결정하지 않는다. 결정 전에는 robots에서도 차단한다.
- 분석 동의 거부·미선택 상태의 미전송 계약과 결제·초대 토큰 경로의 분석 차단을 유지한다.
- 스테이징 배포 전 Vercel `projectName=haenael-ge`, `web/.next` 부재, `CASHOUT_STAGING_TEST_*` 환경 변수 이름을 확인하고 값은 출력하지 않는다.
- 다른 프로세스 소유 `session-state*.md` 이동·수정과 기존 미추적 QA 산출물은 수정하거나 커밋하지 않는다.
- 가장 어려운 지점은 초기 React 효과가 GA4 `config`보다 먼저 실행돼도 이벤트를 유실하지 않는 순서 보장과, 신규 가입·기존 로그인을 중복 없이 구분하는 것이다.

## 필요한 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 공개 라우트 목록 | 있음 | `web/src/app` 실제 `page.tsx` 목록 |
| 네이버 소유확인 값 | 있음 | 그로스 점검 문서 해낼게 행 |
| GA4 측정 ID | 있음 | `G-3QR2FB5BGC`, Vercel 공개 클라이언트 환경 변수 |
| 분석 동의·이벤트 래퍼 | 있음, 순서 결함 수정 필요 | `web/src/lib/analytics`, `GoogleAnalytics.tsx` |
| 인증 콜백의 신규 계정 판정 | 있음, 기존 로그인 표식 추가 필요 | `web/src/lib/auth/signup-mark.ts` |
| 스테이징 배포·회귀 도구 | 있음 | Vercel 프로젝트 연결, 기존 45건 회귀 스크립트 |

## 이번 판에서 판단할 것

1. **판단 대기:** `/g/<slug>`를 검색 허용·사이트맵 등재할지. 공개 목표에 닉네임·목표·응원 문구가 노출되므로 개인정보·검색 노출 정책을 회장이 정한 뒤 별도 반영한다.
2. 공개 정적 URL은 실제 비로그인 라우트 중 검색 가치가 있는 `/`, `/how`, `/terms`, `/privacy`, `/child-safety`로 고정한다.
3. GA4 초기화 전 이벤트는 `dataLayer`에 바로 넣지 않고 앱 대기열에 보존한 뒤 `config` 다음에 전달한다.
4. 인증 콜백에서 10분 이내 생성 계정은 `sign_up`, 그 밖의 기존 계정은 `login` 표식을 남기고 안전한 다음 화면에서 동의 여부를 확인해 한 번 전송한다.

## 이웃 영향 후보

루트 메타데이터 병합, Next.js 메타데이터 라우트 빌드, 민감 경로 분석 차단, 가입 전환의 Meta Pixel 동시 전송, OAuth 콜백 쿠키, 스테이징 Preview 환경 변수, 전체 45건 회귀.

## 읽은 것

지정된 `stage_brief_rule`, `standard-qa-methodology.md`, 그로스 점검 문서 해낼게 행과 실제 App Router 라우트·분석·OAuth 콜백·기존 단위 시험을 읽었다. 운영 Search Console·네이버 콘솔은 그로스 세션 실행 범위라 읽거나 조작하지 않았다.

기반 포맷: `docs/qa/brief-v1-gpt-codex-20261112-0158.md`.

KNOWLEDGE_QUERY: 해낼게 검색 등록 결손, 공개 라우트, GA4 이벤트 전달 경로를 조회했다.
HITS_USED: 그로스 점검 문서의 해낼게 행과 저장소 실물을 구현·검증 기준으로 사용했다.
HITS_REJECTED: 외부 시장 조사는 이미 정해진 메타데이터·이벤트 구현 작업이라 적용 대상이 아니다.
CONFLICTS: 없음.
SOURCES/MODEL: GPT-5 Codex · product-lane stage_brief_rule · standard-qa-methodology.md · 검색등록-이벤트-점검-2026-11-12-v0.1.0.md
SKILLS_USED: haenael-supabase-build, Next.js·Supabase 슬라이스 구현과 스테이징 검증 순서에 사용했다.
SKILLS_SKIPPED: 없음.

