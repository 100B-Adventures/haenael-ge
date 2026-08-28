---
title: 해낼게 — 90일 콘텐츠 실행 캘린더 (W1~W13)
type: playbook
owner: "@sj"
policy: living
updated: '2026-08-28'
author: Codex
change: A안 구조로 이동하고 상대 링크를 갱신. 기존 본문 보존
source:
- 5-hubs/hub-mkt/content-calendar-90d.md
visibility: private
---

# 해낼게 — 90일 콘텐츠 실행 캘린더 (W1~W13)

> 작성: 2026-07-10 · content-growth-marketer · **[stable-제안]** 골격 / 숫자·요일·시각은 전부 **[실험]**(기본값+판정 게이트 병기 — 하위모델은 멈추지 말고 기본값으로 실행)
> 상위 전략: [brand-marketing-strategy.md](../../1-team-brand/brand-marketing-strategy.md) §4 채널 · §5 90일 플랜 · §6 시리즈 · §7 KPI
> 자매 문서(내용 중복 금지, 참조만): 계정 정본 [wiki/1-team-brand/channel-identity-kit.md](../../1-team-brand/channel-identity-kit.md) · 카피 [wiki/1-team-brand/voice-copy-bank.md](../../1-team-brand/voice-copy-bank.md) · 실원고 [series-s1-buildlog.md](series-s1-buildlog.md)(12편)·[series-s2-declaration-log.md](series-s2-declaration-log.md)(8편)·[series-s3-mind-observation.md](series-s3-mind-observation.md)(6편) · DM 절차 [wiki/5-hubs/hub-mkt/dm-outbound-playbook.md](dm-outbound-playbook.md) · 에셋 규격 [wiki/1-team-brand/visual-guidelines.md](../../1-team-brand/visual-guidelines.md)
> 지표 판독은 [wiki/5-hubs/hub-mkt/kpi-runbook.md](kpi-runbook.md) · 운영 루틴은 [wiki/3-operations/agent-runbook.md](../../3-operations/agent-runbook.md)

---

## 0. W1 개시일 (앵커 — 이 칸이 비어 있으면 캠페인 미개시)

```
W1_START_DATE: (미기입 — 회장 GO 선언 시 스레드 첫 포스트 발행일이 속한 주의 월요일을 기입)
```

- 현재 주차 계산: `(오늘 - W1_START_DATE) ÷ 7 + 1` (올림). 하위모델은 매 세션 이 칸부터 확인한다.
- 비어 있으면: 발행·DM 발송 금지. W1 준비 액션(계정 개설 상태 점검, 원고 재고 확인)만 수행.

## 1. 운영 상수 (기본값 — 전부 [실험], 게이트는 §5)

| 항목 | 기본값 | 판정 게이트(기본값 변경 조건) |
|---|---|---|
| S1 발행 (스레드 build-in-public) | 월·수·금 21:00 | 2주 연속 평균 조회가 타 시간 실험 대비 -30% → 시각 ±2h 조정(하위모델 재량) |
| S2 발행 (공스타 선언 로그) | 화·토 22:00 | 동일 |
| S3 발행 (스레드 관찰기) | 목 21:00 | 주1 기본. 댓글 UGC 소재가 주 2건+ 쌓이면 주2로 증편(하위모델 재량) |
| DM 발송 요일 | 평일 5일 (주말 발송 0) | 응답률이 주말에 더 높다는 실측 나오면 조정 |
| DM 밴-신호 브레이크 | 발송제한 경고·응답률 급락(<5%)·계정 경고 중 1개라도 → 즉시 발송량 50% 감속 + 48h 휴지 | [dm-outbound-playbook.md](dm-outbound-playbook.md) 절차 우선 |
| 원고 재고 하한 | 시리즈별 잔여 4편 | 4편 이하로 떨어지는 주 월요일 = 재생산 트리거(§4) |

## 2. 원고 ID 체계 (시리즈 문서와 상호 참조)

- `S1-01`~`S1-12`: 스레드 「응원은 돈으로 하는 겁니다 — 만드는 중」 — [series-s1-buildlog.md](series-s1-buildlog.md). 주3 → **4주 소진(W1~W4)**.
- `S2-01`~`S2-08`: 공스타 「해낼게 선언 로그」 — [series-s2-declaration-log.md](series-s2-declaration-log.md). 주2 → **4주 소진(W3~W6)**. ⚠️ 실선언자 사례 필요 → W3 무결제 선언 페이지 오픈과 동기화.
- `S3-01`~`S3-06`: 스레드 「전하지 못한 마음 관찰기」 — [series-s3-mind-observation.md](series-s3-mind-observation.md). 주1 → **6주 소진(W2~W7)**.
- 13번째 이후(`S1-13`, `S2-09`, `S3-07`…)는 §4 재생산 절차로 하위모델이 직접 생산해 시리즈 문서에 append하고, 이 캘린더의 해당 주차에 ID를 기입한다.

---

## 3. 주차별 실행표

### P0 — 불꽃 만들기 (W1~W2) · 게이트: 스레드 6포스트 + 사전등록 30명

| 주차 | 발행 (요일→원고ID) | DM | 운영 액션 |
|---|---|---|---|
| **W1** | 월 S1-01 · 수 S1-02 · 금 S1-03 (스레드) | 발송 0 · **리스트 수집 100명**(공스타 해시태그 크롤 기준: [dm-outbound-playbook](dm-outbound-playbook.md)) | ① 스레드·공스타·유튜브 계정 개설 완료 확인([channel-identity-kit](../../1-team-brand/channel-identity-kit.md) 규격 대조: 아이콘=쿼트러포일 D-006·배너 슬로건 D-005) ② GA4 수집 작동 확인(실 이벤트 1건 관찰) ③ 공스타 첫 소개 포스트(브랜드 자기소개, S2 아님) |
| **W2** | 월 S1-04 · 수 S1-05 · 금 S1-06 · 목 S3-01 | 워밍업 발송 10/일 [실험] (문구 A/B는 플레이북 절차) | ① 사전등록(대기 리스트) 폼 오픈·스레드 고정 ② 선언 카드 템플릿 공스타 공개([visual-guidelines](../../1-team-brand/visual-guidelines.md) 규격) ③ DM 리스트 200명 완성 |
| **✅ P0 게이트 체크포인트** (W2 일요일) | — | — | 스레드 6포스트 발행 여부(URL 6개) · 사전등록 ≥30 · [kpi-runbook](kpi-runbook.md) 계기판 첫 기록. **미달 시: 방향 전환 금지, 지표 기록 후 회장 소집**([agent-runbook §4](../../3-operations/agent-runbook.md)) |

### P1 — 시드 주입 (W3~W6) · 게이트: 선언자 40~60 + DM 응답률 ≥8% + 선언카드 공유율 ≥50%

| 주차 | 발행 | DM | 운영 액션 |
|---|---|---|---|
| **W3** | S1-07/08/09 · S2-01(화)·S2-02(토) · S3-02(목) | **50/일** | ① 무결제 선언 페이지 오픈 확인(실 URL 접속 관찰) ② 첫 선언자 사례 S2 소재화 — **본인 동의 DM 필수**(미동의 시 익명·디테일 변형) ③ 주간 계기판 기록 시작(매주 반복, 이하 생략) |
| **W4** | S1-10/11/12 · S2-03/04 · S3-03 | **75/일** | ① S1 재고 소진 임박 → **S1 재생산 6편(S1-13~18) 착수**(§4-1) ② DM 응답률 첫 판독(≥8% 확인) |
| **W5** | S1-13/14/15 · S2-05/06 · S3-04 | **100/일** | ① S2 재고 4편 → **S2 재생산 4편(S2-09~12) 소재 수집 시작**(§4-2) ② 공유율 실측(선언자 중 카드 공유 비율) |
| **W6** | S1-16/17/18 · S2-07/08 · S3-05 | 100/일 | ① S3 재고 2편(하한 4편 미달) → **S3 재생산 4편(S3-07~10) 착수**(§4-3) ② 선언자 수 집계·게이트 리허설 |
| **✅ P1 게이트 체크포인트** (W6 일요일) | — | — | 선언자 40~60 · DM 응답률 ≥8% · 공유율 ≥50%. 판독 기준·미달 액션 = [kpi-runbook §3](kpi-runbook.md). **게이트 미달 시 방향 전환은 회장 회수** |

### P2 — 조용한 결제 온 (W7~W10) · 게이트: 유료응원 1회경험률 ≥30% (건당 5,000원 앵커)

⛔ 회수 필요: W7 결제 오픈은 제품(build/QA/배포) 완료에 종속 — 제품이 늦으면 **P2 이후 전체를 주 단위로 시프트**해야 한다. 시프트 결정은 회장 승인 사안(하위모델이 임의로 결제 없이 P2 콘텐츠를 내보내지 말 것).

| 주차 | 발행 | DM | 운영 액션 |
|---|---|---|---|
| **W7** | S1-19/20/21(재생산분·**수수료 서사 회차 우선 배치** — 결제 오픈 공지와 정합) · S2-09/10 · S3-06 | 100/일 유지 | ① 결제 실동작 확인(테스트 결제 1건 관찰 후 콘텐츠 발행) ② 결제 오픈 공지 = 스레드(슬로건 노출면 O) + 공스타(주인공 면 — **돈 언어 0으로 재작성**, [voice-copy-bank](../../1-team-brand/voice-copy-bank.md)) |
| **W8** | S1-22/23/24 · S2-11/12 · S3-07 | 100/일 | ① 첫 유료응원 사례 콘텐츠화(가드레일: 금액·신원 비노출) ② 1회경험률 첫 판독 |
| **W9** | S1-25/26/27 · S2-13/14 · S3-08 | 100/일 | ① 마일스톤 pledge 소프트 런칭 콘텐츠(응원자 면 한정, "내기" 프레임 금지 — bm.md §3-2) ② 재생산 사이클 반복(재고 하한 룰) |
| **W10** | S1-28/29/30 · S2-15/16 · S3-09 | 100/일 | ① 달성/환전 첫 사례 준비(있으면 S2 특별편) ② P2 게이트 집계 |
| **✅ P2 게이트 체크포인트** (W10 일요일) | — | — | 유료응원 1회경험률 ≥30%(정의는 [kpi-runbook §2-3](kpi-runbook.md) — 선언자 기준) · 건당 평균 ~5,000원 앵커 확인. 미달 시 회장 소집 |

### P3 — 루프 판정 (W11~W13) · 게이트: W4 잔존 ≥20% + 역할 전환 첫 사례 → kill-criteria 회의

| 주차 | 발행 | DM | 운영 액션 |
|---|---|---|---|
| **W11** | S1-31/32/33 · S2-17/18 · S3-10 | **50/일로 감속 [실험]**(판정 기간 — 신규 시드보다 코호트 관찰 우선) | ① W3~W7 가입 코호트 W4 잔존 집계 ② 역할 전환(주인공→응원자) 사례 탐색 |
| **W12** | S1-34/35/36 · S2-19/20 · S3-11 | 50/일 | ① 반복후원율·자가확산 계수 집계 ② kill-criteria 회의 자료 초안([kpi-runbook §4](kpi-runbook.md) 안건 템플릿) |
| **W13** | S1-37/38/39 · S2-21/22 · S3-12 | 50/일 | ① **kill-criteria 회의 소집**(회장 필수 참석 — [bm.md §6](../../../docs/bm.md) 3criteria) ② 90일 회고를 [learnings/ledger.md](../../3-operations/learnings-ledger.md)에 기록 |
| **✅ P3 게이트 체크포인트** (W13) | — | — | W4 잔존 ≥20% · 역할 전환 ≥1. **GO/pivot/kill 판정 = 회장 전권.** 하위모델은 데이터 패킷 준비까지만 |

---

## 4. 원고 재생산 절차 (시리즈 소진 이후 — 하위모델이 스스로 이어가는 표준)

> 원칙: **실화만 쓴다.** build-in-public·선언 로그·관찰기 전부 실제 사건·실제 사람 기반. 소재가 없으면 편수를 줄이지, 지어내지 않는다(사회적 증거 가드레일 ⓑ 가짜 수치 금지의 콘텐츠판).

### 4-1. S1 재생산 (트리거: 잔여 4편 이하, 첫 트리거 예상 W4)
1. 소재 수집: 그 주 실제 제작·운영 사건(기능 결정, 갈등, 지표, 실패)을 3~6개 나열.
2. [series-s1-buildlog.md](series-s1-buildlog.md)의 **Format Rules + Batch Prompt** 그대로 **6편(2주분)** 생산. 구조(첫 글 가볍게·댓글에 원칙)·수수료 서사 선제 공개 원칙 유지.
3. 시리즈 문서에 `S1-NN`으로 append → 이 캘린더 해당 주차에 ID 기입.
4. 검수: [agent-runbook §3 금지선](../../3-operations/agent-runbook.md) 체크리스트 통과 후 발행.

### 4-2. S2 재생산 (트리거 동일, 첫 트리거 예상 W5)
1. 소재: 실제 선언자 사례. **본인 동의 DM → 동의 확보분만** 사용(익명 요청 시 디테일 변형). 사례 부족 주는 관심사 통계 각도("편입 준비, 지금 N명이 해낼게 중" — N은 실수치만)로 대체.
2. [series-s2-declaration-log.md](series-s2-declaration-log.md) 템플릿으로 **4편(2주분)**. **돈 언어 0**(주인공 면).
3. append·기입·검수 절차는 S1과 동일.

### 4-3. S3 재생산 (트리거 동일, 첫 트리거 예상 W6)
1. 소재: S1·S3 댓글, DM 회신에서 나온 응원자 공감 서사(기프티콘 어색썰류) UGC. 인용 시 신원 비노출·원문 변형.
2. [series-s3-mind-observation.md](series-s3-mind-observation.md) 템플릿으로 **2~4편**.
3. append·기입·검수 절차 동일.

## 5. 캘린더 자체의 판정 게이트 (벤치마크 근거)

- **지속 가능성 우선**: 주3(S1)이 90일 유지 최소선이자 최대선 — 편수 증설보다 13주 무결점 발행이 우선. "지속 가능한 케이던스가 야심찬 케이던스를 이긴다" (근거: Airfleet 90-day content calendar guide, https://pipeline.airfleet.co/resources/content-calendar).
- **주 1회 30분 운영 체크인**(일요일): 이번 주 발행분 확정·에셋 준비·재고 확인·블로커 플래그 — [agent-runbook §2](../../3-operations/agent-runbook.md) 루틴에 통합 (동일 근거).
- **시드 → 실사례 전환 감시**: W7 이후 콘텐츠 소재에서 "브랜드 자체 서사" 비중이 줄고 "실유저 사례" 비중이 늘어야 정상(콜드스타트 시딩은 실공급 대체가 목적 — 근거: The Marketplace Guide cold-start pattern, https://themarketplaceguide.com/patterns/cold-start/). 2주 연속 실유저 소재 0건이면 노랑 신호로 계기판에 기록.

---

*SOURCES/MODEL: model=claude-fable-5 (content-growth-marketer) · 근거: wiki/1-team-brand/brand-marketing-strategy.md §4~§7 · docs/bm.md §3·§6 · wiki/3-operations/decisions.md D-001~D-006 · docs/persona.md · docs/architecture.md(GA4 이벤트 자리) · pipeline-state.md · 벤치마크: https://pipeline.airfleet.co/resources/content-calendar (90일 케이던스·주간 체크인) · https://themarketplaceguide.com/patterns/cold-start/ (시딩→실공급 전환) · 스킬: series-content-planner(캘린더/재생산 구조 검증)*
