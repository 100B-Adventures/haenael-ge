# G4-QA first sweep 일괄 보정 · 2026-11-06 16:50 KST

- current HEAD 기준 내부 결함 보정: QA 계약 카피 9건, 응원자 집계 23명·전개 20명, 보낸 응원 fixture의 `꾸준히`, 마이페이지 법적 링크 3개, 로딩 스피너 overflow를 수정했다. `.goal/baseline.json`은 여전히 없으며 새 기준선을 만들지 않았다. 최초 sweep 근거는 `.goal/g4-qa-sweep.summary.md` 그대로 보존한다.
- landing 표현 편차: 구성요소와 CTA 흐름은 존재하고, 응원 문구 순서·장식·여백만 다르다. 추천은 현재 제품 유지다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-landing-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-landing-390.png`.
- 목표 관리 표현 편차: 배너 이미지 상태, 제목 크기, 워드맵 높이·밀도 때문에 승인본보다 응원자 목록 진입이 아래로 밀린다. 기능·상태 계약은 보존됐다. 추천은 승인본의 더 짧은 세로 밀도만 후속 디자인 판정에서 채택하고, 이번 QA 배치에서는 현재 제품을 유지하는 것이다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-goal-detail-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-goal-detail-390.png`.
- 마이페이지 표현 편차: 프로필 배치·카드 간격·실데이터 메시지 밀도가 다르지만 프로필 편집, 활동, 응원 탭, 알림, 계정 흐름은 존재한다. 추천은 현재 데이터 구조를 유지하고 승인본의 카드 간격만 후속 디자인 판정에서 검토하는 것이다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-mypage-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-mypage-390.png`.
- 모바일 13px: 승인 계약이 전역 본문 중앙값 16px를 요구하지 않고 D-023은 하단 탭 라벨 13px을 명시한다. 추천은 전역 확대를 하지 않는 것이다. 실측은 13px 미만 0, 본문 토큰 16px, 44px 미만 누름 0, 가로 overflow 0이다.
- CI: `.github/workflows/ci.yml`의 `e2e-v2-social`은 staging 환경, 결제 설정 복구, 로그 artifact 보관이 구성돼 있어 수정하지 않았다. 지시대로 CI는 실행하지 않았고 G4-QA-01은 current commit 실행 증거가 생길 때까지 FAIL 유지다.

# 회장께 물을 것

- G4-PAY-01·02: Supabase staging 프로젝트 `ezzklgotgydwxqebfoys`에서 한 검증 수명주기 동안 `PAYMENTS_ENABLED=true`와 테스트 `TOSS_SECRET_KEY`를 설정할 권한이 필요하다. 저장된 두 관리 토큰은 secrets API에서 401/403이고, 현재 Edge Function은 HTTP 503이다. Vercel CLI와 `haenael-ge` 프로젝트 접근은 정상이다. Supabase 해낼게 조직 권한이 있는 로그인 또는 새 관리 토큰이 준비되면 동일 verify 두 건을 재실행한다.
- G4-AUTH-01: 해낼게 전용 Chrome에 Kakao 계정 로그인이 필요하다. 현재 실행 환경에서는 전용 Chrome 인스턴스가 0개이고, 9342 CDP는 두 번 모두 connection reset, 9334는 connection refused였다. 해낼게 Chrome이 열리면 staging 로그인 화면에서 Kakao 로그인 1회를 완료해 달라. 완료 뒤 동일 verify를 재실행해 callback과 제품 세션을 판정한다.

# 슬라이스 기록

## 2026-11-06 15:44 KST · G4-PAY · BLOCKED

- staging 주소: https://haenael-ge-v2-staging-100-b.vercel.app
- 검증 소스 커밋: `ebd0ac1773131528d112e06c11c4fe96cf5e49ca`
- G4-PAY-01 verify: EXIT 1. 배포물의 `NEXT_PUBLIC_PAYMENTS_ENABLED=false`로 CTA disabled, 실제 승인 callback 미도달.
- G4-PAY-02 verify: EXIT 1. 취소·실패·중복 callback 3건 모두 같은 CTA disabled 지점에서 중단.
- 서버 상태: `cheer-order` 실행 전후 HTTP 503. Supabase secrets API는 저장 토큰으로 401/403.
- Vercel 상태: CLI 로그인과 `haenael-ge` 프로젝트 접근은 관찰됨.
- 정리: staging fixture 최종 0건, 설정 변경 성공 0건, 운영키·실결제·송금 0건.
- 실행 로그: `.goal/runs/g4-pay-01-20261106.log`, `.goal/runs/g4-pay-02-20261106.log`, `.goal/runs/g4-pay-final-restore-20261106.log`
- 요약: `.goal/g4-pay-builder.summary.md`
- 배포: external blocked 슬라이스이므로 신규 staging 배포·closed 처리를 하지 않았다.

## 2026-11-06 15:29 KST · G4-AUTH · BLOCKED

- staging 주소: https://haenael-ge-v2-staging-100-b.vercel.app
- 검증 소스 커밋: `ebd0ac1773131528d112e06c11c4fe96cf5e49ca`
- G4-AUTH-01 verify: EXIT 1. `external_kakao_session_unavailable`, 9342 connection reset, 9334 connection refused.
- G4-AUTH-02: 기존 verify PASS 보존.
- 실제 브라우저 확인: 미완료. 회장 Kakao 로그인 1회가 필요한 external blocker.
- 실행 로그: `.goal/runs/g4-auth-01-shim-20261106.log`
- 데모: `docs/qa/evidence/v2-goal-round4-20261029/auth/index.html`
- 캡처: `web/test-results/v2-live-auth-G4-AUTH-live--c8b5b--동의부터-Supabase-제품-세션까지-왕복한다-chromium/test-failed-1.png`
- 배포: blocked 슬라이스이므로 신규 staging 배포·closed 처리를 하지 않았다.
