# 해낼게 V2 사용자 흐름 수직 슬라이스 Goal 인계

## 회장 원문
1회 2회 goal 실패 원인은 투입한 리소스 (시간, 토큰)에 비해서 작업 결과물 (개발 완료된 코드, QA 통과된 항목들, 배포 준비 등)이 없고 계속 파이프라인 왔다갔다하면서 막상 만들어낸 결과물은 없다는게 문제였다. 1회때 영역이나 단위를 쪼개서 개발과 QA 진행하면서 쓸데없이 전체를 오가면서 막상 만들어진 결과물은 없고 사용자한테 보여줄 결과물이 전혀 없다는게 문제였는데 이것을 다른 세션에서 claude가 하네스 개선 했을거다. 확인하고 지금 사업체 진행상황 파악하고 남은거 너가 goal 메세지 세워서 goal 진행해라.

## 세션맥락
감사 보고서가 목표가 아니다. 실제 수정 코드, 실제 QA, 회장이 보는 데모를 S1부터 하나씩 닫는다. 이미 승인된 PRD/디자인/FDD를 새로 만들지 않는다. 단순한 CSS 재현 HTML이나 mock PASS를 제품 QA로 승격하지 않는다.
선정 근거: 해낼게 pipeline-state.v2.md는 plan/design/eng-design/build 승인, qa changes-requested. 알려진 QA-V2-VISUAL-20261025-01은 현재 mainline 코드에도 남는다. 다른 사업체는 기획 승인 대기, 인증/심사, 다른 컨트롤러 작업과 중첩된다. 이 worktree는 원본 f4d38f3에서 별도 fix 브랜치로 분리했다. 다른 세션의 원본 작업트리·staged 파일·상태·서버·DB는 변경하지 않는다. 이 Goal이 소유하는 경로는 이 worktree의 web/src(해당 결함 관련만), scripts/qa/goal-cheer-slices.mjs, docs/qa/goal-cheer-slices-20261027/, .goal/뿐이다. 원본 저장소에서 동시에 돌아가는 컨트롤러 작업은 이 신규 브랜치와 겹치지 않도록 수정 범위를 제한하며, 코드가 이미 바뀌었다면 재구현하지 않고 비교한다. 원본 merge/push 하지 않는다.

## 정본 입력(워커가 직접 읽음)
- /Users/sj/.claude/standards/codex-goal.md
- 이 worktree wiki/거버넌스/결정.md(D-049), 실수.md
- pipeline-state.v2.md 승인 핀과 docs/qa/qa-tracker-v2-social-viral-loop.md, design-conformance-matrix.md
- docs/design/prototypes/social-viral-loop-v3-opus5.html, DESIGN.md
- .goal/feature-list.json

## 실행
오케스트레이터는 구현하지 않고 codex-delegate.sh code-builder에 S1만 발주, CODEX_GOAL/CODEX_ALLOWED_PATHS/SESSION_CONTEXT 명시. 워커는 혼자 쓰는 저장소가 아님을 알고 다른 변경을 되돌리지 않는다. 역할 정의는 런타임 주입되므로 반복 정독 지시 금지. 별도 코드 리뷰는 다른 모델(claude-delegate.sh code-reviewer)로 한다. 브라우저 QA는 qa-verifier로 독립 실행. 플랫폼 표준 verify-agent-quality를 회수마다 수행한다. foreground timeout 단일 대기, 짧은 로그 폴링 금지. 각 슬라이스 종료 전에 전체 회귀, 실제 데모, .goal/demos.md 갱신. 첫 슬라이스 4시간 제한. dev 서버는 worktree 고유 포트로 실행하고 종료 때 자신이 띄운 자원만 회수한다. heavy-slot 준수.
환경: staging health200을 이번 컨트롤러가 확인했다. 원본 web/node_modules와 root node_modules만 재사용 심링크. .env는 복사하지 않았다. 필요 시 secret-management.md와 로컬 시크릿 사용처 표에서 기존 staging 인증을 찾아 wrapper로 주입, 값 출력 금지. 운영 계정이나 운영 DB로 대신 시험 금지. staging 설정은 원본 wiki/ops/인프라.md 및 QA 보고에 있음. S1은 임의 정적 CSS 시뮬레이션이 아니라 최신 실제 Next 앱에서 확인. 인증/데이터 준비가 실패하면 원인·시도 근거를 남기고 시뮬레이션으로 통과하지 않는다.
scripts/qa/goal-cheer-slices.mjs는 각 verify 명령에서 실제 테스트·브라우저 실행 결과를 검사하고 조작된 status/빈 파일/고정 true로 통과하지 않게 워커가 구현한다. 새 API/DB스키마/가격/상품 정체성 변경 없음. 결함 밖 UI 변경 없음.
최종 제출은 코드 커밋(이 브랜치 한정), 전체 회귀 결과, 실캡처 데모, 검수 결과, 운영 배포에 필요한 남은 목록. Goal 완료와 제품 전체 QA/운영 출시 완료를 구분한다.
