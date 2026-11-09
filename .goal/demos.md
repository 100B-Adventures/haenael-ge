## 2026-11-09 14:25 KST · 1000만 토큰 상한 도달, 미완료 최종 상태

- 제품 커밋: `614c9490ac6810cb3230da0b0287c863ef2d0d84`. 기록9건 커밋: `57f6414`.
- staging: https://haenael-ge-v2-staging-100-b.vercel.app . root가 health source·status·database·staging ref 일치 EXIT0 확인(.goal/runs/g7-final-root-health.json).
- 회귀: 최신동일source 단일45개·retries0, 44passed/1failed/0flaky, EXIT1. 실패는 G4-FRIEND-HISTORY-01 친구카드기대3실제4. CC01의추가친구관계잔여가원인이다. hydration·clamp는이회차PASS.
- 결제2화면: 단어적립·실제워드맵·응원문구·복귀CTA는3폭보존됐으나 success/growth동시카드와dopamine header/CTA/tab누락으로둘다시안불일치. 디자인23일치/2불일치/1미확인(W12). 화면수정은미완이며회장표현선택대기로돌리지않는다.
- 회원응원친구화·상세회원이력·손님MY상세전용·홈집계유지는실제stagingfixture에서보존확인. PAYMENTS_ENABLEDfalse/503와QAfixture잔존0.
- 차단: 재수정위임을goal-guard가10,049,917/10,000,000토큰으로시작전에반려했다. 새수정·다른모델독립검증은미실행. 한도/weekly_cap우회없음. 소유builder·QA세션은모두종료. 운영배포없음.
- 다음일괄수정안: .goal/runs/g7-final-history-fix-task.txt. 새기능없이CC01정확fixture정리와두승인상태구조복원후한커밋·한staging배포·동결전체QA·Claude독립검증이남았다.
- QA요약: .goal/g7-final-qa.summary.md . 독립검증요청초안: .goal/runs/g7-final-independent-task.txt . 실제독립VERDICT파일은없으며PASS를주장하지않는다.

VERDICT: FAIL
판정범위: 현재동결QA결과이며다른모델독립VERDICT는미실행이다.

## 2026-11-09 12:21 KST · 컨트롤러 감사 지시 반영

결제 성공(paysuccess)·성장 피드백(dopamine)은 회장 결정 대상에서 회수했다. CLAUDE.md §4.3·D-049 승인 시안에 따라 두 화면 모두 추천안인 시안대로 수정하며 단어 적립 기능을 유지한다. 아래 과거 기록의 표현 선택 대기는 현재 유효하지 않다. 실제 구현 수정·재캡처 전에는 일치로 승격하지 않는다.

기존 최신 제품 source a282435, 전체 회귀42/45·디자인23/26 및 독립검증 FAIL 상태는 유지한다. 미커밋 기록9건을 이번 지시로 커밋한다. Goal 재개에 앞서 실제 hook은 8,484,766/8,000,000 토큰으로 위임 경로를 차단했다. 한도 변경·우회는 하지 않았다. 운영 배포 금지.

## 2026-11-09 01:56 KST · 손님 응원 위치 판정 완료

OD-haenael-20261108-guest-cheer=(가) 명시 전달 수신. 손님 상세는 마이페이지에서만 보존(기존11건 삭제 없음), 홈 워드맵·받은 응원수는 손님 포함 집계를 유지한다. 직전 위치 판정 대기 표기는 해소되었다. 기존 a282435 QA 근거와 일치하며 이번 신규 실행 없음. 회귀42/45·토큰 한도 차단은 별개로 미해소.

## 2026-11-09 01:54 KST · 컨트롤러 범위 정정

회원 응원 관계·친구 목록·친구 상세만 현재 실행 범위다. 계정 없는 손님 응원 11건은 현재 마이페이지 받은 응원에 그대로 보존한다. 최종 위치는 OD-haenael-20261108-guest-cheer 회장 판정 대기로 유지하며, 과거 21:4x 원장 회수 기록으로 자가종결하지 않는다. 이번 턴 제품 변경·재QA 없음. 기존 최신 source a282435, 회귀42/45, 실행 토큰 한도 초과 차단 유지.

# 최신 실행 상태 · 2026-11-09 01:32 KST · 목표 미완료

- staging: https://haenael-ge-v2-staging-100-b.vercel.app · source `a282435f797b085ca51edbf5a2f7eaab31848d1d`.
- D-050 회장 기답 이행: 친구 목록의 별도 과거 섹션 제거, 회원 간 이력은 친구 상세, 손님 상세는 받은 사람 마이페이지, 홈23명·워드맵 집계 보존. 세 폭 실제 DB 검증과 독립 코드리뷰 MAJOR0.
- 디자인 현재 26행: 일치23·불일치0·미확인3. 남은 것은 결제 성공·성장 피드백 표현2개와 W-12 staging 환전 검증 정책. 격리 localhost390·1024·1440/POST200/REQUESTED 성공은 stage통과로 대체하지 않는다.
- 최신 전체회귀: exact a282435, retries0, 42passed/3failed/0flaky, EXIT1. React418(hydration), lineClamp2 단정, 직전관계해제로 인한 FRIEND-HISTORY fixture 순서의존. 이 세 건은 아직 고치지 못했다. 과거45/45를 최신통과로 합산하지 않는다.
- 새 수정 위임 차단: goal-guard가 캐시 제외 지휘+워커 누적8,304,824/8,000,000토큰으로 차단했다. 차단된 새 작업은 시작되지 않았다. 실행예산은 임의 변경하지 않았다. 현재 실행중인 소유 위임은 없고 직전 작업의 브라우저·임시서버는 정리됐다.
- 최신 QA·실패 근거: `.goal/g7-friend-d050-qa.summary.md`, `.goal/runs/g7-friend-d050-qa-20261109/logs/regression-failures-first40.log`.
- 다음 실행(예산 증액 후): 세 실패 원인별 최소수정 일괄커밋→staging재배포→전체45개 단일재QA. 그 뒤 미해결 회장결정만 회수하고 최종 Claude 독립검증. 최종PASS·approved_stages는 작성하지 않았다.
- 회장 결정 자료: [결제 표현2개 선택·메모·복사 비교판](../docs/qa/g7-remaining-decisions-v1.0.0-gpt-codex-20261109.html). 친구는이미결정됐으므로다시묻지않는다.

# 회장께 물을 것 · G7 최신 자료 (2026-11-09)

- **결제 표현 2개**: [같은 폭 선택·메모·복사 비교판](../docs/qa/g7-remaining-decisions-v1.0.0-gpt-codex-20261109.html). 왼쪽은 승인 시안, 오른쪽은 source `2784ba2` staging이다. 390 CSS px·DPR 3 직접 촬영, 좌우 2340×2532. 추천은 승인 위계로 정리하면서 실제 단어 적립 기능은 보존하는 것이다. 중앙 `OD-haenael-20261108-payment-feedback-surface` 자료를 갱신했다.
- **staging 환전 정책**: 운영과 분리된 staging DB·전용 테스트 키에서만 환전 신청 검증을 허용할지 요청했다. 추천은 허용이다. 허용 전에는 W-12를 유지한다. localhost 세 폭과 POST 200·REQUESTED·마스킹·상태·내역 검증은 완료했으며 이를 staging 통과로 대신하지 않는다. 중앙 `OD-haenael-20261109-staging-cashout-policy`.
- **친구 항목은 D-050 기답 검증 완료:** source `a282435f` staging의 390·1024·1440px에서 친구 목록의 손님 과거 섹션 제거, 회원 간 응원 2건의 친구 상세 이동, 손님 응원의 `/my` 보존, 홈 23명·워드맵 단어 보존을 직접 확인했다. 친구 화면은 다시 판정 요청하지 않는다. 비교 근거 `.goal/runs/g7-friend-d050-qa-20261109/direct-captures/`.
- **현재 QA 상태:** 디자인 26화면은 `일치 23 / 불일치 0 / 미확인 3`이다. 미확인은 위 결제 표현 2개와 staging 환전 활성 정책뿐이다. 누적 사회 회귀는 단일 실행 `42 passed / 3 failed / 0 flaky`, EXIT 1이므로 출고 통과가 아니다. 근거 `.goal/g7-friend-d050-qa.summary.md`.

# 회장께 물을 것 · G7-SURF 최종 확인 2026-11-08

- **현재 제품 상태:** source `2784ba28f6bf796fe8cbfa446941898e4b3ddcd9`에서 승인 26화면은 `일치 22 / 불일치 0 / 미확인 4`다. 설명 화면 CTA와 로그인 sheet copy는 390·1024·1440px에서 승인 정의와 일치했다. 전체 사회 회귀는 단일 실행·retries 0에서 `45 passed / 0 failed / 0 flaky`, EXIT 0이다. 기능 차단 결함은 0건이다. 근거 `.goal/g7-surf-confirmation-qa.summary.md`.
- **결제 성공 화면 표현 선택:** 승인본은 성공 문구·목표 귀환을 먼저 보여주고, 현 제품은 같은 화면에 워드맵 성장 카드까지 크게 결합한다. 추천은 승인본처럼 성공 피드백을 1차로 두고 성장 카드는 다음 화면의 보조 정보로 이동하는 것이다. 390·1024·1440 비교: `.goal/runs/g7-surf-confirmation-qa-20261108/comparison-captures/paysuccess-{390,1024,1440}-pair-clean.png`.
- **결제 직후 워드맵 성장 피드백 표현 선택:** 승인본은 목표 사진과 전체 워드맵 안에서 방금 보낸 단어가 쌓인 맥락을 먼저 보여주지만, 현 제품은 결제 성공 카드 안의 축약 워드맵으로 표시한다. 추천은 실제 단어 적립 기능은 유지하되 승인본의 목표 사진·전체 워드맵 위계를 채택하는 것이다. 390·1024·1440 비교: `.goal/runs/g7-surf-confirmation-qa-20261108/comparison-captures/dopamine-{390,1024,1440}-pair-clean.png`.
- **친구 목록 표현 선택:** 승인본은 친구 목록 3행에 집중하고, 현 제품은 친구 목록과 과거 응원 기록 3건·초대 카드를 한 화면에 결합한다. 추천은 친구 목록은 승인 위계를 따르고 과거 응원 기록은 별도 활동 화면으로 분리하는 것이다. 390·1024·1440 비교: `.goal/runs/g7-surf-confirmation-qa-20261108/comparison-captures/friends-{390,1024,1440}-pair-clean.png`.
- **W-12 환전 검증 경계:** staging에서는 안전계약에 따라 활성 신청 상태를 만들지 않아 `cashout`은 미확인이다. 격리 localhost에서는 390·1024·1440px, 신청 POST 200, DB `REQUESTED`, 계좌 마스킹, 상태·내역, fixture 0까지 관찰했다. 이 로컬 근거를 staging 일치로 승격하지 않았다. 근거 `.goal/g7-cashout-local-final.summary.md`.

## 과거 회차 기록

- **G7-SURF post-remediation 동결 QA 종료:** source `4b15cd88ec972b9ef81055dbbc1fc9eb2b4a42e0`에서 변경 9화면 390·768·1024·1440과 상태 재촬영 4화면을 직접 조작했다. 현재 26화면은 `일치 20 / 불일치 2 / 미확인 4`다. `how` CTA와 실제 `login` sheet 표현은 승인본과 달라 불일치이며, 결제 성공·결제 직후 워드맵 성장 피드백·친구 표현은 회장 판정 대기를 유지한다. W-12 환전은 격리 localhost 3폭·POST 200·DB `REQUESTED`·마스킹·내역까지 성공했지만 staging enabled는 미확인이다. 전체 45회귀는 `42 passed / 3 failed / 0 flaky`, EXIT 1로 관리자 접힘 시험 계약 결함 2건과 네트워크 조건 실패 1건이 남았다. 근거 `.goal/g7-surf-post-remediation-qa.summary.md`.
- **현재 남은 새 표현 판정 3화면:** 결제 성공 화면과 결제 직후 워드맵 성장 피드백은 실제 DB `DONE` 상태에서 모두 동작한다. 승인본의 간결한 성공 피드백을 채택하고 성장 카드는 다음 화면의 보조 정보로 내리는 안을 추천한다. 친구 화면은 승인본에 없는 과거 응원 기록을 별도 활동 화면으로 이동하는 안을 추천한다. 비교판은 `.goal/runs/g7-surf-reconciled-qa-20261108/captures/{paysuccess,dopamine,friends}-{390,1024,1440}-pair.png`이고, 자동으로 일치 승격하지 않았다.
- **기존 표현 판정 회수:** D-049·D-040·D-026이 이미 답한 항목은 다시 묻지 않는다. 직접 픽셀 대조에서 구현·시안 불일치 13개가 확인됐고, terms·privacy·status 3개는 구 prototype과 불일치하더라도 기존 결정이 우선이라 제품을 되돌리지 않는다.
- **미확인 5개:** cashout은 W-12 enabled 상태 미생성, connect는 승인/실제 상태 불일치, coverage는 landing을 잘못 캡처, how는 분석 동의 팝업이 CTA를 가림, login은 온보딩 form을 잘못 캡처했다. 추가 캡처 금지에 따라 미확인으로 고정했다.
- **이번 전수 QA:** source `3142e9a13f114fa9e2956e28504df042ba07f268`, 승인 26화면 `일치 2 / 불일치 19 / 미확인 5`. 전체 사회 회귀는 단일 실행·retries 0에서 `43 passed / 2 failed / 0 flaky`; 최종 결제 비활성 HTTP 503, fixture 잔존 0이다. 근거 `.goal/g7-surf-reconciled-qa.summary.md`, `.goal/runs/g7-surf-reconciled-qa-20261108/`.

- **G7-REG 최종 검증·staging 배포 2026-11-08 18:53 KST:** 고정 주소 `https://haenael-ge-v2-staging-100-b.vercel.app`, 배포 URL `https://haenael-ntg4kagv6-100-b.vercel.app`, commit/sourceSha `27d20ef2f6756543257f620a9764ce11408413bc`. 메모리 available 11,684MB에서 `social-web-first.spec.ts` 45개를 단일 실행·retries 0으로 돌려 `45 passed / 0 failed / 0 flaky`, EXIT 0을 관찰했다. 새 배포는 Vercel `Ready`, 고정 alias health `status=ok`, `database=ok`, exact SHA다. 배포 후 독립 smoke 1/1에서 테스트 회원 건강 preset 선택→reload 유지→public 반영과 360·390·412·600·700·780·820·900·1000px 이미지 decode를 확인했고 fixture DB·Auth·Storage 전 범주 0이다. 이 1건은 전체 45개에 합산하지 않았다. 최종 `PAYMENTS_ENABLED=false`, `cheer-order` HTTP 503이다. 전체 로그·capture: `.goal/runs/g7-reg-final-20261108-184254/{logs/social-web-first.log,e2e-captures/}`. 배포 후 smoke: `.goal/runs/g7-reg-final-20261108-184254/logs/post-deploy-pw03.log`; source-identical 직접 캡처: `.goal/runs/g7-reg-staging-smoke-captures/{10-cover-owner-health-display-390.png,12-cover-public-health-reflected-390.png}`.

- **G7-SURF 최종 QA 2026-11-08 18:25 KST:** staging source `f51db4255753c99b356abed4f2b2a74cd240351b`에서 승인 26화면을 현재 증거로 재판정했다. 390px 26개·1024px 22개는 UI 불변 diff 근거로 재사용했고, 1440px 26개·누락 1024px 4개·핵심 768px 9개·실제 `DONE` 결제 390/1024/1440은 신규 회수했다. 결과 `일치 10 / 불일치 15 / 미확인 1`, 기능 차단 결함 0건이며 출고 PASS가 아니다. 미확인은 W-12가 Vercel Preview에서 스위치와 두 key를 강제로 거부해 안전계약을 깨거나 운영 DB에 쓰지 않고는 만들 수 없는 환전 enabled 실화면이다. 현재 단위 53/53과 과거 격리 로컬 Server Action 200·DB 상태전이·Playwright 45개 PASS를 대체 증거로 붙였지만 실화면 일치로 승격하지 않았다. 전체 회귀는 단일 실행 retries 0에서 `44 passed / 1 failed / 0 flaky`; `PW-03`의 visible `/_next/image` broken 판정 1건을 재시도 없이 보존했다. 결제 false 복구·HTTP 503·fixture 0을 확인했다. 근거 `.goal/g7-surf-final-qa.summary.md`, `.goal/runs/g7-surf-final-qa-20261108-180728/`.
- **이전 회차 표현 판정 목록, 현재 판정으로 대체됨:** 당시 14개 결정을 대기시켰으나 결정 재대조 뒤 기존 기답 항목은 회수했다. 현재 유효한 회장 판정은 위의 결제 성공·결제 직후 피드백·친구 3화면뿐이다.

- **재QA 표현 편차 4건 추가:** 온보딩 입력 순서·커버 자산(`OD-haenael-20261108-onboarding-surface`), 홈 목표 카드 위계(`OD-haenael-20261108-home-surface`), 업적 메달 자산·진열대(`OD-haenael-20261108-status-surface`), 이용약관 정보 구조·타이포(`OD-haenael-20261108-terms-surface`)를 같은 폭 390·1024px 비교판과 함께 등록했다. 네 화면의 계약 기능은 실제 제품에 있어 임의 시안 원복은 하지 않았다. 이용약관 전문은 축약하지 않는 안을 추천했다. 비교판: `.goal/runs/g7-surf-reqa-20261108-1639/browser/{onboarding,home,status,terms}-{390,1024}-pair.png`.

- **G7-SURF 후속 제품수정 최종 배포 2026-11-08 16:31 KST:** `https://haenael-ge-v2-staging-100-b.vercel.app`, commit/sourceSha `c2eb2f64d329fa7814dddca0d60fc4efc3fbdbf7`, preview `https://haenael-nywtq4gob-100-b.vercel.app`. health의 status·database `ok`, Supabase project ref와 sourceSha가 exact다. 같은 배포에서 테스트 회원 로그인, 목표 2건 생성, 홈 표시, 3건 상한 거절 쓰기 스모크 2/2를 통과했고 fixture를 정리했다. 로그: `.goal/runs/g7-surf-build-followup-20261108/{staging-health-final.log,staging-multi-goal-smoke-final.log}`.
- **결제 직후 워드맵 성장 피드백:** 결제 확인으로 생성된 `cheerId`와 목표 slug를 다시 대조한 뒤 최신 워드맵·응원 수·방금 보낸 문구를 같은 성공 화면의 성장 오버레이에 표시하도록 구현했다. 로컬 실서버와 실제 staging DB fixture에서 HTTP 200, 오버레이 표시, 워드맵 렌더, console error 0, 가로 overflow 0을 관찰했다. staging은 결제가 비활성이고 Toss 테스트 키 IP 정책도 남아 실제 callback 기반 오버레이는 미검증이다. 근거 `.goal/runs/g7-surf-build-followup-20261108/{local-dopamine-smoke.log,local-dopamine-render.log,payment-dopamine-local-390.png}`.
- **환전 상태·내역 표현 선택:** 기능 데이터는 바꾸지 않았다. 상태 화면은 DESIGN의 한 칼럼 계약과 승인 시안의 세로 진행 단계를 따르는 안을 추천해 `OD-haenael-20261108-cashstatus-surface`에 등록했다. 내역 화면은 승인 시안의 간결한 거래 행을 주 정보로 하고 현행 합계는 보조 요약으로 남기는 안을 추천해 `OD-haenael-20261108-cashhistory-surface`에 등록했다. 결정 전에는 둘 다 디자인 불일치로 유지한다.
- **스테이징 제품수정본 2026-11-08 16:02 KST:** `https://haenael-ge-v2-staging-100-b.vercel.app`, commit/sourceSha `d73f0bfa9a969177431e96f0a45ada1efd862bf9`. 테스트 회원 로그인·목표 2개 쓰기·커버 프리셋·온보딩 사진 업로드(sign→PUT→finalize 200→DB `REVIEW`)·홈 목표 목록·3개 상한 거절은 headless Chromium에서 통과했고 fixture는 종료 시 정리했다. 캡처: `.goal/runs/g7-surf-build-20261108/captures/{onboarding-cover-picker-390,home-goal-list-390,achievement-medals-390}.png`. 로그: `.goal/runs/g7-surf-build-20261108/staging-onboarding-cover-smoke.log`, `.goal/runs/g7-surf-build-20261108/staging-capture-smoke.log`.
- **어떻게 쓰나요 화면 표현 선택:** 같은 390px 비교와 승인 프로토타입 DOM을 다시 확인했다. 승인본은 평문 3단계와 `나도 시작하기` 단일 CTA이고, 현행은 카드형 3단계와 `시작하기`·`홈으로` 두 동작이다. 추천은 승인본의 짧은 평문 흐름으로 복원하는 것이다. 첫 사용 설명이 한 화면에 끝나고 승인 계약과도 일치한다. 비교: `.goal/runs/g7-surf-20261108-150235/browser/compare/how-390-pair.png`. 회장 결정 전에는 현행 제품을 바꾸지 않았다.
- **내 워드맵 화면 표현 선택:** 같은 390px 비교와 승인 프로토타입 DOM을 다시 확인했다. 승인본은 D-day·진행 상태·실제 응원 단어·응원 인원을 읽는 owner 읽기뷰이고, 현행은 공유 포스터와 다운로드·Instagram·링크 복사 도구 중심이다. 추천은 승인 owner 읽기뷰를 복원하고, 현행 내보내기 도구는 읽기 정보를 대체하지 않는 별도 액션으로 재설계하는 것이다. 비교: `.goal/runs/g7-surf-20261108-150235/browser/compare/mywordmap-390-pair.png`. 회장 결정 전에는 현행 제품을 바꾸지 않았다.
- **환전 신청 Preview 비활성:** `web/src/lib/supabase/service.ts`의 W-12 계약은 Vercel Preview에서 `CASHOUT_ENABLED`와 암호화·fingerprint 키 사용을 강제로 거부한다. 전화번호·잔액 100인 staging 테스트 회원에서 폼 0건·비활성 안내 1건이 나온 것은 이 안전 설정과 일치하므로 제품 코드를 바꾸지 않았다. 실제 신청 쓰기는 운영 DB·실송금 없이 로컬 전용 현행 E2E 경로에서 검증하는 구조를 유지한다.
- **결제 성공 외부 키 정책:** 2026-11-07 실제 Toss sandbox 성공 callback은 제품 `/payment/success`까지 도달했지만 Supabase Edge 출구 IP `13.125.157.0`이 테스트 키 접근 정책에서 거부되어 `toss-confirm` HTTP 502였다. staging은 현재 `payments_disabled`다. 값은 기록하지 않았고 기존 `OD-haenael-ge-20261106-toss-test-ip`에 최신 실제 IP와 추천을 보강했다.
- **친구 목록 과거 응원 기록:** 기존 `OD-haenael-20261108-cheer-history` 회장 대기를 그대로 유지한다. 이번 제품수정에서 삭제·이동·자가종결하지 않았다.
- **법적 문서·사업자 정보·커버 보관함:** 이용약관·개인정보처리방침 전문은 축약하지 않았다. 사업자 정보 2단 구조와 기존 3단계 커버 업로드는 D-040을 따라 유지했다. 약관의 화면 노출 HTML entity만 실제 따옴표로 고쳤다.

- **G4-PAY sandbox FAIL direct callback 2026-11-07 09:24 KST · 제품 failUrl 도달:** staging `88a2814a85a23fe2fbfc3d60b74d154707739351`에서 `NEXT_PUBLIC_TOSS_SANDBOX_RESULT=FAIL`로 배포하고 기존 `LIVE-TOSS-EDGE-FAIL`을 headed Chromium으로 실행했다. 카드사 모의 화면의 최종 `결제하기`를 실제 포인터 입력으로 눌러 `/payment/fail` callback에 도달했으며 실제 code는 `REJECT_CARD_COMPANY`였다. 테스트 고정 기대값 `PAY_PROCESS_CANCELED`는 사용자 취소 의미여서 sandbox FAIL 응답과 달라 EXIT 1이지만, 제품 failUrl과 실패 화면 도달은 관찰됐다. Goal의 테스트/환경 보정 1회 제한에 따라 기대값을 다시 고치지 않았다. 종료 후 `PAYMENTS_ENABLED=false`, sandbox 강제값 제거, `cheer-order` HTTP 503을 재확인했다.
- **G4-PAY direct callback 2026-11-07 09:15 KST · 외부 키 정책 원인 확정:** staging `e97ef8492d32d39eb0e53b2d92e80ed4049343bd`에서 기존 `LIVE-TOSS-SUCCESS`를 headed Chromium으로 실행하고 Toss 카드사 모의 화면의 최종 `결제하기`를 실제 포인터 입력으로 눌렀다. successUrl callback까지 도달했으나 `toss-confirm`은 HTTP 502였다. Supabase Management Logs에서 동일 request의 서버 원문이 `API 키 접근 정책에 의해 허용되지 않은 요청`, 요청 IP `13.125.157.0`임을 확인했다. 따라서 남은 PAY-01 blocker는 제품 callback 코드가 아니라 Toss 테스트 키의 Supabase Edge 출구 IP 허용 정책이다. live key·실결제는 사용하지 않았다. 종료 후 `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` unset, Vercel sandbox 강제값 제거, `cheer-order` HTTP 503 `payments_disabled`를 관찰했다. 직접 화면은 루트 Goal `.goal/runs/g4-pay-final-card-x11.png`이며 실제 브라우저 창 500px라 저장용 캡처 화질 기준 미달을 숨기지 않는다.
- **Goal 정본 삭제 사고 복구 2026-11-07 09:09 KST:** `goal-run-mark.sh clear`의 `rm -rf "$d"`가 `.goal` 런타임 마커와 장기 정본을 구분하지 않아 루트 Goal의 objective·feature-list·execution-brief·demos·runs와 이 worktree의 미추적 Goal 증거를 삭제했다. tracked `.goal/demos.md`는 Git에서 복구했고, 루트 Goal 핵심 파일 4개는 사용자 Goal 원문·관찰 증거·중앙 archive로 복구했다. 하네스는 runtime 파일 7개만 삭제하도록 수정했고 임시 Goal에서 장기 파일 보존 PASS, 커밋 `493a000e` (`EV-ID: ev-20261107-08`), 100B changelog 생성물 반영을 확인했다. 삭제 전 미추적 실행 로그 일부는 복구 불가다.
- **최종 QA 증거 확정 2026-11-07 07:24 KST · 제품 결함 0, 단일 invocation 43/43 아님:** staging `sourceSha`는 `5b1bb214fe67e596c6d83f2fc5da0579970e31fe` exact다. Social full suite 단일 실행은 retries 0에서 42/43이고 유일 실패는 로컬 `GITHUB_SHA` 미주입이었다. `GITHUB_SHA`·`E2E_EXPECTED_SOURCE_SHA`를 현재 HEAD로 주입한 표적 `QA-TC-GT-02`는 실제 1회 실행에서 1/1 PASS했다. 두 실행을 합산한 43개 분모의 제품 결함은 0이지만 단일 invocation 43/43으로 판정하지 않는다. `9f59e2a` 대비 제품 코드 diff 0을 근거로 Analytics consent 3/3 증거를 재사용했고 재실행하지 않았다. fixture 전 범주 0, `PAYMENTS_ENABLED=false`, `cheer-order` HTTP 503, Git 추적 변경 0이다. Kakao 실로그인·Toss 카드 본인인증·GitHub Actions는 미실행이다. `G4-QA-01` actual CI는 기존 FAIL/이번 미실행 상태를 유지하고 feature-list와 slice status는 변경하지 않았다. 로그 `.goal/runs/g4-integration-final-social-20261107-071418/social-playwright.log`, `.goal/runs/g4-integration-gt02-targeted-20261107-072105/gt02-playwright.log`, `.goal/runs/g4-integration-reqa-20261107-065026/analytics-playwright.log`, `.goal/runs/g4-integration-gt02-targeted-20261107-072105/final-checks.log`.
- **현재 Goal 상태 2026-11-07 03:48 KST · ACTIVE:** G4-AUTH-02는 staging 실제 엣지 경로 1/1·EXIT 0이고 G4-AUTH-01은 Kakao 계정 입력 이후 callback·제품 세션이 남았다. G4-PAY는 test key로 Toss sandbox session HTTP 200과 신한카드 외부 인증 화면까지 도달했고 카드 소유자 인증 이후 callback은 미검증이다. G4-QA self-hosted LOCAL PREFLIGHT는 `cde8b43` staging에서 43/43, failed 0, flaky 0, fixture 0, 결제 비활성 복구 HTTP 503이다. 순서 의존 GT-01을 독립 fixture로 교정했고, onprem agent mode의 Supabase 변경 확인에는 `--yes`를 명시하도록 `41af197`에서 활성화·복구 양쪽을 보정해 독립 재리뷰 MAJOR 0을 받았다. runner service는 `onprem-114-android`로 실행 중이다. 실제 G4-QA-01 GitHub Actions run은 이 workflow가 default `main`에 반영된 뒤 1회 실행해야 한다.
- **G4-QA self-hosted LOCAL PREFLIGHT 2026-11-07 03:42 KST ✅ PASS(CI 판정 아님):** 최초 전체 실행은 42 passed·1 flaky였다. `PW-02`가 owner 공개 목표 제목을 950으로 바꾼 뒤 `QA-TC-GT-01`이 같은 fixture의 900을 기대한 순서 의존을 `cde8b43`에서 독립 `friend2-public` fixture로 분리했다. 표적 `PW-02 → GT-01`은 retry 없이 2/2 첫 시도 PASS, 전체 재QA는 정확히 1회 실행해 43 passed·0 failed·0 flaky다. cleanup namespace 1개 전 범주 0, `PAYMENTS_ENABLED=false`, `cheer-order` HTTP 503 `payments_disabled`, 작업트리 clean이다. 근거 `.goal/g4-qa-selfhosted-postfix.summary.md`, `.goal/runs/g4-qa-selfhosted-postfix-20261107-033459/`. 실제 GitHub Actions CI 통과로 확대하지 않는다.
- **G4-PAY staging lifecycle 2026-11-07 02:58 KST ❌ BLOCKED(외부 카드 인증):** G4-PAY-01은 test client key가 빠진 첫 enabled 배포에서 Toss 호출 전 timeout으로 0/1·EXIT 1이었다. 배포 환경을 교정한 뒤 정확히 1회 실행한 G4-PAY-02는 Toss sandbox session API HTTP 200과 신한카드 인증 화면까지 도달했지만 0/3·EXIT 1이다. 기존 114 직접 API probe의 HTTP 403은 이번 브라우저 lifecycle에서 재현되지 않았다. 운영키·실결제·송금은 0회다. 종료 후 `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` 부재, fixture 0, authenticated `cheer-order` HTTP 503 `payments_disabled`, staging health sourceSha `6ca683799a44044832e9569610b4176eced3cf63`를 확인했다. 근거 `.goal/g4-pay-resume.summary.md`, `.goal/runs/g4-pay-resume-20261107-024138/`.
- **QA-REVERIFY-DESIGN-TOKEN-02 2026-11-07 01:21 KST ❌ FAIL(시험 결함):** staging SHA `9b1e0332fffae811da446877cba05370c089c0bf`, 390px headless Chromium 재실행 1회는 EXIT 1이다. 지시대로 먼저 실행한 `PhoneConsentNotice`와 `ShareLinkCard`는 token/computed color 2/2·HTTP 200·console/page error 0·캡처를 충족했다. 결제 번들 환경 보정 selector가 실제 `"data-testid":"cheer-cta"`가 아니라 `data-testid:"cheer-cta"`를 찾아 patch 0건으로 중단되어 `CheerPaymentButton` 3개는 미검증이고 전체 2/5다. fixture 잔존 0, 제품 결함으로 확대하지 않으며 추가 재실행하지 않았다. `.goal/runs/g4-design-token-staging-qa-20261107-011631/qa-report.md`.
- **QA-REVERIFY-DESIGN-TOKEN-01 2026-11-07 01:04 KST ❌ FAIL(시험 결함):** staging SHA `9b1e0332fffae811da446877cba05370c089c0bf`, 390px headless Chromium 1회에서 `PhoneConsentNotice` token/computed color·HTTP·console/page error는 PASS. disabled CTA의 DOM property 해제로 React 결제 시트가 열리지 않아 `CheerPaymentButton` 3개와 뒤의 `ShareLinkCard` 1개는 미검증, EXIT 1. fixture 최종 잔존 0. `.goal/runs/g4-design-token-staging-qa-20261107-010010/qa-report.md`.

# Goal 종료 상태 · 2026-11-06 21:46 KST

- G4-QA-01 CI 재검증 2026-11-07 00:30 KST: branch `session/core-20261015`, SHA `61439cfffb85bdba052d24de6848dd76cab62f82`, workflow_dispatch run `42242973230`을 정확히 1회 실행했으나 conclusion=failure다. jobs는 환전 E2E·배포계약·Supabase 계약 success, 단위 테스트+빌드와 e2e-v2-social failure다. e2e는 `SUPABASE_ACCESS_TOKEN` invalid로 시작 전 skipped, artifact 0, fixture cleanup 미실행이며 exact verify EXIT 1이다. staging은 HTTP 503 `payments_disabled`로 false 유지. URL `https://github.com/100B-Adventures/haenael-ge/actions/runs/42242973230`, 요약 `.goal/g4-qa-ci-61439cf.summary.md`.
- G4 초대 위치 staging 표적 재QA 2026-11-06 23:33 KST: `https://haenael-ge-v2-staging-100-b.vercel.app`, SHA `a6d68a3e2556cc9eb5076d1106ba05671439f3b5`, health exact PASS, `QA-REVERIFY-VIEWPORT-01` 1/1·EXIT 0. card y=60, cover y=211.671875, console/page error 0, 390·1024·1280 overflow 0, fixture cleanup 0이다. 캡처 `.goal/runs/g4-invite-position-staging-reqa-20261106-233005/captures/dev-inviteaccept-{390,1280}.png`, 요약 `.goal/g4-invite-position-staging-reqa.summary.md`. CI·ORDER-ATTR-01·G4-PAY·전체 suite는 실행하지 않았다.
- G4-QA c42e21c 재QA 2026-11-06 23:13 KST: `https://haenael-ge-v2-staging-100-b.vercel.app`, SHA `c42e21c8b09963ea4293f657c4e13802f85ae6e4`, health exact PASS, QA-01 EXIT 1(CI run 없음), QA-02 EXIT 0, social 41/43이며 제품 범위는 41/41이다. 390/768/1440 HTTP·console·overflow PASS, AU-05·admin event code·쓰기/cleanup 최종 0 PASS. 표현 편차 2건은 판정 대기, G4-PAY는 별도 blocker. 캡처 `.goal/runs/g4-qa-c42e21c-reqa-20261106-224823/admin-responsive/admin-768.png`, `.goal/runs/g4-qa-final-reqa-20261106-204705/compare-inviteaccept-approved-left-staging-right-390.png`; 요약 `.goal/g4-qa-c42e21c-reqa.summary.md`.
- G4-PAY 재검증 2026-11-06 22:40 KST: PAY-01 EXIT 1, PAY-02 EXIT 1(0/3), 첫 실패는 모두 staging `cheer-cta` disabled이며 Toss API 미도달이다. `PAYMENTS_ENABLED=false`, `TOSS_SECRET_KEY` 부재와 fixture 0을 확인해 BLOCKED 유지. 근거 `.goal/g4-pay-recheck.summary.md`.
- G4-QA: commit `5b552ceda65170a681f49ac5fe98f65151adbb60`에서 두 신규 blocker를 수정했다. 로컬 실서버와 staging DB 표적 2/2, production build, exact contract와 unit 489/489가 PASS했고 Claude 교차 리뷰는 MAJOR 0이다. 익명 `set_goal_cover_preset`은 staging RPC에서 HTTP 401, Postgres `42501`로 차단됨을 관찰했다. Vercel CLI는 AUTH_DEAD이며 `vercel login` device 승인 창(user code `SSSM-DWWR`)을 해낼게 전용 Chrome에 유지했다. 회장 승인 전에는 `5b552ce` staging 배포와 동일 SHA 재QA를 할 수 없어 G4-QA를 BLOCKED로 둔다.
- G4-PAY: staging 전용 Supabase 관리 토큰은 secrets API HTTP 200으로 복구됐다. `toss.env`의 테스트 키는 114 IP에서 HTTP 403 `API_KEY_ACCESS_DENIED`가 관찰됐고, `live_sk` 및 `haenael-ge-toss-secret-key`는 사용하지 않았다. 복구 뒤 PAY-01·02 재검증 위임은 Goal 토큰 상한 `8,000,000` 대비 `8,062,959` 사용으로 하네스가 차단해 실행되지 않았다. 외부 키 접근 정책과 실행 예산 대기로 BLOCKED를 유지한다.
- G4-AUTH: G4-AUTH-02 PASS는 보존한다. G4-AUTH-01은 Kakao KOE006 redirect URI 등록과 실제 로그인 동의가 남아 BLOCKED다.
- 표현 편차: 초대 card y=101 대 승인 y=60, cover y=247.671875 대 승인 y=211.921875는 회장 판정 대기다. 자동 수정하지 않았다. 비교 이미지 `.goal/runs/g4-qa-final-reqa-20261106-204705/compare-inviteaccept-approved-left-staging-right-390.png`.

# Claude 컨트롤러 알림 2026-11-06 19:2x KST

- G4-PAY 막힘 해소: staging 전용 Supabase 관리 토큰을 haenael-ge-supabase-mgmt.env 와 haenael-ge-qa-staging.env 의 SUPABASE_ACCESS_TOKEN 에 넣었다. staging secrets API 200 확인, 운영은 403. 다시 시도한다.
- G4-AUTH-01: 실제 원인은 Kakao KOE006(redirect URI 미등록)이다. 회장 메인 Chrome 로그인 대기. 이 항목에 시간을 쓰지 않는다.

# G4-QA first sweep 일괄 보정 · 2026-11-06 16:50 KST

- current HEAD 기준 내부 결함 보정: QA 계약 카피 9건, 응원자 집계 23명·전개 20명, 보낸 응원 fixture의 `꾸준히`, 마이페이지 법적 링크 3개, 로딩 스피너 overflow를 수정했다. `.goal/baseline.json`은 여전히 없으며 새 기준선을 만들지 않았다. 최초 sweep 근거는 `.goal/g4-qa-sweep.summary.md` 그대로 보존한다.
- landing 표현 편차: 구성요소와 CTA 흐름은 존재하고, 응원 문구 순서·장식·여백만 다르다. 추천은 현재 제품 유지다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-landing-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-landing-390.png`.
- 목표 관리 표현 편차: 배너 이미지 상태, 제목 크기, 워드맵 높이·밀도 때문에 승인본보다 응원자 목록 진입이 아래로 밀린다. 기능·상태 계약은 보존됐다. 추천은 승인본의 더 짧은 세로 밀도만 후속 디자인 판정에서 채택하고, 이번 QA 배치에서는 현재 제품을 유지하는 것이다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-goal-detail-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-goal-detail-390.png`.
- 마이페이지 표현 편차: 프로필 배치·카드 간격·실데이터 메시지 밀도가 다르지만 프로필 편집, 활동, 응원 탭, 알림, 계정 흐름은 존재한다. 추천은 현재 데이터 구조를 유지하고 승인본의 카드 간격만 후속 디자인 판정에서 검토하는 것이다. 승인본 `.goal/runs/g4-qa-browser-20261106/approved-mypage-390.png`, 현재 제품 `.goal/runs/g4-qa-browser-20261106/dev-mypage-390.png`.
- 모바일 13px: 승인 계약이 전역 본문 중앙값 16px를 요구하지 않고 D-023은 하단 탭 라벨 13px을 명시한다. 추천은 전역 확대를 하지 않는 것이다. 실측은 13px 미만 0, 본문 토큰 16px, 44px 미만 누름 0, 가로 overflow 0이다.
- CI: `.github/workflows/ci.yml`의 `e2e-v2-social`은 staging 환경, 결제 설정 복구, 로그 artifact 보관이 구성돼 있어 수정하지 않았다. 지시대로 CI는 실행하지 않았고 G4-QA-01은 current commit 실행 증거가 생길 때까지 FAIL 유지다.

# 회장께 물을 것

- 이번 턴에는 없음. GitHub Actions는 기존 `onprem-114` self-hosted runner와 로컬 secret wrapper를 사용하도록 교정했다. Kakao와 Toss의 외부 계정 인증 경계는 별도 질문으로 Goal을 멈추지 않고, 회장 없이 가능한 항목을 끝까지 진행한다.

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
