---
title: 해낼게 AAARRR 관문 정의서
version: 1.0.0
status: draft
type: growth-gate-definition
venture: haenael-ge
created: 2026-08-13
updated: 2026-08-13
---

# 해낼게 AAARRR 관문 정의서 v1.0.0

> 이 문서는 사람이 관리하는 정의다. 관측치는 별도 데이터 파일에 둔다.
> 임계 숫자는 실관측 전 정하지 않는다. 전부 `(N바퀴 후 확정)`으로 남긴다.

## 1. 한 장 요약

| 측정 등급 | 관문 | 소유 | 상태 | 값이 나오는 자리 |
|---|---|---|---|---|
| 수령 | 인지도 | 외주 | 미측정 | 외주 발행 URL·태그 문자열·아웃바운드 클릭·발행 시각 |
| 1급 | 획득 | 우리 | 미측정 | GA4 `page_view.page_path`, `lead.source`·`medium`·`campaign`·`content`·`referrer`·`landing_path` |
| 1급 | 활성화 | 우리 | 미측정 | `member.id`·`created_at`, `goal.member_id`·`status`·`created_at` |
| 2급(대리) | 유지 | 우리 | 미측정 | `goal.status`·`deleted_at`, `cheer.goal_id`·`status`·`created_at` |
| 1급 | 수익 | 우리 | 미측정 | `payment.amount_krw`·`status`·`approved_at`, `cheer.payment_id`·`status` |
| 2급(대리) | 추천 | 우리 | 미측정 | `share_event.goal_id`·`channel`·`created_at` |

**등급 분포: 1급 3 · 2급 2 · 수령 1**

## 2. 공통 제외와 상태 규칙

- `goal.deleted_at IS NOT NULL`인 목표와 `cheer.deleted_at IS NOT NULL`인 응원은 제외한다.
- 결제는 `payment.status = 'DONE'`만 실결제로 본다. `READY`, `CANCELED`, `FAILED`는 수익에서 제외한다.
- 웰컴 응원은 `cheer.is_welcome = true`로 식별해 유료 응원과 분리한다.
- 측정 수단이나 값이 없으면 `0`이 아니라 `미측정`으로 쓴다.
- 관문 상태는 `미측정`, `관측됨·기준 미정`, `새는 중`, `정상`만 사용한다.

## 3. 관문 1. 인지도 Awareness

| 측정 등급 | 수령 |
|---|---|

외주가 소유한 플랫폼에서 해낼게 콘텐츠가 노출되고 링크가 클릭된 정도다. 우리 도메인 도착 전까지가 경계다.

### 수령 항목

- 발행 URL 전량
- 각 URL의 `utm_source`, `utm_medium`, `utm_campaign` 원문
- 플랫폼 리포트의 URL별 아웃바운드 클릭 수
- 발행 시각

### 임계

- 아웃바운드 클릭 대비 우리 도착 비율: `(N바퀴 후 확정)`

## 4. 관문 2. 획득 Acquisition

| 측정 등급 | 1급 |
|---|---|

우리 도메인에 도착한 세션과 식별 가능한 유입 출처를 잰다. 플랫폼 노출은 포함하지 않는다.

### 값이 나오는 자리

| 원천 | 실제 필드 |
|---|---|
| GA4 직접 배선 | 이벤트 `page_view`, 매개변수 `page_path` |
| `lead` | `source`, `medium`, `campaign`, `content`, `referrer`, `landing_path`, `created_at` |

### 임계

- 도착 세션: `(N바퀴 후 확정)`
- 출처 식별률: `(N바퀴 후 확정)`

## 5. 관문 3. 활성화 Activation

| 측정 등급 | 1급 |
|---|---|

가입 후 `(N바퀴 후 확정)`일 안에 첫 `ACTIVE` 목표를 만든 회원의 비율로 정의한다.

### 값이 나오는 자리

- 분모: `member.id`, `member.created_at`
- 분자: `goal.member_id`, `goal.status = 'ACTIVE'`, `goal.created_at`
- 시간차: `goal.created_at - member.created_at`

### 임계

- 활성화율: `(N바퀴 후 확정)`
- 활성화까지 걸린 시간: `(N바퀴 후 확정)`

## 6. 관문 4. 유지 Retention

| 측정 등급 | 2급(대리) |
|---|---|

직접 로그인·세션 이력 테이블이 없어, 목표 생성 뒤 후속 응원이 생기고 목표가 유지되는지를 대리값으로 본다. 이는 회원의 직접 재방문이 아니라는 한계를 항상 표시한다.

### 값이 나오는 자리

- 코호트 키: `goal.member_id`, `goal.created_at`
- 목표 생존: `goal.status`, `goal.deleted_at`, `goal.closed_at`
- 후속 활동 대리: `cheer.goal_id`, `cheer.status = 'CONFIRMED'`, `cheer.created_at`

### 임계

- 후속 응원이 있는 목표 비율: `(N바퀴 후 확정)`
- 목표 생존율: `(N바퀴 후 확정)`

## 7. 관문 5. 수익 Revenue

| 측정 등급 | 1급 |
|---|---|

승인 완료된 실제 응원 결제의 건수와 금액을 잰다.

### 값이 나오는 자리

- 결제: `payment.id`, `payment.amount_krw`, `payment.status = 'DONE'`, `payment.approved_at`
- 응원 연결: `cheer.payment_id`, `cheer.status = 'CONFIRMED'`, `cheer.is_welcome`
- 취소·환불 상태 전이: `payment_log.payment_id`, `payment_log.from_status`, `payment_log.to_status`, `payment_log.created_at`

### 임계

- 승인 결제액: `(N바퀴 후 확정)`
- 결제 전환율: `(N바퀴 후 확정)`

## 8. 관문 6. 추천 Referral

| 측정 등급 | 2급(대리) |
|---|---|

공유 행동은 직접 기록되지만, 공유로 들어온 사람과 가입·결제를 연결하는 추천 식별자는 없다. 따라서 공유 건수만 대리값으로 쓴다.

### 값이 나오는 자리

- `share_event.goal_id`
- `share_event.channel` 값 `IMAGE`, `STORY`, `LINK`
- `share_event.created_at`

### 임계

- 목표당 공유 건수: `(N바퀴 후 확정)`
- 공유 후 유입·활성화 전환율: `미측정`

## 9. 첫 바퀴 운용

- 우선 관측: 활성화와 수익
- 별도 확인: 획득 GA4와 리드 귀속 값의 실제 조회 가능 여부
- 대리 등급은 숫자 옆에 반드시 `대리`를 붙인다.

---
STAMP
- 작성: 2026-08-13
- 모델: gpt-5.6
- 에이전트: code-builder
- 스킬: 없음
- 근거: growth-loop v2, ZERO-ONE gates v2, 해낼게 마이그레이션과 GA4 배선
- 고민: 존재하는 공유 테이블을 추천 전환 테이블로 과대해석하지 않고 2급으로 제한했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음
SOURCES/MODEL: gpt-5.6 / `~/.claude/standards/growth-loop.md`, `zero-one/docs/growth/gates-v2.0.0.md`, `haenael-ge/supabase/migrations/20260705163137_init_schema.sql`, `20260714090000_lead_capture.sql`, `haenael-ge/web/src/lib/analytics/index.ts`
