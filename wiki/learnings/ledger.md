# haenael-ge — Learnings Ledger (append-only)

> 포맷 (grep 가능): `YYYY-MM-DD | [category] | 무엇 | 교정 | count:N`
> 같은 [category] 3회+ 누적 → 규칙/훅 승격 제안 (mistake-ledger 3-strike 패턴).
2026-08-25 | [wiki-drift] | 결제·환전·DM·KPI 구현이 바뀌었지만 전략·카피·런북 16개가 구버전 전제와 잘못된 이벤트명을 유지 | 위키 전수 감사 뒤 구현 경로를 재대조하고, 역사 문서는 구버전 표기하며 운영 미검증은 분리 | count:1
2026-07-19 | [proxy] | 결제·정산 코드와 실경로를 끝까지 확인하지 않고 부분 구현을 서비스 완료처럼 보고 | 로그인·결제·환전은 사용자 여정과 DB 결과를 직접 관찰하고, 로컬 구현·운영 적용·외부 계약 상태를 분리 보고 | count:1
2026-07-19 | [auth-canonical] | 카카오 OAuth 도메인과 state 불일치로 로그인이 실패했으나 코드 존재를 동작으로 오인 | canonical redirect와 state 검증 테스트를 유지하고 로그아웃 상태에서 OAuth 왕복을 확인 | count:1
2026-07-12 | [credit-ops] | 공유 힉스필드 계정을 타 벤처 세션이 동시 사용해 36크레딧 소진(비주얼 에이전트가 억울하게 의심됨 — transactions+실물 대조로 결백 규명) | 크레딧 도구는 착수 직전·직후 실측 필수 + 벤처별 사용 기록, 델타 이상 시 transactions로 즉시 포렌식 | count:1
