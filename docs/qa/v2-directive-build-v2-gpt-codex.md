# 해낼게 V2 지시 반영 2차 build 결과

> **판정: 로컬 build 일치 4, 불일치 0, 미확인 0.** 워드맵 문장 조각 제거, 친구 1명 희소 상태, 목표·응원 0건 다음 행동, 승인 프로토타입 갱신을 구현했다. 390px production-mode 8화면에서 직접 관찰했으며 운영 DB 쓰기와 배포는 실행하지 않았다.

기반 포맷: `docs/qa/v2-directive-build-v1-gpt-codex.md`

## 1. 지시별 판정

| 번호 | 지시 | 판정 | 직접 증거 |
|---|---|---|---|
| 1 | 워드맵 키워드 품질 | 일치 | production 캡처 DOM의 13개 키워드에서 `건넬게요`, `저희가`, `차례예요`, `클로버는` 0건. 390px 이미지를 열어 `응원`, `꾸준함`, `끝까지`, `한 걸음`, `할 수 있어` 등 의미 표현만 확인했다. |
| 2 | 데이터가 적은 화면의 다음 행동 | 일치 | 친구 1명 실화면에 `한 명 더 함께 응원해볼까요?`와 `친구 초대하기`가 노출됐다. 목표 0개·받은 응원 0건·보낸 응원 0건·초대 가능 목표 0개는 컴포넌트 계약 테스트로 CTA를 고정했다. |
| 3 | 승인 프로토타입 반영 | 일치 | `희소·빈 상태` 토글, 친구 1명 CTA, 목표·응원 0건 CTA, 의미 워드맵을 반영했다. Chromium에서 친구 희소 상태와 관리 빈 상태를 렌더해 오류 0, 표시 상태 3개를 확인했다. |
| 4 | 390px 재캡처·회귀 | 일치 | 8/8 HTTP 200, console error 0, page error 0, overflow X 0. Vitest·pgTAP·Next build·환전 E2E를 다시 통과했다. |

## 2. 기존 구현 확인과 보존

- `Wordmap`, `FriendGoalList`, `MyPageOverview`, `FriendInviteCard`를 새 화면으로 재창조하지 않고 기존 컴포넌트 위에서 확장했다.
- 워드맵 전체 표시, 빈도 합산, `s1/s2/s3` 크기 가중, 하트·모션, 공개 목표와 친구 상세의 재사용 경로를 보존했다.
- 친구 0명·2명 이상, 긴 이름, 이미지 없음, 공개 목표 없음, 다중 목표의 기존 동작을 유지했다.
- 환전 수수료·원천징수·계좌 마스킹, Auth, DB schema, migration, Edge Function은 변경하지 않았다.
- 운영 DB 쓰기와 운영 배포는 0건이다. fixture는 local Supabase에만 생성했다.

## 3. 워드맵 키워드 계약

정본은 `docs/design/standard-wordmap-keyword.md`, 구현은 `web/src/lib/wordmap/keywords.ts`다.

1. `Intl.Segmenter("ko")`로 단어 경계를 나눈다.
2. 조사 제거는 가장 긴 접미사부터 한 번 적용한다.
3. 대명사·시점·전달 동작·브랜드 문맥 기능어를 불용어로 제거한다.
4. 일반 서술어는 버리고 승인된 형용사·감탄 표현만 의미형으로 정규화한다.
5. 기본 2~12자, 단일 글자 `꿈·힘·빛`, 승인 이모지만 허용한다.
6. 한 원문에서 같은 키워드는 한 번만 세고, 여러 원문의 `word_count`는 합산한다.
7. 합산 빈도로 기존 크기 가중을 계산하고 결과 전체를 표시한다.

외부 분석기는 도입하지 않았다. npm unpacked 기준 `garu-ko` 약 1.70MB, `kuromoji-ko` 약 28.58MB이고, `mecab-ko-wasm`은 패키지 외 사전·통합 비용이 남는다. 20~80자 내외 응원 문구에서 현재 회귀 코퍼스는 새 의존성 없이 충족했다. 실제 응원 200건 라벨 평가에서 정밀도 95% 미만 또는 유효 키워드 누락률 5% 초과일 때 재검토한다.

## 4. 전체 목록 화면의 빈 상태

| 목록 표면 | 데이터 경계 | 빈·희소 상태 | 다음 행동 | 상태 |
|---|---:|---|---|---|
| 친구 목록 | 0명 | 3단계 설명과 빈 상태 | 친구 초대하기 | 기존 유지, 테스트됨 |
| 친구 목록 | 1명 | 한 명 카드 아래 희소 CTA | 친구 초대하기 | 신규, 관찰됨 |
| 친구 목록 | 2명 이상 | 목록 반복 렌더 | 해당 없음 | 기존 유지, 테스트됨 |
| 친구 행 | 공개 목표 0개 | `지금 공개한 목표가 없어요` | 없음. 친구 본인만 목표를 공개할 수 있음 | 기존 유지, 테스트됨 |
| 내 해낼게 | 목표 0개 | 큰 빈 카드 | 해낼게 만들기 | 신규, 테스트됨 |
| 받은 응원 | 0건 | 첫 응원 시작 안내 | 목표가 있으면 링크 공유, 없으면 해낼게 만들기 | 신규, 테스트됨 |
| 보낸 응원 | 0건 | 응원할 친구 안내 | 친구 목표 보기 | 신규 보강, 테스트됨 |
| 응원 워드맵 | 0건 | 목표 주인 이름과 첫 응원 안내 | 부모 화면의 응원 CTA 사용 | 기존 유지, 테스트됨 |
| 친구 초대 목표 | 0개 | 공개 가능한 목표 없음 안내 | 내 해낼게 관리하기 | 신규 보강, 테스트됨 |
| 친구 상세의 다른 목표 | 0개 | 보조 목록을 숨기고 대표 목표만 유지 | 해당 없음 | 기존 유지, 테스트됨 |
| 알림 목록 | 0건 | `아직 알림이 없어요` | 닫기. 수동 생성 CTA를 만들지 않음 | 기존 유지, 테스트됨 |
| 환전 내역 | 0건 | 신청하면 처리 상태가 남는다고 설명 | 상위 환전 진입 사용 | 기존 유지, 근거 확인 |
| 관리자 지급·커버 검수 큐 | 0건 | 대기 항목 없음 | 수동 생성 CTA 없음 | 기존 유지, 테스트됨 |

`알림`, `환전 내역`, 관리자 큐는 데이터 생성을 유도하는 화면이 아니므로 가짜 primary action을 붙이지 않았다. 빈 여백이 성장 루프를 끊는 사용자 목록만 다음 행동을 둔다.

## 5. 직접 실행 증거

| 검증 | 결과 | 로그·산출물 |
|---|---|---|
| Vitest 전체 | 59파일, 346/346 PASS | `/tmp/haenael-v2-directive-v2-vitest-final4.log` |
| pgTAP 전체 | 19파일, 336/336 PASS | `/tmp/haenael-v2-directive-v2-pgtap.log` |
| Next.js production build | PASS, 정적 생성 17/17 | `/tmp/haenael-v2-directive-v2-next-build-final3.log` |
| 환전 Chromium E2E | 12/12 PASS | `/tmp/haenael-v2-directive-v2-cashout-e2e.log` |
| Storybook build | PASS | `/tmp/haenael-v2-directive-v2-storybook.log` |
| production-mode 실화면 | 8/8 HTTP 200, console·page error 0, overflow X 0 | `docs/qa/evidence/v2-directive-build-v2-gpt-codex/capture-results.json` |
| 워드맵 실화면 | 13개 전체 표시, 금지 조각 4종 0 | `wordmap-390-full.png`, `public-goal-390-full.png` |
| 친구 1명 실화면 | 카드 1개, 희소 CTA 1개 | `friends-390-full.png` |
| 승인 프로토타입 | 친구 희소 CTA 확인, 관리 빈 상태 2개 표시, 오류 0 | `/tmp/haenael-v2-directive-v2-prototype.log` |
| 결정 보드 | 이미지 8, 깨짐 0, 메모 8, console error 0 | `board-render.png` |
| 디자인 토큰 | 171파일, 기존 위반 58, 신규 0, 기준선 대비 12 감소 | `/tmp/haenael-v2-directive-v2-design-tokens.log` |
| design-lint | 실행 완료. 기존 8pt·inline style·hex 경고 3종 | `/tmp/haenael-v2-directive-v2-design-lint.log` |
| pipeline artifact lint | 핀 실체·슬롯키·버전 정합 PASS. 기존 `docs/design/README.md` STAMP 경고 1건 | `/tmp/haenael-v2-directive-v2-artifact-lint.log` |
| agent quality | Skill 1, WebSearch/Fetch 67, 참조 조회 105, 소크라 마커 30, PASS | `/tmp/haenael-v2-directive-v2-agent-quality-transcript.log` |

### 모바일 사용성 원문 수치

local fixture의 공개 목표에서 워드맵 13개, 목표 카드, 오류 문구 부재를 먼저 확인한 뒤 측정했다.

| 폭 | 본문 토큰 | 13px 미만 | 44px 미만 누름 | 눌림 상태 | 가로 넘침 | 판정 |
|---:|---:|---:|---:|---:|---:|---|
| 360 | 16px | 0 | 0 | 100% | 0 | PASS |
| 390 | 16px | 0 | 0 | 100% | 0 | PASS |
| 412 | 16px | 0 | 0 | 100% | 0 | PASS |
| 600 | 16px | 0 | 0 | 100% | 0 | PASS |
| 700 | 16px | 0 | 0 | 100% | 0 | PASS |
| 780 | 16px | 0 | 0 | 100% | 0 | PASS |
| 820 | 16px | 0 | 0 | 100% | 0 | PASS |
| 900 | 16px | 0 | 0 | 100% | 0 | PASS |
| 1000 | 16px | 0 | 0 | 100% | 0 | PASS |

## 6. 프로토타입 대 구현 diff

| 구분 | 차이 | 판정 |
|---|---|---|
| 키워드 문구 | 구현과 프로토타입 모두 의미형을 사용 | 일치 |
| 친구 1명 | 구현과 프로토타입 모두 친구 카드 아래 초대 CTA 배치 | 일치 |
| 목표·응원 0건 | 구현과 프로토타입 모두 단일 primary action 배치 | 일치 |
| fixture 숫자 | 프로토타입 예시 숫자와 local DB 숫자는 다름 | 정상 데이터 차이 |
| 실제 동작 | 프로토타입은 정적 상태, 제품은 Auth·DB·라우팅 사용 | 정상 구현 차이 |
| 운영 반영 | 수행하지 않음 | 미반영 |

## 7. 벤치마크와 판단

- [MDN Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)의 로케일 기반 단어 분리를 채택했다.
- [Shopify empty state](https://shopify.dev/docs/api/app-home/latest/web-components/feedback-and-status-indicators/empty-state)의 이유·다음 행동 결합을 채택했다.
- [Atlassian empty state](https://atlassian.design/components/empty-state)의 가장 적절한 다음 단계 하나를 primary action으로 두는 원칙을 채택했다.
- BRAIN의 해낼게 PMF 문서에서 인정·소속감과 응원 축적을 채택했다. 빈 공간을 가짜 활동이나 가짜 희소성으로 채우는 방식은 거부했다.

셀프심문: 이 결정이 틀렸다면 실제 한국어 문장이 승인 표현 사전을 빠르게 벗어나 유효 키워드를 버릴 수 있다. 이를 숨기지 않고 200건 라벨 평가와 정밀도·누락률 임계값을 도입 조건으로 고정했다.

레드팀: 까다로운 사용자는 “금칙어 네 개만 하드코딩했고 다른 토막은 그대로”라고 공격할 수 있다. 실제 fixture에서 추가로 발견한 `먼저`, `친구들`, 일반 `-게요` 서술어까지 제거하고, 개별 금지 표현 각각을 독립 assertion으로 고정했다.

## 8. 남은 경계와 다음 단계

- 이 결과는 local build 검증이다. QA 단계 승인과 운영 배포는 수행하지 않았다.
- 규칙 기반 추출은 실제 사용자 200건 라벨 평가 전까지 운영 언어 분포 전체에 대해 **미검증**이다.
- 다음 소유자는 QA verifier다. 종료 증거는 390px 이미지 독립 대조와 목표·응원 0건 fixture의 브라우저 쓰기 경로 확인이다.

🏷 STAMP | line: v2 | 생성: 2026-10-15 22:58 KST | model: gpt-codex/gpt-6.1-sol | agent: code-builder | skill: haenael-supabase-build | 근거: 회장 지시 원문, 승인 프로토타입, local Supabase, Next.js production, MDN·Shopify·Atlassian 공식 자료 | 고민: 한국어 분석 정확도를 과장하지 않으면서 지금 화면의 문장 조각을 확실히 제거하고, 데이터가 적은 화면을 가짜 데이터 없이 다음 행동으로 채웠다.

SKILLS_USED: haenael-supabase-build, Next.js+Supabase 수직 슬라이스의 계약 테스트·local DB·production-mode 실구동·증거 순서에 사용
SKILLS_SKIPPED: review, PR landing·push 요청이 아닌 build 산출물 마감이므로 별도 pre-landing 리뷰는 실행하지 않음
SOURCES/MODEL: gpt-codex/gpt-6.1-sol | `docs/design/chairman-directives-v2-20261015.md` | `pipeline-state.v2.md` | `docs/design/prototypes/social-viral-loop-v2-opus48.html` | `wiki/거버넌스/결정.md` | BRAIN 해낼게 PMF·도파민 루프·디자인 상태 커버리지 | MDN·Shopify·Atlassian·npm 패키지 메타데이터
PRESENTATION_CHECK: 내부 태그 잔재 없음 확인, 390px 제품 캡처·프로토타입 희소/빈 상태·HTML 보드를 Chromium에서 렌더해 육안 확인함
KNOWLEDGE_QUERY: BRAIN에서 해낼게 인정·소속감·응원 축적과 빈 상태 커버리지를 조회하고, 한국어 브라우저 형태소 분석기 비용과 Shopify·Atlassian empty state 공식 원칙을 검색
HITS_USED: BRAIN의 실제 응원·소속감 축적 원칙, MDN의 로케일 단어 분리, Shopify·Atlassian의 이유+단일 다음 행동 원칙을 채택
HITS_REJECTED: `garu-ko`, `kuromoji-ko`, `mecab-ko-wasm`은 현재 짧은 응원 문구 대비 번들·사전·통합 비용이 커서 미채택. 비공식 UI 블로그는 근거에서 제외
CONFLICTS: 기존 승인 프로토타입에는 문장형 토막과 친구 1명 상태가 없었으므로 회장 최신 지시를 우선하고 프로토타입 상단에 변경 사유를 기록
판단: 외부 형태소 분석기보다 규칙 기반을 먼저 채택했다. 정확도 개선 여지는 남지만 현 회귀 코퍼스와 번들 비용 기준에서 더 작은 변경이며 재검토 임계값도 명시했다.
병목: 실제 캡처에서 테스트가 놓친 `건넬게요`를 다시 발견했고, assertion이 모든 금지어의 동시 존재만 막던 약점을 개별 금지 검증으로 고친 뒤 production build와 캡처를 재실행한 과정이다.
