# V2 소셜 바이럴 루프 디자인 정합 매트릭스

기준: `pipeline-state.v2.md`가 핀한 승인 디자인과 화면 인벤토리. 상세 QA: [`v2-social-viral-loop-qa-reverification-v1.0.0-gpt-codex-20261013-1920.md`](v2-social-viral-loop-qa-reverification-v1.0.0-gpt-codex-20261013-1920.md).

| 화면 | 승인 기준 | 실제 구현 | 판정 | 증거·사유 |
|---|---|---|---|---|
| 마이페이지 390·1280px | 프로필, 내 목표, 친구 수, 업적 3종, 미응원 큐, 마이 탭 | 두 폭 모두 HTTP 200, overflow 0, console/pageerror 0 | 🔶 부분 | actual PNG 2장. 승인 원본과 동일 크기 pixel·속성 대조는 미완료 |
| 목표 상세 390·1280px | 승인 화면의 순서·여백·버튼 위계 | 두 폭 모두 HTTP 200, overflow 0, console/pageerror 0 | 🔶 부분 | actual PNG 2장. 승인 원본과 동일 크기 대조 미완료 |
| 친구 목록 390·1280px | 친구·목표 카드, empty, overflow 상태 | 정상 데이터 상태 두 폭 실측 PASS | 🔶 부분 | actual PNG 2장. empty·과다 데이터와 승인 원본 대조 미완료 |
| 친구 상세 390·1280px | cover·title·reason·count·wordmap·관계 해제 | 정상 데이터 상태 두 폭 실측 PASS | 🔶 부분 | actual PNG 2장. 승인 원본 속성 대조 미완료 |
| 초대 생성 390·1280px | 생성·복사 feedback·7일 만료 | 초기 화면 두 폭 실측 PASS | 🔶 부분 | actual PNG 2장. 생성·복사 완료 상태와 승인 원본 대조 미완료 |
| 초대 수락 390·1280px | preview·로그인 복귀·error card | 비로그인 preview 두 폭 실측 PASS | 🔶 부분 | actual PNG 2장. 로그인 복귀·error 상태 대조 미완료 |
| 커버 검수 390·1280px | review queue·approve·reject | 관리자 queue 두 폭 실측 PASS | 🔶 부분 | actual PNG 2장. approve·reject 상태 대조 미완료 |
| 사업자 정보 `/my/legal` | 마이페이지 1단 링크에서 진입한 2단 화면 본문이 법정 기재 6항목을 직접 소유하고 전역 푸터는 없음 | 페이지 본문은 제목만 있고 `ConditionalFooter`가 법정 기재 6항목을 렌더함 | 불일치 | D-040 §4와 구현 구조 대조. 승인 시안 대 실제 화면 픽셀 대조는 미확인 |
| 하단 탭 라벨 | 승인 시안 10px | 구현 13px | 미결 결정 | 10px는 시안 일치·가독성 기준 실패, 13px는 가독성 통과·시안 불일치. QA에서 값 변경 없음 |

production-mode actual 화면은 7화면 × 2폭, 총 14조합에서 실측했다. 다만 승인 원본과 같은 폭의 side-by-side 또는 pixel diff가 없고 empty·error·과다 상태가 빠졌으므로 디자인 QA는 계속 FAIL이다. 실제 화면 증거는 `docs/qa/evidence/v2-social-viral-loop-reverify-v1/`에 있다.

STAMP: 2026-10-13 19:20 KST | model gpt-5-codex | agent qa-verifier | skill qa | 승인 디자인 핀 `pipeline-state.v2.md`
SKILLS_USED: qa, 화면별 정합과 미검증 범위 분리에 사용
SKILLS_SKIPPED: 없음
SOURCES/MODEL: gpt-5-codex | `pipeline-state.v2.md` | `docs/design/README.md` | 승인 prototype·screen inventory | `docs/qa/evidence/v2-social-viral-loop-reverify-v1/`
