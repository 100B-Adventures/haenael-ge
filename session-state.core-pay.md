# session-state.core-pay

## 무엇을 어디까지 했나

- 2026-11-08 01:5x KST, 114 회장 공용 Chrome CDP 9450의 로그인된 Toss Payments 개발자센터에서 테스트 API 키 접근 정책을 `13.125.157.0` IP 허용으로 변경했다. 라이브 정책·라이브 키는 사용하지 않았다.
- staging 결제를 테스트 키로만 임시 활성화해 G4-PAY-01·02 전용 Playwright 4건을 실행했다. 주문 생성과 Toss 결제창을 지나 신한카드 외부 인증창까지 도달했고, 취소·금액 변조 1건은 PASS했다.
- 검증 뒤 Supabase staging `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` 제거, Vercel canonical staging 결제 비활성 배포까지 복구했다.

## 남은 이슈·블로커

- G4-PAY-01은 success callback, 승인 API, 주문·결제·원장 반영이 미검증이다.
- G4-PAY-02는 취소·금액 변조만 테스트됨이다. 실패 callback과 성공 callback 중복은 미검증이다.
- 토스 공식 문서상 국내 카드 테스트 번호는 없고 테스트 키도 실제 카드 정보로 카드사 인증을 완료해야 한다. 회장 지시의 실제 카드·운영 결제 금지 경계 안에서는 성공 callback을 만들 수 없다.

## 다음에 칠 명령

- 실제 카드 인증 사용이 별도로 승인된 경우에만 staging 테스트 설정을 임시 활성화하고 아래 PAY 전용 명령을 다시 실행한다. 그 전에는 자동 재실행하지 않는다.
- `cd web && RUN_LIVE_TOSS_SANDBOX_E2E=1 E2E_BASE_URL=https://haenael-ge-v2-staging-100-b.vercel.app ~/.claude/harness/bin/heavy-slot.sh npx playwright test e2e/v2-live-payment.spec.ts --project=chromium --workers=1 --reporter=list`
- 매 실행 뒤에는 Supabase `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` 제거, 비활성 Vercel staging 재배포, `cheer-order` HTTP 503 확인을 반복한다.

## 검증했나

- 관찰됨: Toss 테스트 정책 `IP 주소 13.125.157.0`, 연결 키 1개, 저장 성공 toast.
- 테스트됨: PAY 전용 Playwright 4건 중 1 PASS, 3 FAIL. 실패 3건은 모두 신한카드 외부 인증 경계.
- 관찰됨: canonical health HTTP 200, `status=ok`, `database=ok`, `sourceSha=a738543dc307d764c0244723d865a9d7dc97d899`.
- 관찰됨: `cheer-order` HTTP 503 `payments_disabled`, 원격 `TOSS_SECRET_KEY` 없음.
- 관찰됨: 합성 fixture `auth.users payment-owner-*` 0건, `goal payment-*` 0건.
