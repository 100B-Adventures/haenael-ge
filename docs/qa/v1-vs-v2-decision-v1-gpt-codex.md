# 해낼게 v1 대 v2 화면 결정 보고

기반 포맷: `docs/qa/v2-approved-build-realignment-v5-gpt-codex.md`

STAMP: 2026-10-15 18:56 KST | model=gpt-codex/gpt-6.1-sol | agent=code-builder | skill=haenael-supabase-build | 근거=tag v1.2.1과 current main의 production build, 동일 로컬 Supabase fixture, 390×844 캡처 15장 | 고민=v2 승인 시안 정합과 v1 화면 대체 승인을 분리하고 사용성·정보 위계·전환으로 다시 판정했다.

## 1. 결론

공통 5화면에서 v2를 그대로 채택할 화면은 없다. 랜딩·공개 목표·마이페이지는 절충, 환전·응원 워드맵은 v1 유지를 추천한다. v2 신규 5화면은 v1에 대응 화면이 없으므로 별도 기능군으로 유지한다.

결정 보드: [`../design/boards/v1-vs-v2-decision-v1-gpt-codex.html`](../design/boards/v1-vs-v2-decision-v1-gpt-codex.html)

## 2. 동일 조건 캡처 계약

| 조건 | 적용값 | 증거 |
|---|---|---|
| 소스 | v1=`v1.2.1` tag `dcba63c`, v2=current main working tree | 두 production build 로그 |
| 데이터 | 한 번 seed한 같은 로컬 Supabase fixture | 같은 owner·goal·cheer·friend·invite ID를 두 서버가 조회 |
| 브라우저 | Chromium, `ko-KR`, Asia/Seoul, reduced motion | `capture-v1-v2-decision.mjs` |
| viewport | 390×844 CSS px, deviceScaleFactor 1 | 캡처 15장 전부 390×844 |
| 안정화 | font·image 완료 대기, animation·transition off | 캡처 스크립트 |
| 로컬 CSP | 두 버전 모두 브라우저에서 bypass | v1 production CSP가 loopback Supabase를 막아 동일 fixture 렌더를 위해 양쪽에 동일 적용 |
| 런타임 판정 | HTTP 200, console error 0, page error 0, overflow X 0 | v1 5/5, v2 10/10 |
| 운영 영향 | 없음 | 운영 DB 쓰기·배포·롤백 0건, local fixture 정리 완료 |

## 3. 화면별 변경 요약과 추천

| 화면 | v1 강점 | v2 강점 | 손실·리스크 | 추천 |
|---|---|---|---|---|
| 랜딩 `/` | 실제 응원 단어가 사회적 증거로 보이고 시작 CTA까지 흐름이 짧음 | 카카오 로그인 표기와 4탭 IA가 명확함 | v2의 큰 프리뷰가 비어 보여 첫 화면 증거와 전환 집중도를 약화 | **절충안**. v1 실제 워드맵을 되살리고 v2 로그인·IA 유지 |
| 공개 목표 `/g/[slug]` | 주인공 프로필→목표→WHY→응원 수→워드맵→결제의 설득 순서 | cover와 목표 카드가 소셜 카드처럼 묶임 | 단색 cover가 큰 면적을 차지하고 주인공·WHY가 사라짐. 하단탭이 결제 CTA와 경쟁 | **절충안, v1 우세**. v1 전환 구조를 복원하고 실제 custom cover만 선택 노출 |
| 마이페이지 `/me` | 응원·잔액·링크 정보 밀도가 높고 최근 응원이 첫 화면에 보임 | 목표 관리 진입과 4탭 IA가 명확함 | 관리 배너와 하단탭 때문에 응원 목록이 접힘 아래로 밀림 | **절충안**. v2 IA를 유지하되 배너를 줄여 최근 응원 1건을 첫 화면에 노출 |
| 환전 `/cashout` | 금액·공제·본인확인·신청에 집중 | 전역 4탭 일관성 | 하단탭이 거래 과업과 경쟁하고 폼을 더 아래로 밀음 | **v1 유지**. 환전에서는 하단탭 제거 |
| 응원 워드맵 `/wordmap/[goalId]` | 목표명·응원자 수·워드맵·공유 CTA가 한 화면에 보임 | 워드맵 면적과 12개 초과 펼침 계약 | 공유 자산의 맥락과 저장·공유 행동이 첫 화면 밖으로 밀림 | **v1 유지**. 12개 초과일 때만 v2 펼침 계약 추가 |

## 4. v1 없음, v2 신규

| 화면 | v2 상태 | 추천 |
|---|---|---|
| 초대 생성 `/invite` | 카카오 미리보기와 2개 공유 CTA | 신규 유지 |
| 초대 수락 `/invite/[token]` | 초대자·목표·로그인 후 수락을 한 흐름으로 표시 | 신규 유지 |
| 친구 목록 `/friends` | 친구 관계·대표 목표·근황을 한 행에서 스캔 | 신규 유지 |
| 친구 상세 `/friends/[friendId]` | 목표·응원자·친구 전용 근황·재초대 연결 | 신규 유지. 실사진·근황 데이터의 실제성은 후속 QA |
| 업적 `/me/achievements` | 달성 목표·받은 응원·친구 수만 표시 | 신규 유지. 금액·순위·연속 기록 제외 유지 |

## 5. 추천 근거

- BRAIN의 선언형 공유 정본은 주인공이 “응원해줘”가 아니라 “해낼게”라는 자기서사를 공유해야 한다고 정한다. 그래서 랜딩·공개 목표·워드맵에서 실제 목표와 응원 증거가 decorative cover보다 우선이다.
- Playwright 공식 문서의 visual comparison 원칙에 따라 같은 OS·browser·viewport·fixture에서 캡처했다. 이 보고는 픽셀 동일성을 주장하지 않고 정보 위계·주 CTA·첫 화면 노출량을 육안 판정한다.
- Baymard의 거래 UX 연구는 primary action이 분명해야 하고 결제·거래 단계의 주변 탐색을 줄이라고 권고한다. 환전에서 하단탭을 제거하는 추천에만 제한적으로 적용했다.

## 6. 셀프심문과 레드팀

이 결론이 틀릴 가장 그럴듯한 이유는 v2의 하단탭이 장기적으로 소셜 기능 발견과 재방문을 늘릴 수 있다는 점이다. 그래서 랜딩·마이페이지에서는 IA를 버리지 않고 절충으로 남겼지만, 결제·공유 자산처럼 단일 과업이 강한 화면에서는 전환 방해 비용이 더 크다고 판정했다.

회의적인 제품 책임자는 “동일 fixture 한 번만 보고 v1을 우세로 정하면 취향 판정”이라고 공격할 수 있다. 맞는 공격이다. 이번 보드는 배포 결정을 대신하지 않고 회장 선택을 위한 시각 증거다. 최종 선택 뒤에는 랜딩 시작률, 공개 목표 응원 CTA 클릭률, 워드맵 공유율로 A/B 검증해야 한다.

## 7. 실행 증거

| 증거 등급 | 항목 | 결과 |
|---|---|---|
| 테스트됨 | v1 production build | Next.js 16.3.3 compile·TypeScript·정적 생성 16/16 통과 |
| 테스트됨 | v2 production build | Next.js 16.4.0 compile·TypeScript·정적 생성 17/17 통과 |
| 관찰됨 | production runtime | v1 `3011`, v2 `3012` Ready, 공통·신규 경로 HTTP 200 |
| 관찰됨 | 캡처 | v1 5장, v2 10장, 전부 390×844·console error 0·page error 0·overflow X 0 |
| 관찰됨 | 이미지 육안 | 공통 10장과 v2 신규 5장을 실제 이미지로 열어 판정 |
| 테스트됨 | 대조쌍 규격 | `verify-compare-pairs.py` 대상 5쌍, 크기·좌우 순서·통짜 덤프 검사 |
| 미검증 | 운영 전환 성과 | 실제 사용자 A/B와 운영 전환율은 아직 측정하지 않음 |

KNOWLEDGE_QUERY: BRAIN `wiki/business/index.md`에서 해낼게 공유장벽·유저심리 6단계를 좁혀 조회하고, Playwright visual comparison과 Baymard primary action·transaction focus를 웹 조사했다.

HITS_USED: BRAIN 선언형 공유는 랜딩·공개 목표·워드맵의 실제 증거 우선순위에, Playwright는 동일 캡처 조건에, Baymard는 환전 단일 과업 집중에 사용했다.

HITS_REJECTED: 이커머스 상품 상세의 가격·장바구니 패턴은 해낼게 목표 선언·응원 구조와 직접 대응하지 않아 적용하지 않았다.

CONFLICTS: v2 승인 시안은 4탭 일관성을 요구하지만 환전·워드맵에서는 주 과업을 흐린다. 승인 시안 정합보다 화면 목적을 우선해 v1 유지 또는 절충을 추천했다.

SKILLS_USED: haenael-supabase-build, 동일 local Supabase fixture → 두 production build → 실제 runtime 캡처 → 증거 정리 순서에 적용.

SKILLS_SKIPPED: review, PR landing·push·배포 과업이 아니어서 생략.

SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `pipeline-state.v2.md`, `DESIGN.md`, `wiki/거버넌스/결정.md`, `wiki/거버넌스/실수.md`, `docs/qa/evidence/v1-vs-v2-decision-v1-gpt-codex`, `/Users/sj/SJ_BRAIN_wiki/wiki/business/마케팅/concept-공유장벽-선언vs요청-UGC바이럴.md`, `/Users/sj/SJ_BRAIN_wiki/wiki/business/마케팅/synthesis-유저심리-6단계-정본.md`, https://playwright.dev/docs/test-snapshots, https://baymard.com/blog/button-design, https://baymard.com/blog/payment-ux

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인 | 공통 캡처 10장과 v2 신규 캡처 5장을 실제 이미지로 열어 육안 판정 | 결정 보드 Chromium 렌더에서 이미지 15·깨짐 0·대조 5쌍·선택 5·콘솔 오류 0 확인
