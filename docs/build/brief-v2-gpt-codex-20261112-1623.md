<!-- STAMP
created: 2026-11-12 16:23 KST
model: gpt-5-codex
agent: code-builder
skills: haenael-supabase-build
sources: ~/.claude/pipeline/product-lane.yaml stage_brief_rule, ~/.claude/standards/standard-qa-methodology.md, ~/.claude/standards/release-notes-and-whats-new.md, ~/.claude/standards/release-and-artifacts.md §1.0, DESIGN.md, ~/.claude/standards/standard-design.md §17.3
consideration: RELEASE.md 한 곳에서 공개 업데이트 기록과 버전별 최초 방문 안내를 파생해 변경 이력을 빠뜨리지 않고, 분석 동의 선택과 모바일 사용성을 침범하지 않는다.
-->

# 해낼게 2.1.5 업데이트 기록·새로운 기능 안내 개발 착수 브리프 v2

## 목적

회원과 비회원이 해낼게의 최근 변경을 쉬운 말로 확인하고, 새 버전의 핵심 기능을 첫 방문에 발견해 직접 써 보거나 의견을 남길 수 있게 한다. 운영 릴리스 기록과 사용자 안내가 서로 다른 문서에서 어긋나지 않도록 `RELEASE.md`의 `public_note`를 공개 화면과 안내 카드의 단일 원천으로 사용한다.

## 달성 기준

1. `RELEASE.md` 2.1.3~2.1.5에 SemVer 기반 `release_tag`와 사용자용 `public_note`가 있고, `/updates`가 로그인 없이 최신순 3개를 표시한다.
2. 2.1.5를 처음 보는 브라우저에서만 닫을 수 있는 `새로운 기능` 카드가 한 번 표시되고, `써 보기`, `의견 남기기`, `닫기`가 각각 동작하며 본 버전 확인 상태를 `localStorage`에 저장한다.
3. `whats_new_view`, `whats_new_try`, `whats_new_feedback`은 기존 분석 동의 게이트를 통과한 경우에만 GA4로 전달된다.
4. `/updates`가 운영 robots와 sitemap의 공개 경로에 포함되고, preview robots는 전체 차단을 유지한다.
5. 루트 HTML이 기존 값과 신규 값 `XUrxD5gwZQttnOgeO08tQJGZg7yZN4aHHZB38EPJeIw`의 `google-site-verification` 메타 두 개를 출력한다.
6. 단위 시험, Vitest 전체, 디자인 토큰 검사, 스테이징 실화면·네트워크·9폭 모바일 측정, 전체 회귀가 모두 통과하고 버전 신원이 2.1.5로 일치한다.

## 제약

- 운영 배포, main push, 독립 검증은 하지 않는다. 작업 브랜치와 `fix/v2-prod-regressions-20261108` push만 시도한다.
- 화면은 승인된 `DESIGN.md` 토큰과 기존 공용 컴포넌트 패턴을 사용하며 13px 미만 글자, 44px 미만 누름 영역, 가로 넘침을 만들지 않는다.
- 분석 동의 미선택 상태에서는 동의 배너가 먼저 보이고, 거부 상태에서는 카드를 보여도 GA4 이벤트를 전송하지 않는다.
- 카드는 하단 탭·동의 배너와 겹치지 않고, 온보딩 중에는 노출하지 않는다. 가장 어려운 지점은 앱 셸마다 다른 하단 탭 유무와 분석 동의 상태를 함께 처리하면서 최초 노출을 한 번으로 고정하는 것이다.
- `RELEASE.md`가 공개 문구의 원천이다. 생성 파일은 빌드 전에 동기화하고 원천과 다른 경우 시험·빌드를 실패시킨다.
- 다른 프로세스가 소유한 `session-state*.md` 이동·수정과 기존 미추적 QA 산출물은 수정하거나 커밋하지 않는다.

## 필요한 것

| 항목 | 상태 | 근거 |
|---|---|---|
| 2.1.3·2.1.4 운영 릴리스 기록 | 있음 | `RELEASE.md` |
| 2.1.5 사용자용 변경 내용 | 있음 | 회장 11-12 요청과 이번 구현 범위 |
| 분석 동의·GA4 이벤트 래퍼 | 있음 | `web/src/lib/analytics`, `AnalyticsConsentBanner` |
| 공개 화면·하단 탭 디자인 토큰 | 있음 | `DESIGN.md`, `web/src/app/globals.css` |
| 범용 의견·문의 화면 | 없음 | 앱 라우트 전수 조회 결과, 이번 판은 지시대로 `/updates`로 대체 |
| Google 소유확인 값 두 개 | 있음 | 기존 `layout.tsx` 값과 그로스 세션 신규 값 |
| 스테이징 배포·회귀 도구 | 있음 | Vercel `haenael-ge` 연결과 기존 45건 회귀 스크립트 |

## 이번 판에서 판단할 것

1. 2.1.5 태그는 `2.1.5+whats-new-updates`, 2.1.4는 `2.1.4+search-analytics`, 2.1.3은 `2.1.3+mobile-accessibility`로 고정한다.
2. 2.1.5는 사용자가 직접 체험할 새 기능이므로 `notify: true`, 2.1.3·2.1.4는 이미 지난 버전이므로 `notify: false`로 기록한다.
3. `써 보기`는 이번 핵심 기능인 `/updates`로 연결한다. 범용 의견·문의 경로가 없으므로 `의견 남기기`도 `/updates`로 연결하되 GA4에서 클릭 의도를 별도 이벤트로 구분한다.
4. 업데이트 카드는 동의 선택이 끝난 뒤 화면 하단에 나타내고, 하단 탭이 있는 화면에서는 탭 높이 위로 올린다. 온보딩과 `/updates`에서는 중복 안내를 숨긴다.

## 이웃 영향 후보

루트 레이아웃 hydration, 분석 동의 이벤트 순서, 하단 탭이 있는 수신자 셸, 온보딩, robots·sitemap 공개 경로, 메타데이터 배열 렌더, Vercel 빌드 전 생성 단계, 서비스 워커 캐시, 전체 45건 회귀.

## 읽은 것

지정된 QA·릴리스 노트·릴리스 신원·단계 브리프·디자인 정본과 실제 `RELEASE.md`, 루트 레이아웃, 분석 동의·GA4 래퍼, robots·sitemap, 하단 탭 CSS와 시험을 읽었다. 운영 Search Console과 운영 배포 화면은 이번 작업 범위가 아니므로 읽거나 조작하지 않았다.

기반 포맷: `docs/build/brief-v1-gpt-codex-20261112-1316.md`.

KNOWLEDGE_QUERY: 해낼게 2.1.5 공개 업데이트, 최초 방문 안내, 분석 동의, 하단 탭 충돌 지점을 저장소와 지정 표준에서 조회했다.
HITS_USED: release-notes-and-whats-new 표준의 공개 최신 3개·최초 1회·시도·피드백 계약과 저장소의 기존 분석 동의·탭 토큰을 채택했다.
HITS_REJECTED: 외부 시장 조사는 전 사업 공통 표준과 화면 계약이 이미 확정된 구현 작업이라 추가하지 않았다.
CONFLICTS: 없음.
SOURCES/MODEL: GPT-5 Codex · release-notes-and-whats-new.md · release-and-artifacts.md §1.0 · standard-qa-methodology.md · DESIGN.md · standard-design.md §17.3
SKILLS_USED: haenael-supabase-build, Next.js 공개 화면·분석 이벤트·스테이징 검증 순서를 구성하는 데 사용했다.
SKILLS_SKIPPED: 없음.
