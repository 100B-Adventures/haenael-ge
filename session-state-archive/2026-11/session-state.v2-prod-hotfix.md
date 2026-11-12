# V2 production hotfix handoff

## 무엇을 어디까지 했나

- source `62585130ceaa56a4677e67cea597a0ac0b12697f`, release `2.1.1`을 staging과 production에 배포했다.
- WHY 편집 연필 위치를 승인 prototype baseline으로 복원했다.
- 회원 귀속 전 응원은 계정을 추정하지 않고 친구 화면의 `과거 응원 기록`으로 분리 표시한다.
- 홈 server waterfall과 친구 화면의 불필요한 cover signing을 제거하고 친구 화면을 단일 RPC로 묶었다.

## 남은 이슈·블로커

- 제품·DB·배포 blocker는 없음.
- 로컬 커밋을 GitHub에 push하려 했으나 현재 Codex 실행 정책이 `approval required / AskForApproval=Never`로 명령 자체를 거부했다. production runtime은 로컬 immutable commit에서 이미 배포돼 sourceSha가 일치한다.

## 다음에 칠 명령

```bash
cd /Users/sj/sj_code_master/haenael-ge-v2-hotfix
git push origin HEAD:refs/heads/fix/v2-prod-regressions-20261108
git push origin 62585130ceaa56a4677e67cea597a0ac0b12697f:main
```

위 push 뒤 `origin/main`이 source commit을 가리키는지만 확인한다. production 재배포는 필요 없다.

## 검증했나

- 관찰됨: production health HTTP 200, version 2.1.1, database ok, sourceSha 일치.
- 테스트됨: unit 519/519, pgTAP 460/460와 신규 계약 9/9, 서버 계약 5종, build EXIT 0.
- 테스트됨: staging WHY 390·768·1440, 과거 응원 기록, 성능 E2E 모두 PASS. fixture 잔여 0.
- 관찰됨: production QA 계정 `/friends` HTTP 200 실렌더. production read-only 집계의 미귀속 응원 11건.
