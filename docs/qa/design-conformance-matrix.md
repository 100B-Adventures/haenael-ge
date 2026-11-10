# 해낼게 V2 디자인 정합 매트릭스 (Design Conformance Matrix)

| 표지 | 값 |
|---|---|
| 문서 버전 | v2.1.23 (2026-11-11, F-9 최종 source 실측. `26 일치 / 0 불일치 / 0 미확인`) |
| 작성 시각 | 2026-11-11 F-9 최종 staging 6경로×9폭 재관찰. 이전 판정 근거 시각은 이력에 보존 |
| 작성자·모델 | 기존 판정: qa-verifier / Claude Opus 5.5. F-9 수정·증거 정합: code-builder / GPT-5 Codex |
| 파이프라인 | 라인 `v2`, `current_stage: qa`, 독립 qa 승인 줄 미작성 |
| 제품 source | `ad7dce4376cd77d5e840cd3192e138d4bed7a7e1` (staging 별칭·immutable URL health `sourceSha` 일치) |
| staging | `https://haenael-ge-v2-staging-100-b.vercel.app` |
| 승인 시안 핀 | `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0, SHA-256 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a` (`pipeline-state.v2.md:52`). 작업트리 파일 SHA 는 다르다. [O-1](#open) 참조 |
| 독립 판정 | F-9 builder 수정·실측 완료, 독립 qa 재승인 대기. 기존 FAIL 판정 원본은 보존 |

## 목차 <a id="toc"></a>

1. [요약](#summary)
2. [목적·범위·참고 기준](#scope)
3. [용어](#terms)
4. [수용 조건](#acceptance)
5. [검증 결과](#results)
6. [화면별 판정표 26행](#screens)
7. [추적성: 결정 → 시안 화면 → 관찰 → 회귀](#trace)
8. [출고 기준과 보장 범위](#gate)
9. [증거와 경로 해석](#paths)
10. [한계와 오픈 이슈](#open)
11. [과거 회차 이력](#history)
12. [개정 이력](#revisions)

## 1. 요약 <a id="summary"></a>

**현재 builder 판정(최종 source `ad7dce4`): `26 일치 / 0 불일치 / 0 미확인`. F-9에서 13px 미만 리터럴을 제거하고 44px 누름 하한을 보정했다. 최종 staging의 `/onboarding`, `/me`, `/friends`, `/my`, `/g/<slug>`, `/cashout` 6경로×9폭은 54/54에서 글자·누름·눌림 상태·가로 넘침 위반 0이고, `/me` 고아 줄바꿈 표적 계약도 1/1 PASS다. 독립 qa 승인 줄은 작성하지 않았다.**

**최종 source 재검증(source `ad7dce4`)**: staging 별칭과 immutable URL의 health `sourceSha`가 일치한다. Vitest `553/553`, 디자인 토큰 검사 신규 위반 0, 6경로×9폭 `54 measurements / 0 violations / 0 console errors / cleanup zero`, `QA-TC-SP-04` 표적 계약 `1 expected / 0 unexpected / cleanup zero`다. source `b772642` 전체 회귀 1차는 `ERR_NETWORK_CHANGED` 1건, 허용된 재실행은 `/me`의 14px 고아 줄바꿈 1건 때문에 각각 44/45였다. source `ad7dce4`에서 해당 문장을 균형 줄바꿈으로 보정한 뒤 표적 계약으로 해소했으며, 반복 상한에 따라 최종 SHA 전체 45건은 재실행하지 않았다. 근거는 `.goal/runs/w12-f9-ad7dce4/`, `.goal/runs/w12-f9-ergonomics-ad7dce4/`, `.goal/runs/w12-f9-sp04-ad7dce4/`, `.goal/runs/w12-regression-b772642{,-r2}/`이다.

## 2. 목적·범위·참고 기준 <a id="scope"></a>

- **목적**: 승인 시안 26화면의 기존 판정을 보존하면서 최종 source `ad7dce4`의 F-9 앱 전역 13px 최소 글자·44px 누름·눌림 상태·가로 넘침·고아 줄바꿈 증거를 연결한다.
- **범위 안**: 26화면 판정표, `web/src` 13px 미만 리터럴, Vitest·디자인 토큰 검사, 6경로×9폭 실측, 고아 줄바꿈 표적 계약, 허용된 전체 회귀 2회, 결제 플래그 원복과 fixture 정리.
- **범위 밖**: 실제 Toss 승인 호출, 운영 환경, 비 Chromium 브라우저, 성능·부하·보안, 독립 qa 승인.
- **대조 소스 4종**: 회장 요청·결정은 `wiki/거버넌스/결정.md` D-050~D-053과 F-7 원문 `.goal/verify-20261110-1252.md`, PRD는 `docs/plan/prd-haenael-ge-v0.4.0.md`, 화면·플로우는 `DESIGN.md`와 승인 시안 `docs/design/prototypes/social-viral-loop-v3-opus5.html`, 수치 규격은 `docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md`와 `standard-design.md` §17.3이다. W-12 현재 변경은 cashout 3상태에 한정하고 나머지 25화면은 제품 diff가 없어 기존 직접 관찰 판정을 승계한다.
- **참고한 보고서 구성(2026-11-09 조회)**:
  - GitLab 단위 시험 보고서([docs.gitlab.com](https://docs.gitlab.com/ci/testing/unit_test_reports/)): 요약 건수를 먼저 보이고 실패 건마다 이름·파일·오류·스크린샷 첨부를 상세로 연결하는 방식, 기준 브랜치 대비 "새 실패·해소된 실패" 구분을 차용했다. 이 문서의 [§1](#summary) 건수 우선과 [§11](#history) 614c949 대비 해소 기록이 그것이다. JUnit XML 첨부 태그 방식은 채택하지 않았다(우리 증거는 파일 경로 표).
  - Playwright 보고자([playwright.dev](https://playwright.dev/docs/test-reporters)): 실행 하나를 객체 하나로 기술하는 JSON 보고와, 첨부 파일을 별도 디렉터리에 두고 기준 경로로 찾게 하는 구조를 차용해 [§9](#paths) 경로 root 표를 두었다. HTML 보고서·blob 병합은 이번 문서에 채택하지 않았다. 해당 페이지는 JSON 내부 필드 구조를 설명하지 않아 필드 이름은 인용하지 않는다.

## 3. 용어 <a id="terms"></a>

| 용어 | 뜻 |
|---|---|
| 일치 | 방향·순서·열·정렬·표시 요소·위계가 시안과 같음. fixture 데이터 차이는 불일치로 세지 않음 |
| 불일치 | 위 축 중 하나 이상이 시안과 다름 |
| 범위 제외 | 결정 대기로 이번 판정 분모에서 뺀 항목. PASS 아님 |
| 증거 재사용 | 이번 source diff 가 그 화면 UI 를 바꾸지 않아 직전 source 의 직접 캡처 판정을 그대로 쓰는 것 |
| fixture | 시험용으로 만들고 실행 후 지우는 계정·목표·결제 데이터 |

## 4. 수용 조건 <a id="acceptance"></a>

| ID | Given / When / Then |
|---|---|
| AC-1 | Given 최종 source `8cb7b41` exact staging, When 누적 회귀를 retries 0으로 단일 실행, Then `45 expected / 0 unexpected / 0 flaky / 0 skipped`, Playwright와 전체 실행 EXIT 0 |
| AC-2 | Given 실제 `DONE` 결제, When `paysuccess`·`dopamine` 을 390·1024·1440 에서 열고 CTA 를 누름, Then HTTP 200·overflow 0·console error 0·오류 문구 0, 성공과 성장이 분리되고 시안 구조와 같음 |
| AC-3 | Given 16e483d diff 가 결제 성공 범위로 한정, When 나머지 23화면 판정, Then 직전 직접 PNG 근거 재사용을 경로와 함께 명시 |
| AC-4 | Given `cashout` staging 관찰과 2026-08-30 core 판정, When 분모 집계, Then `cashout`을 구조·순서 일치로 포함해 `26/0/0` |
| AC-5 | Given 실행 종료, When fixture 정리, Then 결제 플래그 복구(HTTP 503)와 fixture 잔존 0 |
| F-6 | Given 시험 키 4종과 최종 source `e5b65f1` staging, When 허용 신청·중복·허용 밖 거부와 계좌 입력 폼 9폭 측정, Then 신청 `REQUESTED`·마스킹·원문 0·`CASHOUT_HOLD`, 중복·허용 밖 거부, 3축 위반 0, fixture 잔존 0 |
| F-7 | Given 최종 source `8cb7b41` staging의 계좌 입력 폼과 실제 `REQUESTED` 상태·내역, When 측정기 동일 선택자로 9폭씩 측정, Then 글자·본문 토큰·탭 크기·눌림 상태·넘침 기준을 모두 통과하고 폭별 캡처와 fixture 정리 증거가 남음 |
| F-9 | Given 최종 source `ad7dce4` staging, When 6경로를 9폭으로 실측하고 고아 줄바꿈 계약을 실행, Then 13px 미만 글자·44px 미만 누름·눌림 상태 미달·가로 넘침·콘솔 오류·28px 미만 고아 줄바꿈이 0이고 fixture 잔존이 0 |

## 5. 검증 결과 <a id="results"></a>

| AC | 결과 | 증거 등급 | 원본 |
|---|---|---|---|
| AC-1 | 충족, 45/45, Playwright·전체 실행 EXIT 0, 466.8초 | 테스트됨 | `.goal/runs/w12-regression-8cb7b41/{report.json,playwright.exit,run.exit,health.json}` |
| AC-2 | 충족, 2화면 × 3폭 = 6쌍 일치 | 관찰됨(원 세션) | `.goal/runs/g7-independent-192x/` PNG 12장 + `observations.json` |
| AC-3 | 충족, 23화면 재사용 | 근거 확인 | `.goal/verify-20261109-192x.md:33` (diff 7파일 목록) |
| AC-4 | 충족, `26 일치 / 0 불일치 / 0 미확인` | 관찰됨·근거 확인 | `.goal/runs/w12-staging-20261110/`, `.goal/runs/w12-ergonomics-73d08c7/`, `.goal/verify-20261110-0358.md` §3 |
| AC-5 | 충족, 결제 플래그 HTTP 503, 회귀·실측 fixture 잔존 0 | 관찰됨 | `.goal/runs/w12-regression-8cb7b41/{payment-restore.http,execution.log}`, `.goal/runs/w12-ergonomics-8cb7b41/observations.json` |
| F-6 | builder 해소, 독립 qa 재승인 대기 | 관찰됨·테스트됨 | `.goal/runs/w12-f6-deploy-e5b65f1/`, `.goal/runs/w12-f6-verify-e5b65f1/{observations.json,verify.log}` |
| F-7 | builder 해소, 27/27 4축 PASS, 눌림 상태 100% | 관찰됨·테스트됨 | `.goal/runs/w12-f7-deploy-8cb7b41/`, `.goal/runs/w12-regression-8cb7b41/`, `.goal/runs/w12-ergonomics-8cb7b41/{observations.json,measure.log,*.png}` |
| F-9 | builder 해소, 54/54 4축 PASS, 고아 줄바꿈 1/1 PASS, fixture 잔존 0. 최종 SHA 전체 45건은 반복 상한으로 미실행 | 관찰됨·테스트됨 | `.goal/runs/w12-f9-ad7dce4/`, `.goal/runs/w12-f9-ergonomics-ad7dce4/`, `.goal/runs/w12-f9-sp04-ad7dce4/`, `.goal/runs/w12-regression-b772642{,-r2}/` |

## 6. W-12 현재 변경 8열 판정표 <a id="screens"></a>

현재 source에서 바뀐 범위는 신청 폼의 눌림 상태다. 아래 표는 `pipeline/product-lane.yaml`과 `approve` QA 게이트의 8열 규격으로 행동과 수치를 양방향 판정한다. 판정 `✅`는 staging 실화면 HTTP 200, 시험 키, 실제 데이터 상태, 폭별 캡처가 모두 있는 행에만 썼다. 미검증 행은 0개다.

| 화면 | 상태 | 행동 명세 | 행동 구현 | 수치 규격 | 수치 구현 | 판정 | 다른 점과 이유 |
|---|---|---|---|---|---|---|---|
| `/cashout` | 계좌 입력 신청 폼 노출, 허용 회원, 잔액 40클로버 | 입력·select·label·링크·신청 버튼은 탭과 눌림 피드백을 제공 | 측정기 선택자 대상 13개 모두 `:active` 규칙 적용, 폼 입력과 신청 CTA 노출 | 360·390·412·600·700·780·820·900·1000px, 글자 13px 이상, 본문 16px 이상, 탭 44px 이상, 눌림 90% 이상, 넘침 0 | 9/9에서 `font_below_13=0`, `token_body_px=16`, `tap_below_44=0`, `active_ratio=100%`, `overflow_x=false` | ✅ 구현·실동작 | 승인 시안보다 수수료·환전량·전화번호·암호화 안내가 추가된 기존 core 판정을 승계. 이번 변경은 눌림 상태만 추가 |
| `/cashout/status` | 실제 `REQUESTED` 상세, 마스킹 계좌·금액·진행 단계 노출 | 접수 상태와 진행 단계, 홈·재신청 행동이 실제 데이터로 보임 | 시험 fixture `REQUESTED` #769, 마스킹 계좌와 34,426원, 진행 단계 렌더 | 같은 9폭과 4축 기준, 상태 화면 캡처 폭별 1장 | 9/9에서 글자·탭 미달 0, 본문 16px, 눌림 100%, 넘침 0 | ✅ 구현·실동작 | 시안 대비 fixture 값만 다름 |
| `/cashout/history` | 실제 `REQUESTED` 내역 1건 | 요약 3칸, 진행 중 행, 환전 화면·홈 이동이 실제 데이터로 보임 | 시험 fixture 진행 중 1건, 마스킹 계좌와 34,426원 렌더 | 같은 9폭과 4축 기준, 내역 화면 캡처 폭별 1장 | 9/9에서 글자·탭 미달 0, 본문 16px, 눌림 100%, 넘침 0 | ✅ 구현·실동작 | 시안 대비 fixture 날짜·금액만 다름 |

근거: `.goal/runs/w12-ergonomics-8cb7b41/{observations.json,measure.log,cashout-*-*.png,contact-*.png}`. 제품 diff가 없는 나머지 25화면의 판정은 아래 26행 증거 상세과 기존 직접 캡처를 승계한다.

### 6.1 화면별 증거 상세 26행 <a id="screens-detail"></a>

경로 접두어(`direct-captures/` 등)의 실제 root 는 [§9](#paths) 에 있다. 모든 경로는 저장소 루트 기준이다.

| 화면 ID | 폭·속성별 실제 관찰 | 판정 | 증거·후속 위치 |
|---|---|---|---|
| `admin` | 390·768·1024·1440. 운영 경보 36건을 삭제하지 않고 상세는 `aria-expanded=false`, 직접 클릭 뒤 `true`와 현재 fixture 상세를 관찰 | 일치 | `direct-captures/admin-{390,768,1024,1440}.png`, `observations.json` |
| `bannerupload` | 390·768·1024·1440. 빈 보관함 상태, 불투명 배경 `rgb(251,250,247)`가 viewport 전체 폭을 덮음. 390에서 사진 2장 선택·선택 변경·세로 위치 76·crop·쓰기 뒤 서버 `REVIEW` 관찰 | 일치 | `direct-captures/bannerupload-*-empty.png`, `bannerupload-390-selected-review.png`, `targeted-observations.json` |
| `belong` | 390·1024·1440. 관계 배지·아바타·수치는 fixture 차이이며 관계 해제는 D-026 기능이다. 방향·순서·위계는 승인본과 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `business` | 390·1024·1440. 6행·순서·법적 고지 블록 유지. 데스크톱 전체 폭 확장은 DESIGN 데스크톱 가용 폭 100% 결정 | 일치 | 이전 3폭 좌우 대조와 UI 불변 diff 근거 |
| `cashhistory` | 390·768·1024·1440. compact 요약 3칸, 거래 행, 세금 고지, 환전·홈 동작 순서가 승인본과 같고 fixture 금액·건수만 다름 | 일치 | `direct-captures/cashhistory-{390,768,1024,1440}.png` |
| `cashout` | source `e5b65f1`에서 누름 크기는 해소됐지만 신청 폼의 눌림 상태가 23%라 F-7이 됐다. 최종 source `8cb7b41`은 측정기와 같은 선택자의 label·input·select·링크·버튼에 토큰 기반 눌림 상태를 적용했다. 계좌 입력·은행 선택·신청 버튼이 보이는 360·390·412·600·700·780·820·900·1000px 폼에서 13px 미만 글자 0, 본문 토큰 16px, 44px 미만 누름 0, 눌림 상태 100%, 가로 넘침·콘솔 오류 0이다. 390px 승인 시안과 최종 화면의 제목, 금액 요약, 은행·계좌·예금주 폼, 신청 버튼 핵심 순서는 유지되지만 픽셀 동일하지 않다. 새 헤더, 모인 클로버 분해, 수수료·세금 설명, 환전량, 전화번호, 암호화 안내는 기존 core 판정을 승계한다 | **일치(구조·순서. 추가 요소는 2026-08-30 core 판정 승계, 시안 승격은 디자인 갱신 과제로 이관)** | 시안 `docs/design/prototypes/clean-frames/social-viral-loop/cashout.png`, 최종 `.goal/runs/w12-ergonomics-8cb7b41/{cashout-form-390.png,contact-form.png,observations.json}`, 배포 `.goal/runs/w12-f7-deploy-8cb7b41/`, 제품 `8cb7b41` |
| `cashstatus` | 390·768·1024·1440. 상단 상세 헤더, 접수 hero, 세로 3단계, 금액·잔액·알림·홈 순서가 승인 계약과 같음 | 일치 | `direct-captures/cashstatus-{390,768,1024,1440}.png` |
| `connect` | 390·1024·1440. 실제 초대 수락 fixture 뒤 `윤도경님이 초대를 받고 들어왔어요` 확인 상태를 촬영. 승인 수락 후 상태와 방향·순서·위계가 같음 | 일치 | `direct-captures/connect-{390,1024,1440}-accepted.png` |
| `coverage` | 제품 `page.tsx` route 24개와 승인 시안 coverage 표 24행을 코드·문서로 확인. landing 캡처를 근거로 쓰지 않음 | 일치 | `find web/src/app -name page.tsx`=24, 승인 시안 표=24 |
| `dopamine` | 390·1024·1440. source `16e483d` staging 실제 DB `DONE` 3건. 성공 화면에서 `친구 목표로 돌아가기` 클릭 뒤 성장 상태로 전환(성공 상태 0). 뒤로가기 header·목표 문맥 kicker·커버 이미지 decode 완료·성장 워드맵(단어 11개, 영역 밖 0)·누적 `17개`·방금 보낸 말 `끝까지 응원할게`·녹색 `조용히 응원하기` CTA(`/g/<slug>#cheer` 이동, 응원 영역 표시)·하단 4탭, overflow 0, console error 0. 사진·목표명·단어 수·`서연` 이름은 fixture·시안 예시 데이터 차이(공개 목표 화면도 소유자 이름을 쓰지 않음). 1440px 시안의 어두운 바깥 여백은 프로토타입 무대 배경으로 보고 표현 차이로 기록 | 일치 | `.goal/runs/g7-independent-192x/{paysuccess,dopamine}-{staging16e,pair16e}-{390,1024,1440}.png`, `observations.json` |
| `friends` | 직전 390·1024·1440 시안 대조를 재사용하고 최신 source의 390px 쓰기 fixture를 추가 관찰. 친구 1명, 목록 손님 과거 응원 섹션 0, 빈 초대 카드 0, 회원 간 상세 이력 2건(보냄 1·받음 1), MY 받은 응원의 손님 상세, 홈 응원 합계 12를 확인. 11건의 손님 원시 행과 MY RPC 11건은 상단 SQL rollback 근거로 구분 | 일치 | 직전 3폭 `direct-captures/friends-*`, 최신 `.goal/runs/g7-final-qa-20261109/friend-preservation/{friends-390,friend-detail-history-390,my-received-390}.png`, `observations.json` |
| `goaldetail` | 제목·금액·응원 단어·응원자 수는 fixture 차이이고 승인 viewport 아래 관리 기능은 D-049 기능이다. 핵심 배치·위계는 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `goalpublic` | 커버·WHY·응원 집계·워드맵·CTA의 방향·순서·위계가 같음. fixture 내용 차이는 불일치로 세지 않음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `home` | 390·768·1024·1440. 목표 3개, 바깥 중복 상세 버튼 0, fixed nav 표시. `/me?q`는 `/me/goal/3811?q`로 리다이렉트되어 일치 검색 card 1개와 고유 empty status `검색 결과가 없어요.`를 관찰 | 일치 | `direct-captures/home-*.png`, `home-search-{match,empty}-390.png`, `observations.json` |
| `how` | 390·1024·1440. 동의 모달 0, 평문 3단계, 단일 CTA `나도 시작하기`, CTA `/onboarding`, overflow 0을 승인본과 동일 상태로 확인 | 일치 | `comparison-captures/how-{390,1024,1440}-pair-clean.png`, `observations.json` |
| `inviteaccept` | 커버·아바타·초대 문구·로그인 수락 CTA의 방향·순서·위계가 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `landing` | 390·768·1024·1440에서 동의 모달 0. 로고·설명·워드맵·CTA·보조 링크·하단 탭의 방향·순서·위계가 승인본과 같음 | 일치 | `direct-captures/landing-{390,768,1024,1440}.png` |
| `login` | 390·1024·1440. 실제 저장 맥락 sheet에서 기본 제목 `로그인하고 이어가기`, 작성 목표 제목, 로그인 뒤 작성 내용 보존 안내, Kakao CTA·법적 링크를 확인. generic 기본 부제는 승인본 `카카오로 3초 만에 시작해요`와 제품 시험이 동일하며 저장 맥락 변형과 구분 | 일치 | `comparison-captures/login-saved-{390,1024,1440}-pair-clean.png`; prototype:2772~2773, `LoginSheet.test.tsx:78~86` |
| `mypage` | 계정·법적 목록은 D-040 필수 기능이며 프로필·활동·응원 탭의 방향·순서·위계가 승인본과 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `mywordmap` | 390·768·1024·1440. `응원 워드맵` 헤더, D-30·진행 중·실제 목표·22명·실제 단어 읽기 카드가 먼저 오고 이미지 저장·인스타·링크 복사는 아래에 있음 | 일치 | `direct-captures/mywordmap-{390,768,1024,1440}.png`, `observations.json` |
| `onboarding` | 390·768·1024·1440. 공부·시험 preset 직접 선택 뒤 `aria-pressed=true`, 이미지 decode 완료·`naturalWidth>0`; 승인 문구·필드·배너·CTA 위계 일치 | 일치 | `direct-captures/onboarding-{390,768,1024,1440}.png`, `observations.json` |
| `payfail` | 390·768·1024·1440. 전체페이지 상단 피드백, 오류 icon·제목·설명과 `해낼게 홈으로` 링크를 직접 확인 | 일치 | `direct-captures/payfail-{390,768,1024,1440}.png` |
| `paysuccess` | 390·1024·1440. source `16e483d` staging 실제 DB `DONE` 재조회 HTTP 200, 제목 `응원이 전달됐어요`, 목표명 문구, `친구 목표로 돌아가기` 주 버튼·`해낼게 홈으로` 보조 링크, 같은 화면의 성장 overlay 0(성공과 성장 분리), 오류 문구 0, overflow 0. 차이는 icon 글리프 표시와 버튼 그림자 강도(표현) | 일치 | `.goal/runs/g7-independent-192x/{paysuccess,dopamine}-{staging16e,pair16e}-{390,1024,1440}.png`, `observations.json` |
| `privacy` | D-040에 따른 법적 전문·목차·소유 화면을 보존했다. prototype 짧은 예문은 전문 삭제 요구가 아님 | 일치 | 기존 390·1024·1440 대조와 D-040 근거. UI 불변 diff |
| `status` | 390·768·1024·1440. `업적` 제목, hero, 통계, 진행률, 사진 메달 6개, 마이 탭 활성과 실제 4/6 상태를 확인 | 일치 | `direct-captures/status-{390,768,1024,1440}.png`, `observations.json` |
| `terms` | D-040에 따른 법적 전문·목차·소유 화면을 보존했다. prototype 짧은 예문은 전문 삭제 요구가 아님 | 일치 | 기존 390·1024·1440 대조와 D-040 근거. UI 불변 diff |

## 7. 추적성: 결정 → 시안 화면 → 관찰 → 회귀 <a id="trace"></a>

| 결정 | 시안 화면(id) | 이번 원본 관찰·캡처 | 회귀 summary 시험 |
|---|---|---|---|
| D-050 친구 상세 이력·손님 응원 위치 | `friends`(prototype:2210), `mypage`(prototype:2371) | 재사용: `.goal/runs/g7-final-qa-20261109/friend-preservation/{friends-390,friend-detail-history-390,my-received-390}.png`(source 614c949), 3폭 대조 `.goal/runs/g7-friend-d050-qa-20261109/direct-captures/friends-*` | `G4-FRIEND-HISTORY-01`, `QA-TC-FD-03`, `PW-06` expected (`summary.md:45,48,50`) |
| D-051 결제 성공·성장 시안대로 | `paysuccess`(prototype:2810), `dopamine`(prototype:2631) | 이번 직접: `.goal/runs/g7-independent-192x/{paysuccess,dopamine}-{staging16e,pair16e}-{390,1024,1440}.png`, `observations.json` | `SMOKE-01`, `QA-TC-SP-03`(고정 CTA, `#cheer` 진입) expected (`summary.md:13,27`) |
| D-052 16e483d 최종 범위·W-12 제외(과거) | `cashout`(prototype:2844) 범위 제외 | 로컬 대체 근거 `.goal/g7-cashout-local-final.summary.md` (staging 일치로 승격 안 함) | 전체 45건 `summary.md`, 독립 판정 `.goal/verify-20261109-192x.md` |
| D-053 격리 staging 환전 신청 검증(현재) | `cashout`(prototype:2844) 일치 | `.goal/runs/w12-ergonomics-8cb7b41/` 실제 신청 폼 9폭, `REQUESTED` 상태·내역 18폭, 캡처 27장 | 최종 source `8cb7b41` 전체 회귀 45/45, 3경로 ergonomics 27/27 4축 PASS, 눌림 100%, 결제 플래그 원복·fixture 정리. 독립 qa 재승인 대기 |

**증거 재사용 이유**: 16e483d diff 는 e2e spec, `payment/success` 3파일, 결제 범위 CSS 선택자, `/g/[slug]` 고정 CTA `id="cheer"` 1개다(`.goal/verify-20261109-192x.md:33`). 23화면 UI 코드는 바뀌지 않았으므로 직전 직접 캡처 판정을 재사용했다. 이는 사용자 승인된 영향 범위 판단이며 누락이 아니다. `/g/[slug]` 는 회귀 45건과 `#cheer` 이동 관찰로 확인했다.

## 8. 출고 기준과 보장 범위 <a id="gate"></a>

| 출고 필수 항목 | 충족 여부 | 실제 관찰 | 증거 |
|---|---|---|---|
| W-12 환전 신청 happy + edge(현재) | builder 증거 충족 | 시험 키 포함 staging health `sourceSha=8cb7b41`. F-6 쓰기 경로 관찰은 유지되고 F-7 화면 수정 뒤 전체 회귀로 기능 회귀를 확인 | `.goal/runs/w12-f7-deploy-8cb7b41/`, `.goal/runs/w12-regression-8cb7b41/` |
| 이번 기능 happy + edge(과거 16e483d) | 충족 | 홈 검색 일치·0건, 사진 선택·crop·업로드 `REVIEW`, 환전 읽기, 업적·워드맵·관리자 접힘을 staging에서 실제 조작 | [§6](#screens), `.goal/runs/g7-independent-192x/observations.json` |
| 최종 source 누적 regression | builder 증거 충족 | source `8cb7b41` exact staging 단일 실행 `45 expected / 0 unexpected / 0 flaky / 0 skipped`, Playwright·전체 실행 EXIT 0, 466.8초 | `.goal/runs/w12-regression-8cb7b41/{report.json,playwright.exit,run.exit,health.json}` |
| 환전 3경로 ergonomics | builder 증거 충족 | 계좌 입력 `/cashout` 폼 9폭, `REQUESTED detail` `/cashout/status` 9폭, `REQUESTED history row` `/cashout/history` 9폭. 27/27 모두 글자 미달 0, 본문 16px, 탭 미달 0, 눌림 100%, 넘침 0, 콘솔 오류 0. 폭별 캡처 27장 직접 확인 | `.goal/runs/w12-ergonomics-8cb7b41/{observations.json,measure.log,cashout-*-*.png,contact-*.png}` |
| 디자인 QA | builder 증거 충족 | `26 일치 / 0 불일치 / 0 미확인`. cashout은 구조·순서 일치이며 추가 5요소는 2026-08-30 core 판정을 승계 | [§6](#screens), `.goal/verify-20261110-0358.md` §3 |

이 QA 문서가 보장하는 것은 source `8cb7b41` exact staging에서 전체 회귀 45/45, 신청 폼·상태·내역 27폭 4축 위반 0과 눌림 100%, 결제 플래그 HTTP 503 원복, fixture 잔존 0이며 디자인 분모가 `26/0/0`으로 정합됐다는 builder 증거다. 보장하지 않는 것은 실제 Toss 승인 호출, 운영 환경, 비 Chromium 브라우저, 독립 qa 승인과 단계 승격이다.

## 9. 증거와 경로 해석 <a id="paths"></a>

판정표의 짧은 접두어는 아래 root 로 해석한다. 각 root 는 2026-11-09 19:53 KST 에 `ls` 로 존재를 확인했다.

| 판정표 표기 | 실제 root (저장소 루트 기준) | 촬영 source | 해당 행 |
|---|---|---|---|
| `direct-captures/` | `.goal/runs/g7-surf-post-remediation-20261108/direct-captures/` (PNG 54 + JSON 2) | `4b15cd88` | admin·bannerupload·cashhistory·cashstatus·connect·home·landing·mywordmap·onboarding·payfail·status |
| `direct-captures/friends-*` | `.goal/runs/g7-friend-d050-qa-20261109/direct-captures/` | D-050 QA 회차 | friends |
| `comparison-captures/` | `.goal/runs/g7-surf-confirmation-qa-20261108/comparison-captures/` | `2784ba28` | how·login |
| `observations.json`(결제 행) | `.goal/runs/g7-independent-192x/observations.json` | `16e483d` | paysuccess·dopamine |
| `targeted-observations.json` | `.goal/runs/g7-surf-post-remediation-20261108/direct-captures/targeted-observations.json` | `4b15cd88` | bannerupload |

"현 source 회귀 캡처와 이전 1024 좌우 대조 재사용" 행(belong·business·goaldetail·goalpublic·inviteaccept·mypage)은 개별 PNG 경로가 판정표에 없다. 이번 보완에서 새로 찾아 붙이지 않았다([O-2](#open)).

## 10. 한계와 오픈 이슈 <a id="open"></a>

| ID | 내용 | 영향 | 소유 |
|---|---|---|---|
| O-1 | 승인 시안 핀 SHA `afca1c03…`(커밋 `7ecfb55`) 와 작업트리 파일 SHA `5956191b…`(커밋 `3142e9a` "reconcile approved social surfaces" 에서 변경)가 다르다. 3142e9a 이후 대조는 변경된 파일 기준일 수 있다 | 판정 기준 시안 버전 불명확. 제품 판정을 바꾸지 않고 기록만 한다 | 컨트롤러: 핀 갱신 또는 재대조 결정 |
| O-2 | 재사용 6행의 개별 PNG 경로 미기재 | 제3자가 해당 행 원본을 바로 열 수 없음 | 다음 QA 회차 |
| O-3 | F-7 builder 증거는 최종 source `8cb7b41`에서 정합됐다. 독립 qa 승인 줄은 작성하지 않았다 | 독립 qa 재판정 전 단계 승격 없음 | 컨트롤러: 독립 qa 재검증·게이트 판정 |
| O-4 | 실제 Toss 승인 호출·운영·비 Chromium 미검증 | 보장 범위 밖 | 회장 지정 시 |
| O-6 | 2026-11-09 19:5x 문서 보완 중 1024 pair 2장(`.goal/runs/g7-independent-192x/{paysuccess,dopamine}-pair16e-1024.png`)을 Read 로 직접 대조했다. `paysuccess`: 시안은 내용이 상단 정렬, staging 은 viewport 세로 중앙 정렬이고 아이콘 원 안 글리프 유무가 다르다. `dopamine`: 시안 CTA 아래 안내 박스("보낸 응원이 워드맵에 쌓였어요…")가 staging 1024 프레임에는 보이지 않는다(스크롤 밖인지 미확인). 독립 판정의 `일치`는 바꾸지 않았다 | 정렬 축·표시 요소 축 차이 후보. 표현 편차인지 계약 누락인지 판정 필요 | 컨트롤러: 재판정 또는 회장 수용 확인 |
| O-7 | 최종 source `ad7dce4`의 6경로×9폭과 고아 줄바꿈 표적 계약은 PASS지만, 전체 45건은 source `b772642`에서 허용된 2회까지만 실행했다 | 최종 SHA 누적 회귀는 독립 qa에서 재확인 필요 | 컨트롤러: 독립 qa 재검증 |

## 11. 과거 회차 이력 (판정 효력 없음) <a id="history"></a>

> 아래는 이전 source 의 기록이다. 현재 판정은 §1·§5·§6 만이다.

- source `614c9490ac6810cb3230da0b0287c863ef2d0d84`(2026-11-09 최종 동결 QA): D-051에 따라 실제 `DONE` 결제 상태를 390·1024·1440px에서 대조해 `paysuccess`·`dopamine`을 배치·표시 요소 차이로 `불일치` 판정했고, 분모는 `일치 23 / 불일치 2 / 미확인 1`, 누적 회귀는 `44 passed / 1 failed / 0 flaky`, EXIT 1이었다. 근거 `.goal/runs/g7-final-qa-20261109/`. 이 실패는 16e483d에서 해소됐고 이력으로 보존한다.
- source `78c401d`: 87폭 수집은 완료했지만 데스크톱 전체 폭·fixture·법적 전문·coverage를 오대조해 `2 일치 / 19 불일치 / 5 미확인`으로 잘못 집계했다.
- source `3142e9a`: 홈 검색 접힘과 사진·워드맵 기능 누락을 재발견했고 독립 시각 감사가 진짜 결함·오대조·재캡처 항목을 재분류했다.
- source `c2eb2f6`: 390px 26/26·1024px 22/26만 회수되어 미완으로 종료했다.

## 12. 개정 이력 <a id="revisions"></a>

| 버전 | 시각(KST) | 변경 | 작성 |
|---|---|---|---|
| v2.1.23 | 2026-11-11 | F-9 최종 source `ad7dce4` staging health 일치, 13px 미만 리터럴 0, Vitest 553/553, 디자인 토큰 신규 0, 6경로×9폭 54/54 위반 0, 고아 줄바꿈 계약 1/1 PASS를 표지·§1·§4·§5에 연결. 전체 회귀 2회 44/45와 최종 SHA 전체 회귀 미실행을 O-7에 기록. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.22 | 2026-11-11 | 최종 source `07a0075` 기준으로 표지·§1을 갱신. staging health SHA 일치, 회귀 r3 45/45, 환전 3경로 27폭 위반 0, staging·운영 결제 503을 연결. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.21 | 2026-11-10 | F-7 눌림 상태를 최종 source `8cb7b41`에서 해소. 시험 키 포함 staging health SHA 일치, 회귀 45/45, 신청 폼·상태·내역 27폭 4축 위반 0과 눌림 100%, 폭별 캡처 27장, fixture 잔존 0을 연결. 현재 W-12 범위를 8열 양방향 판정표로 보강. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.20 | 2026-11-10 | 최종 source `e5b65f1` exact staging 전체 회귀 45/45, 결제 플래그 HTTP 503 원복, `/cashout/status`·`/cashout/history` `REQUESTED` 화면 18/18 3축 위반 0, 390px 캡처와 fixture 정리 증거를 §1·§4·§5·§7·§8에 연결. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.19 | 2026-11-10 | cashout 승인 시안 390px와 최종 staging 실제 폼 390px를 직접 대조. 핵심 구조·순서 승계와 픽셀 비동일, 추가 요소를 함께 기록. 기존 특수 판정과 분모는 변경하지 않음 | code-builder / GPT-5 Codex |
| v2.1.18 | 2026-11-10 | F-6 실제 신청 폼 기준으로 표지·요약·범위·cashout 행·D-053 추적·§8을 정합. `73d08c7` 재배포에서 touch target 6개를 발견하고 `e5b65f1`로 수정·재배포했다. 신청·중복·허용 밖 거부, 폼 9폭 3축 위반 0, fixture 잔존 0. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.17 | 2026-11-10 | 최종 source `73d08c7` 기준으로 표지·현재 요약·cashout 행·D-053 추적·§8을 정합. 회귀 45/45, ergonomics 27/27 PASS, 디자인 `26/0/0`. 독립 qa 승인 줄 미작성 | code-builder / GPT-5 Codex |
| v2.1.16 | 2026-11-09 21:5x | 후속 재채점(15/25) 지적 보정: 표지·§1 에 현재(W-12 FAIL·25/0/1 미확인)와 과거 16e483d 근거 분리, `cashout` 행 과거 POST 200 과 현재 POST 0건 분리, §7 D-053 행, §8 W-12 행 추가, 자가채점 블록 버전 명시. 판정·시험 원본 변경 없음 | qa-verifier / Claude Opus 5.5 |
| v2.1.15 | 2026-11-09 21:3x | W-12 승인 요건 판정 반영: `cashout` 행 미확인(로컬 통합 실패로 staging 반영 보류), §1 분모 `25/0/1 미확인`, 범위·AC-4·O-3 을 D-053 기준으로 갱신. 16e483d 판정·이력 보존 | qa-verifier / Claude Opus 5.5 |
| v2.1.13 | 2026-11-09 19:53 | 표지·목차·범위·용어·수용 조건·추적성·경로 root·오픈 이슈(O-1 시안 SHA 불일치 발견)·개정 이력 추가. 판정·행 변경 없음 | qa-verifier / Claude Opus 5.5 |
| v2.1.12 | 2026-11-09 19:5x | source 16e483d 독립 판정 반영, paysuccess·dopamine 일치, 25/0/1 | qa-verifier / Claude |
| v2.1.11 이전 | 2026-11-08~09 | [§11](#history) 회차별 기록 | GPT-5 Codex |

기반 포맷: 이 파일 v2.1.12 판정표와 `standard-doc-review.md` §5.1·§8 FDD 골격(명시 앵커)을 계승했다.

SKILLS_USED: haenael-supabase-build — 최종 source·staging·회귀·ergonomics 증거 정합에 적용
SKILLS_SKIPPED: qa·qa-only — 제품·브라우저 재실행과 독립 승인 작성이 금지된 문서 정합 과제라 미사용
SOURCES/MODEL: GPT-5 Codex | `.goal/runs/w12-f7-deploy-8cb7b41/{summary.json,health.json}` | `.goal/runs/w12-regression-8cb7b41/{report.json,run.exit,payment-restore.http}` | `.goal/runs/w12-ergonomics-8cb7b41/{observations.json,measure.log,*.png}` | `.goal/verify-20261110-{0358,1147,1252}.md` | `docs/plan/prd-haenael-ge-v0.4.0.md` | `DESIGN.md` | `docs/design/design-spec-core-cashout-30-27-v1-gpt-codex.md` | 기존 벤치마크 https://docs.gitlab.com/ci/testing/unit_test_reports/ · https://playwright.dev/docs/test-reporters

## 문서 품질 채점 (standard-doc-review.md §2, v2.1.21 최신)

- 완결성 4: 표지·범위·수용 조건·결과·추적성·출고 기준이 최종 source 상태와 맞는다. 재사용 6행 PNG 경로 공백(O-2)은 남는다.
- 정밀성 4: 최종 SHA, deployment ID, 회귀 45건 통계·종료코드·원복 HTTP, 3경로 27폭 4축 수치와 `26/0/0` 분모를 원본 경로와 함께 명시했다.
- 벤치마크 반영 3: 공식 GitLab·Playwright 문서 구성을 재사용했다. 이번 버그 픽스 문서 정합에서는 새 외부 조사를 하지 않았다.
- 추적성 5: D-053 → 독립 FAIL 3회 → 시험 키 재배포 → 실제 폼 크기·눌림 결함 → `8cb7b41` 재배포 → 27폭 4축 관찰 → 최종 source 회귀가 이어진다.
- 전문성/톤 4: 현재 builder 증거와 과거 판정, 독립 qa 승인 대기를 분리했다.

RUBRIC_SCORE: 완결성=4 정밀성=4 벤치마크=3 추적성=5 전문성=4 total=20/25 (합격선 충족)
WEAKEST_LINE: "벤치마크 반영 3". 이번 변경은 정해진 규격의 버그 픽스 문서 정합이라 새 동종 보고서 조사는 면제했다.

## 과거 자가채점 (v2.1.13 기준, 최신 평가 아님. 2026-11-09 21:4x 후속 재채점 15/25 로 대체됨)

- 완결성 4: 표지·목차·목적·범위·용어·수용 조건·결과·오픈 이슈·개정 이력을 갖췄다. 재사용 6행 원본 PNG 경로가 비어 5점이 아니다.
- 정밀성 4: 건수·폭·HTTP·SHA·EXIT 가 수치로 있다. 23화면은 이번 회차 수치가 아니라 재사용이다.
- 벤치마크 반영 4: 공식 보고서 문서 2개를 실제 조회하고 차용·미채택을 §2 에 적었다. 보고서 구성 참고이고 동종 QA 보고서 실물 비교는 아니다.
- 추적성 4: D-050~052 → 시안 id·줄 → 원본 캡처 → 회귀 시험 ID 로 연결했다. 시안 핀 SHA 불일치(O-1)가 남는다.
- 전문성/톤 4: 표·용어 정의·명시 앵커로 제3자 탐색이 된다. 판정표 행 서술이 길고 영문 식별자가 섞인다.

과거 점수(v2.1.13 자가신고, 무효): 완결성=4 정밀성=4 벤치마크=4 추적성=4 전문성=4 total=20/25
과거 약점: "현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거" (해당 6행 원본 PNG 경로 미기재, O-2)
