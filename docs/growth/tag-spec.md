# 유입 태그 규격

해낼게는 Instagram 프로필 링크를 실제로 운영한다. 링크에 캠페인 이름까지 넣어야 프로필 방문과 제품 도착을 같은 묶음으로 대조할 수 있다.

## 기준과 범위

- 기준 목적지: `https://haenael-ge.vercel.app/`
- 현재 운영 채널: Instagram
- 예약 채널: Threads, YouTube
- 예약 채널은 계정 개설 전 발행 실적으로 기록하지 않는다.
- 모든 값은 소문자 영문, 숫자, 하이픈만 쓴다.

Google Analytics 공식 규격에 따라 `utm_source`, `utm_medium`, `utm_campaign`을 항상 함께 쓴다. 해낼게의 기존 `bio`, `reels_bio`, `dm_outbound` 구분은 유지한다.

## 문자열 규격

| 항목 | 규격 | 예시 |
|---|---|---|
| `utm_source` | 플랫폼 | `instagram`, `threads`, `youtube` |
| `utm_medium` | 실제 링크 표면 | `bio`, `reels_bio`, `organic`, `dm_outbound` |
| `utm_campaign` | 콘텐츠 묶음 | `haenael-content-{slug}` |
| `slug` | 발행 원본 식별자 | 소문자 영문, 숫자, 하이픈 |

새 콘텐츠 캠페인 정규식은 다음과 같다.

```text
^haenael-content-[a-z0-9]+(?:-[a-z0-9]+)*$
```

기존 `pretest_p0`, `seed_p1` 캠페인은 과거 실험 식별자다. 소급 변경하지 않는다. 새 콘텐츠에는 위 하이픈 규격을 쓴다.

## 채널별 링크

| 채널 | 상태 | 실제 링크 표면 | 붙일 문자열 |
|---|---|---|---|
| Instagram | 운영 | 프로필 웹사이트 | `?utm_source=instagram&utm_medium=bio&utm_campaign=haenael-content-{slug}` |
| Instagram | 운영 | 릴스에서 프로필 유도 | `?utm_source=instagram&utm_medium=reels_bio&utm_campaign=haenael-content-{slug}` |
| Instagram | 운영 | 허락받은 DM | `?utm_source=instagram&utm_medium=dm_outbound&utm_campaign=haenael-content-{slug}` |
| Threads | 미개설 | 게시물 링크 또는 프로필 | `?utm_source=threads&utm_medium=organic&utm_campaign=haenael-content-{slug}` |
| YouTube | 미개설 | 설명란 | `?utm_source=youtube&utm_medium=organic&utm_campaign=haenael-content-{slug}` |

프로필 링크 하나로 여러 게시물을 받으면 특정 게시물의 `slug`를 넣지 않는다. 그때는 `utm_campaign=haenael-profile`을 쓴다. 게시물별 링크를 바꿨을 때만 콘텐츠 slug를 사용한다.

### 예시

```text
https://haenael-ge.vercel.app/?utm_source=instagram&utm_medium=bio&utm_campaign=haenael-profile
```

## 링크를 못 거는 게시물

Instagram 피드 본문에는 클릭 링크를 넣을 수 없다. 다음 순서로 처리한다.

1. 스토리 링크 스티커나 프로필 웹사이트에 태그 링크를 둔다.
2. 게시물별 링크를 바꿀 수 없으면 `haenael-profile`로 채널 도착만 잰다.
3. DM은 상대가 허락한 뒤 `dm_outbound` 링크를 보낸다.
4. 어느 표면에도 링크가 없으면 발행 원장에 `무링크`라고 쓴다. 조회수에서 도착 수를 추정하지 않는다.

## 태그가 깨졌는지 확인하는 방법

### 발행 전

- 실제 완성 URL에 필수 3개가 한 번씩 있는지 파싱한다.
- source와 medium이 위 표에 있는지 확인한다.
- 콘텐츠 캠페인은 정규식과 실제 slug가 일치해야 한다.
- 레거시 별칭에서 기준 도메인으로 이동해도 쿼리가 남는지 확인한다. `web/src/__tests__/proxy.test.ts`에는 쿼리 보존 테스트가 있다.

### 발행 직후

- 게시된 프로필, 스토리, DM의 실제 링크를 복사해 원장과 대조한다.
- GA4 Traffic acquisition에서 source, medium, campaign이 분리되는지 본다. 이번 작성 환경에서는 GA4 접근이 없어 `(미검증)`이다.
- 리드가 생겼다면 `lead.source`, `medium`, `campaign`을 확인한다. `lead-capture/index.ts`와 `20260714090000_lead_capture.sql`에 저장 칸은 있다.
- 웹에서 Edge Function으로 UTM을 전달하는 호출부는 이번 코드 조사에서 찾지 못했다. 링크에서 리드 행까지의 전파는 `(미조사)`로 남긴다.

### 바퀴 결산

- 외주 발행 URL 전량을 `agency-report-template.md`와 대조한다.
- 아웃바운드 클릭이 있는데 GA4 도착이 0이면 실제 게시 링크, 도메인 이동, GA4 순서로 본다.
- profile 캠페인을 게시물 성과로 쪼개지 않는다.

## 반대 검토와 셀프심문

가장 강한 반론은 프로필 링크를 게시물마다 바꾸면 운영 실수가 늘어난다는 점이다. 그래서 기본값은 `haenael-profile`이다. 게시물별 교체를 실제로 운영할 때만 콘텐츠 slug를 쓴다.

이 규격이 틀렸다면 가장 그럴듯한 이유는 기존 운영 문서의 `seed_p1` 같은 언더스코어 캠페인과 새 하이픈 캠페인이 보고서에서 갈라지는 것이다. 과거 값은 보존하고 새 값만 적용해야 한다.

## STAMP

- 작성일: 2026-08-14
- 모델: GPT-5 Codex, 런타임 세부 모델 ID 미노출
- 에이전트: code-builder
- 기반 문서: `docs/growth/channels.md`, `docs/growth/gates-v1.0.0.md`, `wiki/growth/kpi-runbook.md`, `wiki/growth/dm-outbound-playbook.md`, `web/src/__tests__/proxy.test.ts`, `supabase/functions/lead-capture/index.ts`, `supabase/migrations/20260714090000_lead_capture.sql`
- 외부 기준: Google Analytics 공식 Campaign URL Builder, https://support.google.com/analytics/answer/10917952
- 고민한 것: 프로필 공용 링크와 게시물별 캠페인을 같은 성과로 속이지 않는 방법
- 미검증 범위: GA4 보고서, 실제 외주 발행 링크 전량, 웹 UTM에서 리드 저장까지의 호출부
- SKILLS_USED: 없음
- SKILLS_SKIPPED: 매칭되는 전용 스킬 없음
- SOURCES: 위 기반 문서, 제품 코드, Google Analytics 공식 문서
- MODEL: GPT-5 Codex, code-builder
- RUBRIC_SCORE: hook=5/5 detail=5/5 rhythm=5/5 voice=4/5 slop=5/5 total=24/25
- WEAKEST_LINE: "게시물별 교체를 실제로 운영할 때만 콘텐츠 slug를 쓴다." 실제 운영 담당자와 교체 주기는 이 문서에서 확정하지 않았다.
