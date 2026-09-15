---
# growth-state.2026-09.md — 그로스 레인 게이트 상태 (제품 pipeline-state.<라인>.md 대응)
#
# 왜 이 파일이 있나 (회장 2026-09-05):
#   "프로덕트 파이프라인은 pipeline-state 로 상태와 입출력관리하는데
#    같은 위계인 마케팅레인은 저렇게 단순 상태로 관리하는 이유가뭐야? 나랑 그렇게 약속했어?"
#   약속한 적 없다. 캠페인 문서 frontmatter status 한 줄로 가는 것은 컨트롤러의 일방 단순화였다.
#   회장이 합의한 것은 **파일 분리**였지 **관리 수준 하향**이 아니다.
#
# 역할 분담 (셋을 섞지 않는다)
#   · 이 파일          = 칸 승인·산출물 버전핀·회장 확인 기록  (기계가 읽는 게이트)
#   · 캠페인 frontmatter = 그 칸 자체의 진행 상태             (진행 판정의 진실원)
#   · session-state.growth.md = 서사·핸드오프                (사람이 읽는 이야기)
# 정본 계약: ~/.claude/pipeline/stages.yaml  growth_lane
venture: haenael-ge
sprint: 2026-09
repo: /Users/sj/sj_code_master/haenael-ge
lane_version: 1

current_cell: priority          # strategy | priority | instrument | order | execute | (완료면 done)
approved_cells: [strategy]      # 게이트 통과한 칸만. 캠페인 status 와 별개다

# 칸별 승인 산출물 버전핀. 승인 시점의 버전을 박는다(제품 approved_artifacts 대응)
approved_artifacts:
  strategy: docs/growth/campaigns/2026-09/01-전략.md v1.0.0
# 예)
#   strategy: docs/growth/campaigns/SPRINT9/01-전략.md v1.0.0

# 회장 확인이 필요한 칸(stages.yaml growth_lane.cells.*.chairman: true)의 기록.
# 스프린트당 회장 확인 2회 상한(부하 상한). null 이면 아직 안 받은 것이다.
chairman_confirms:
  priority: null                # 지목 1건 확정
  order: null                   # 발주(돈·외부 발신)
  execute: null                 # 집행 검수

cells:
  strategy:   { status: fixed, artifacts_ok: true }
  priority:   { status: draft, artifacts_ok: false }
  instrument: { status: not-started, artifacts_ok: false }
  order:      { status: not-started, artifacts_ok: false }
  execute:    { status: not-started, artifacts_ok: false }

readout: { status: not-started, verdict: null }   # 레인 밖(회고). 확정은 2스프린트 뒤

override: false                 # 게이트 우회 시 만료시각과 함께 사유를 아래 로그에
---

# 진행 로그 (최신순 append)

## 2026-09-16 03:05 KST — strategy 닫음, priority 열음
- 승인 근거: verify-agent-quality PASS(growth-analyst, Skill 1·웹 14·참조조회 34·소크라 17) · 가설 5장 전부 숫자·기간 반증 조건 있음(컨트롤러 직접 grep 확인) · 읽은 것 표 채움 · growth-gate-stamp 박제 · em dash 0.
- 02-우선순위 growth-analyst 위임 중. 회장 확인은 02 에서 1회.
- 승인자: <오케스트레이터(회장 위임) | 회장>
- 막힌 것: <있으면 무엇이·누가 풀 수 있나>
