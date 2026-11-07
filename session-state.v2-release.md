# 해낼게 V2.1.0 release handoff

## 2026-11-08 02:24 KST

### 무엇을 어디까지 했나

- production web `haenael-9ukeg0ztc-100-b.vercel.app`을 대표 주소에 배포했다. health는 `version=2.1.0`, `sourceSha=a738543dc307d764c0244723d865a9d7dc97d899`, `database=ok`이다.
- production migration 8/8과 release Edge Function 6/6을 배포했다. 필수 table/RPC 5/5, Function ACTIVE 6/6을 관리 API로 관찰했다.
- Vercel `NEXT_PUBLIC_PAYMENTS_ENABLED=false`, Supabase `PAYMENTS_ENABLED=false`로 고정했다. `cheer-order`와 `toss-confirm`은 HTTP 503 `payments_disabled`다. live key·실결제 호출 0이다.
- staging social E2E 43/43, 실제 Kakao OAuth, main CI `42324619968`, 디자인 9쌍, 운영 공개 smoke 3/3, 인증 read-only 1/1을 통과했다.
- 릴리스 문서 commit `9fce9be52054309fb799f1441ac228e1d475fd0d`을 임시 release worktree에서 만들었다.

### 남은 이슈·블로커

- `git push -u origin release/v2.1.0-final-docs-20261108`가 실행 정책의 approval-required / AskForApproval=Never로 두 번 차단됐다. 운영 배포는 완료됐고, 남은 것은 문서 commit을 remote에 올리는 일뿐이다.
- G4-PAY-01·02 성공·실패·중복 callback은 실제 카드 소유자 인증 금지로 `accepted_unverified`다. 결제 비활성 상태가 출시 조건이다.
- `qa:predeploy-production`의 provider 조회가 Vercel에서 종료되지 않았고, Supabase provider 단독 실행은 query failed였다. 실제 provider 목록·운영 runtime·migration·Function은 별도 직접 조회로 검증했다.

### 다음에 칠 명령

```bash
git push -u origin release/v2.1.0-final-docs-20261108
```

위 push가 허용되면 PR을 만들고 docs-only CI를 확인한 뒤 main에 반영한다. 운영 web source는 계속 `a738543`으로 유지한다.

### 검증했나

- 관찰됨: production health exact source, migration 8/8, schema 5/5, Edge Function 6/6, 결제 503, 보안 헤더 6/6.
- 테스트됨: staging E2E 43/43, production 공개 3/3, production auth read-only 1/1, product data mutation 0, production dependency 취약점 0.
- 미검증: 실제 카드 callback. 회장 금지조건으로 accepted_unverified.
