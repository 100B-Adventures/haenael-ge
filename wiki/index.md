# haenael-ge — Wiki 진입점

> 친구의 목표 선언에 조용히 돈(클로버)으로 응원하는 도네이션 플랫폼 — "응원은 돈으로 하는 겁니다"
> 스캐폴드: 2026-07-02 (wiki-track, Tier 0 표준 — `~/.claude/harness/wiki-scaffold/README.md`)
> 2026-07-10 전면 증설: 비개발(브랜딩·마케팅·기획) 실행층 정본화 — 하위모델이 읽고 그대로 실행 가능한 플레이북 구조.

## ⚡ 새 세션/하위모델 진입 규칙 (여기부터)

1. **마케팅·운영 작업이면** → [ops/agent-runbook.md](ops/agent-runbook.md) **하나만 먼저 읽어라** (진입 절차·주간 사이클·금지선·판단 위임 경계 전부 있음).
2. 개발 작업이면 → 루트 `pipeline-state.md` + `docs/` 정본.
3. 브랜드 판단이 필요하면 → [brand-marketing-strategy.md](brand-marketing-strategy.md) §1~2가 헌법. 모순되는 산출 금지.

## SSOT 라우팅 (3줄)
- **빌드 스펙 정본 = [`docs/`](../docs/)** — 게이트(stages.yaml)가 검사. 이동 금지, 여기서는 링크만.
- **사업 지식(결정·교훈·마케팅 실행층) = 이 `wiki/`** — decisions.md·learnings/ledger.md + 아래 실행층.
- **라이브 핸드오프 = 루트 `.handoff-state.md`** / 단계 상태 = `pipeline-state.md`.

## 브랜드/마케팅 실행층 (wiki 정본)

### 전략 (헌법)
- [브랜드 마케팅 전략 v0.3](brand-marketing-strategy.md) — 포지셔닝·톤 2층·사회적 증거 원칙·채널/90일 플랜·KPI + brain 핀 대조표. 확정 결정([D-001~](decisions.md)) 반영.

### brand/ — 아이덴티티·카피·비주얼
- [채널 아이덴티티 킷](brand/channel-identity-kit.md) — 계정명·바이오·해시태그·첫 9게시물 그리드·회장 5분 개설 가이드
- [카피 뱅크](brand/voice-copy-bank.md) — 필러 P1~P4 후킹/CTA/마이크로카피 (층·면·심리 트리거 태그)
- [스토리 정본](brand/story-canon.md) — 오리진(화이팅 인플레) 3층·서사 위계(주연=유저 관계 서사)·소재 태그 라우팅
- [비주얼 가이드라인](brand/visual-guidelines.md) — 에셋 인벤토리·힉스필드 프롬프트 프리셋·재생성 절차
- [디자인 벤치마크 뱅크](brand/design-benchmark-bank.md) — 레퍼런스 9선(베낄 것/금지)·화면 유형별 프로토콜·일관성 체크리스트
- [채널 비주얼 자산 실물](../docs/brand-assets/) — 프로필 아이콘 C안 쿼트러포일 외 PNG 정본

### content/ — 발행물
- [90일 실행 캘린더](content/content-calendar-90d.md) — 주차×채널×원고ID
- [S1 제작기 (스레드·주3)](content/series-s1-buildlog.md) · [S2 선언 로그 (공스타·주2)](content/series-s2-declaration-log.md) · [S3 마음 관찰기 (스레드·주1~2)](content/series-s3-mind-observation.md)

### growth/ — 성장 엔진
- [DM 아웃바운드 플레이북](growth/dm-outbound-playbook.md) — 타깃 추출·스크립트 5종·램프업·응답률 게이트
- [DM 프리테스트 배치](growth/dm-pretest-batch.md) — 실결제 전 10~20명 반응검증용 메시지 A/B/C·판독 게이트
- [첫 매출 전환 플레이북](growth/first-revenue-playbook.md) — 유입→선언→공유→첫 유료 응원 결제, 10건 4주 스프린트·앵커 3단
- [KPI 런북](growth/kpi-runbook.md) — 주간 5칸 대시보드·kill-criteria 소집 조건

### ops/ — 운영
- [★에이전트 마스터 런북](ops/agent-runbook.md) — 하위모델용. 이번 주 할 일이 여기서 도출됨
- [고객 피드백 루프](ops/feedback-loop.md) — 정성 신호 태그 8종·주간 다이제스트·즉시 회수 트리거·성장 루프 포트폴리오

## 기획 정본 (docs/ 링크)
- 기획: [PRD](../docs/prd-haenael-ge-v0.2.0.md) · [one-thing](../docs/one-thing.md) · [persona](../docs/persona.md) · [bm](../docs/bm.md) · [risks](../docs/risks.md)
- 디자인: [DESIGN.md](../DESIGN.md) · [user-flow](../docs/user-flow.md) · [WIREFRAMES/](../docs/WIREFRAMES/) · [coverage](../docs/WIREFRAMES/coverage.md)

## 이 위키의 규칙
- 결정은 [decisions.md](decisions.md)에 append (D-001…, 보류는 P0-P3 + 풀리는 조건).
- 교훈은 [learnings/ledger.md](learnings/ledger.md)에 1줄 append — 같은 category 3회+ = 규칙 승격 제안.
- 아이디어 캡처는 `/capture` → `raw/inbox/` (raw는 불변 — append만).
- BRAIN 정본 핀은 `brain://` 표기 (BRAIN/ops/pin-notation.md). 실경로는 [전략 문서 말미 대조표](brand-marketing-strategy.md#brain-핀-대조표-2026-07-10-검증).
