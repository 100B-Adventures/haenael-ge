# 해낼게 V2 Goal 4회차 상태

## 2026-11-07 11:30 KST 최신 관찰

- `origin/main=a738543`이며 canonical staging health도 `sourceSha=a738543dc307d764c0244723d865a9d7dc97d899`, HTTP 200, `status=ok`, `database=ok`로 일치한다. 실제 preview는 `https://haenael-opl8hv8l2-100-b.vercel.app`이다.
- staging social E2E를 onprem-114에서 같은 SHA로 다시 실행해 43/43 PASS(7.5분), fixture DB/Auth/Storage 0, 결제 비활성 복구 HTTP 503 `payments_disabled`를 관찰했다. 로그는 `.goal/runs/g4-social-a738.log`다.
- trusted run `42324947776`은 단위+빌드, 배포 환경 계약, Supabase 계약, cashout E2E가 모두 PASS했다. `e2e-v2-social`만 `labels=[self-hosted]`로 queued다. runner listener는 broker Session과 `Listening for Jobs`를 보이지만 job을 받지 않는다. 현재 PAT의 runner group API는 HTTP 403이며 조직 Default runner group의 public repository 접근 설정은 아직 확인하지 못했다.
- 구 run `42323635866`은 회장 진행 지시를 1회 승인으로 기록하고 취소해 concurrency lock을 해제했다. 수정본 run은 즉시 시작됐다.
- Kakao 실제 계정 callback과 Toss 테스트 키 접근 정책 변경은 외부 로그인 상태가 복구되지 않아 계속 미검증이다. 제품·QA의 나머지 경로는 진행을 멈추지 않고 위 증거까지 완료했다.

## 2026-11-07 Goal 재개 후 최신 관찰

- Goal 재개 후 main push가 성공해 `origin/main=3ee9803`이 됐다. trusted `repository_dispatch` run `42323635866`을 생성했고 단위 테스트+빌드, 배포 환경 계약, Supabase pgTAP+서버 계약은 PASS했다.
- `e2e-v2-social`은 GitHub job label `[self-hosted,onprem-114]`로 queued됐지만 실제 `onprem-114-android` runner의 직전 성공 job은 요청 label `[self-hosted]`였다. listener를 안전 재기동해 broker 연결·Listening for Jobs를 확인했는데도 배정되지 않아 label 불일치로 확정했다.
- main push CI `42323627047`은 단위 테스트+빌드, 배포 환경 계약, Supabase pgTAP+서버 계약이 PASS했고 cashout E2E만 FAIL했다. 실패 원인은 analytics consent banner가 환전 버튼 pointer event를 가린 테스트 환경 결함이다.
- workflow를 `runs-on: self-hosted`로 고치고 cashout E2E 컨텍스트에 `denied` consent를 선주입한 커밋 `a738543`을 main에 반영했다. production build PASS, 로컬 Supabase 기반 cashout E2E 13/13 PASS, EXIT 0을 직접 관찰했다. 로그는 `.goal/runs/g4-ci-cashout-local-reverify.log`다.
- 수정본 main CI `42324619968`은 단위 테스트+빌드, 배포 환경 계약, Supabase pgTAP+서버 계약, cashout E2E가 모두 PASS해 전체 green으로 종료됐다.
- 새 trusted dispatch `42324947776`을 `a738543` 기준으로 생성했다. 구 run `42323635866`의 30분 timeout이 끝나면 동일 concurrency group에서 자동 시작하도록 pending 상태로 두고 추적한다.
- staging 전체 재QA를 다시 실행했다. `social-web-first.spec.ts` 43/43 PASS, EXIT 0, fixture DB·Auth·Storage 잔여 0이다. 초대 수락 카드 `y=60`, 커버 `y=211.671875`도 승인본 위치로 관찰됐다. 원본 로그는 `.goal/runs/g4-qa-social-303aefa-recovered.log`다.
- 테스트 동안만 Supabase `PAYMENTS_ENABLED=true`로 전환했고 종료 직후 `false`로 원복했다. 실제 `cheer-order` 재호출은 HTTP 503, `error.code=payments_disabled`였다. 응답은 `.goal/runs/g4-payments-disabled-response.json`이다.
- Kakao는 CDP 프로필 9333·9342·9345·9444·9445의 세션을 모두 실제 OAuth 시작 URL로 검증했다. 전부 `accounts.kakao.com/login`과 password 입력으로 전환됐다. 9333 쿠키 재사용 live E2E도 `interactive_login_required`, EXIT 1이었다. 로그는 `.goal/runs/g4-auth-live-9333.log`다.
- onprem Chrome 9342에는 staging `/auth/kakao/start?redirect=/my`가 발급한 최신 nonce와 연결된 QR login 화면을 다시 띄워 두었다. QR visual 1개와 `accounts.kakao.com/qr_login` URL을 CDP로 관찰했다.
- Toss 공식 문서를 재확인했다. API 키 접근 정책은 개발자센터의 `API 키 접근 정책` 메뉴에서 테스트·라이브 환경별로 등록하는 설정이고, 허용 범위 밖 시크릿 키 호출은 `API_KEY_ACCESS_DENIED` 403이다. 공개된 설정 API는 문서에 없으므로 현재 계정 로그인 없는 CLI 해소 경로는 확인되지 않았다.
- trusted CI의 `e2e-v2-social`은 `[self-hosted, onprem-114]`가 맞다. 다만 이 job 정의는 통합 HEAD에만 있고 `origin/main=e0a9f30`에는 없다. `git push origin HEAD:main`을 실행했으나 세션 정책 `AskForApproval=Never`가 push 실행 자체를 거부했다. 구 main에 dispatch하면 해당 job이 없으므로 잘못된 green이 된다.

- 이전 blocked 상태는 회장 지시로 재개됐다. `origin/main=e0a9f30`, 통합 HEAD `3ee9803`이다. Chrome 9342는 Kakao QR 로그인과 Toss Payments 로그인 화면 그대로다. staging health 제품 SHA `303aefa`, DB ok, `cheer-order` HTTP 503 `payments_disabled`, onprem-114 runner active다.
- staging: https://haenael-ge-v2-staging-100-b.vercel.app
- health: status ok, version 2.1.0, sourceSha `303aefae0b4318e04daf4a7df59d01f2cd7457c5`, database ok, Supabase `ezzklgotgydwxqebfoys`. Alias 직후 `e97ef84` 관찰은 전파 중 값이어서 최종 증거에서 제외했다.
- G4-QA: `social-web-first.spec.ts` 단일 실행 43/43 PASS, fixture DB·Auth·Storage 0. 종료 뒤 `cheer-order` HTTP 503 `payments_disabled` 확인.
- G4-PAY: 취소·금액 변조 PASS. headed Chromium에서 최종 모의 카드 결제를 직접 눌러 success callback까지 도달했다. `toss-confirm` HTTP 502의 서버 로그는 Toss API 키 접근 정책이 Supabase Edge 출구 IP `13.125.157.0`을 차단했다고 명시한다. 이 정책 변경은 회장 Toss 콘솔 로그인이 필요한 항목으로 남긴다.
- G4-PAY FAIL: `sandbox.paymentResult=FAIL` 배포에서 최종 모의 카드 결제를 직접 눌러 `/payment/fail` callback에 도달했다. 실제 code는 `REJECT_CARD_COMPANY`였고 제품 실패 화면이 열렸다. 기존 E2E의 `PAY_PROCESS_CANCELED` 기대는 사용자 취소 경로의 의미라 sandbox FAIL과 달랐다. 테스트를 다시 수정하지 않고 실제 callback 관찰로 기록했다.
- 직접 화면: `.goal/runs/g4-pay-final-card-x11.png`. Xvfb root 전체 1280×1024 캡처지만 실제 브라우저 창은 500px라 저장용 캡처 화질 검사는 미달이다. 결제 판정 근거는 화면 단독이 아니라 callback HTTP 502와 Supabase function log다.
- G4-AUTH: onprem Chrome 9342 Kakao QR 로그인 화면. callback·제품 세션 미검증.
- CI: self-hosted onprem-114 runner active. trusted CI는 main 반영 뒤 실행 가능하며 현재 미실행.
- 안전 원복: Supabase `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` unset. Vercel `NEXT_PUBLIC_PAYMENTS_ENABLED=false`, `NEXT_PUBLIC_TOSS_SANDBOX_RESULT` 제거. live key·실결제 0회.

## Goal 정본 삭제 사고와 복구

- 원인: `goal-run-mark.sh clear`의 `rm -rf "$d"`가 런타임 로그뿐 아니라 `.goal` 장기 정본까지 삭제했다.
- 영향: 삭제 전 `.goal/runs` 로그·현재 objective·feature-list·execution-brief·demos 원문은 중앙 archive에 없어 완전 복구 불가.
- 조치: clear를 소유 런타임 파일만 지우도록 수정하고 임시 디렉터리에서 장기 파일 보존 PASS를 관찰했다.
- 복구: 이 Goal의 사용자 원문, 현재 세션 관찰, 중앙 goal archive를 근거로 핵심 정본 4개를 재작성했다. 삭제 전 비본질 메타데이터와 일부 과거 실행 로그는 미복구다.

# 회장께 물을 것

- main 반영과 staging 배포는 끝났다. trusted run의 self-hosted job은 GitHub 조직 Default runner group에서 public repository `100B-Adventures/haenael-ge` 접근을 허용해야 한다.
- Kakao 실제 계정 로그인과 Toss API 키 접근 정책 변경은 계정 로그인·인증이 필요한 외부 항목으로 남는다.
