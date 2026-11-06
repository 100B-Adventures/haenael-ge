# 해낼게 온프렘 114 Codex 접근 세팅

목적: 해낼게 Codex 가 온프렘 114 에서 연결·키 부족으로 멈추지 않도록 필요한 접근을 세팅하고 실측한다.

## 2026-11-06 18:05 KST
- 회장 지시: "코덱스가 작업을 할 때 뭐 연결이 없다, 키 없다, 그래서 못했다 이런 소리 안 나오게끔 다 세팅해놔."
- 완료(관찰됨): `~/Documents/SJ_BRAIN_wiki` 심링크로 brain MCP 복구. `~/.local/bin` 에 supabase 3.0.0, vercel 설치. 저장소 루트 `.vercel` 을 프로젝트 `haenael-ge` 로 연결. Vercel·스테이징 DB·서비스 키·웹 health·push·Playwright 정상.
- 막힘(관찰됨): Supabase 스테이징 PAT(401, 403), 토스 테스트 키 IP 정책(114 공인 IP 121.138.196.20 에서 403), gh 미로그인, `haenael-ge-qa-production.env` 없음, 맥 크롬 9342·카카오 터널 없음, Docker 없음.
- 진행 중: 맥 세션 `[Product] haenael ge` 에 4건 요청(읽음 미확인). 18:19 scheduled task `trig_01RB1znaJnDX3fF6aa3x1CBy` 로 회신 확인 후 114 재시험.
- 남은 일: `wiki/ops/인프라.md` 기록, 임시 파일 `.cwd-placeholder` 삭제, Codex 재시도는 회장 지시 후.
- 주의: 이 세션 worktree 내용이 사라진 상태이고 원인 미규명. 임시 폴더로 작업 중.
