# Session State: v2 QA artifacts

## 무엇을 어디까지 했나

- pipeline line `v2`, current stage `qa`에서 current staging source `62585130ceaa56a4677e67cea597a0ac0b12697f`를 재검증했다.
- canonical QA 산출물 `docs/qa/qa-tracker.md`와 `docs/qa/design-conformance-matrix.md`를 2026-11-08 관찰 결과로 갱신했다.
- 기능 경로는 full 37 PASS와 실패 8건 표적 재실행 8/8 PASS로 모두 관찰했다.
- 승인 시안과 staging 9개 화면을 390·1024·1440px 같은 viewport로 직접 이미지 대조했다.

## 남은 이슈·블로커

- `regression-full` 단일 실행이 37/45로 FAIL이다. 8건은 표적 재실행에서 통과했지만 full green을 대체하지 않는다.
- 디자인 정합은 일치 0·불일치 9·미확인 0이다. desktop max-width와 친구 목록의 `과거 응원 기록`, 마이페이지 소개 문구가 승인 시안과 다르다.
- 따라서 QA는 `changes-requested`이며 `/approve`와 운영 배포를 진행하면 안 된다.

## 다음에 칠 명령

```bash
cd /Users/sj/sj_code_master/haenael-ge
sed -n '1,90p' docs/qa/qa-tracker.md
sed -n '1,120p' docs/qa/design-conformance-matrix.md
git diff --check -- docs/qa/qa-tracker.md docs/qa/design-conformance-matrix.md
```

Claude 컨트롤러는 두 산출물과 evidence root를 다시 읽고, changes-requested를 유지하거나 build/design 재개를 결정한다. 이 세션은 pipeline-state와 승인 상태를 수정하지 않았다.

## 검증했나

- 관찰됨: staging health version `2.1.1`, database `ok`, source SHA exact match.
- 테스트됨: 1024 viewport 1/1 PASS, 실패 8건 표적 재실행 8/8 PASS, fixture cleanup 0.
- 실패 관찰됨: full regression 37/45, exit 1.
- 이미지 대조 관찰됨: 승인·staging 390·1024·1440 캡처를 모두 Read. 9개 화면 불일치.
- 증거 root: `/Users/sj/sj_code_master/haenael-ge-v2-hotfix/.goal/runs/v2-qa-artifacts-20261108/`
- 운영 배포·실결제·live key·운영 DB 변경: 수행하지 않음.
