# 해낼게 V2 디자인 정합 매트릭스 (Design Conformance Matrix)

| 표지 | 값 |
|---|---|
| 문서 버전 | v2.1.16 (2026-11-09 21:5x KST 문서 보정. 현재: W-12 미완료·로컬 통합 FAIL·staging 미반영, `25 일치 / 0 불일치 / 1 미확인`. 16e483d 판정은 과거 근거로 불변) |
| 작성 시각 | 2026-11-09 19:53 KST 보완. 판정 근거 관찰 시각 2026-11-09T10:37:31Z(19:37 KST, `observations.json`) |
| 작성자·모델 | 문서 보완: qa-verifier / Claude Opus 5.5. 판정 원본: 독립 검증 Claude(제작 GPT-5 Codex 와 다른 모델) |
| 파이프라인 | 라인 `v2`, `current_stage: qa`, qa 단계 승격 미실시 |
| 제품 source | `16e483d8bbae58612f69360ca7174469428aa27e` (staging health `sourceSha` 직접 조회) |
| staging | `https://haenael-ge-v2-staging-100-b.vercel.app` |
| 승인 시안 핀 | `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0, SHA-256 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a` (`pipeline-state.v2.md:52`). 작업트리 파일 SHA 는 다르다. [O-1](#open) 참조 |
| 독립 판정 | `.goal/verify-20261109-192x.md` VERDICT PASS (불변 원본), 재검수 `.goal/g7-independent-quality-recheck.md` VERDICT PASS |

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

**현재 판정(2026-11-10 03:5x KST): `25 일치 / 1 불일치(cashout, 시안에 없는 기존 요소 5개) / 0 미확인`. W-12 staging 쓰기는 관찰됨(신청 1회 REQUESTED·마스킹, 응답 원문 0). 이전 판정(2026-11-09 21:3x KST): `25 일치 / 0 불일치 / 1 미확인(cashout)`. W-12 미완료(로컬 통합 FAIL, staging 미반영), qa 승인 요건 NOT_MET / VERDICT FAIL(`.goal/w12-approval.summary.md`). D-052 정책 대기는 D-053 으로 해소.**

**과거 근거(source `16e483d`, 2026-11-09 19:3x 관찰, W-12 증거 아님)**: 당시 분모 `25 일치 / 0 불일치 / 1 범위 제외(cashout, D-052)`, 누적 회귀 `45/45`. source `16e483d` staging 에서 결제 성공(`paysuccess`)과 워드맵 성장(`dopamine`)을 실제 `DONE` 결제 3건으로 390·1024·1440px 직접 관찰해 승인 시안과 나란히 대조했다. 16e483d 제품 diff 가 두 화면 범위로 한정돼 나머지 23화면은 직전 직접 PNG 판정을 재사용했다([§7](#trace)). `cashout` 은 D-052 에 따라 범위 제외이며 일치로 세지 않는다. 이것은 제품 QA 판정이고 qa 단계 승격은 W-12 미판정으로 하지 않았다. **W-12 갱신(2026-11-09 21:3x KST)**: D-053 으로 정책 대기는 해소됐다. `cashout` 분모 표기를 `범위 제외` 에서 `미확인(로컬 통합 실패로 staging 반영 보류)` 로 바꾼다. 현재 분모는 `25 일치 / 0 불일치 / 1 미확인` 이고 16e483d 의 25 일치 판정은 그대로다. W-12 미커밋 소스는 staging 에 반영되지 않았고(staging 은 여전히 16e483d), 새 staging 회귀·캡처는 미실행이다.

## 2. 목적·범위·참고 기준 <a id="scope"></a>

- **목적**: 승인 시안 26화면과 source `16e483d` staging 화면의 정합을 화면 단위로 판정하고, 판정마다 원본 증거 경로를 남긴다.
- **범위 안**: 26화면 판정표, 결제 2화면 3폭 직접 대조, 누적 회귀 45건 결과 인용.
- **범위 밖**: W-12 `cashout` staging enabled 쓰기(D-052 정책 대기는 D-053 으로 해소. 현재 미확인: W-12 로컬 통합 FAIL 로 staging 반영 보류), 실제 Toss 결제 승인 호출, 운영 환경, 비 Chromium 브라우저, 성능·부하·보안(회장 미지정).
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
| AC-1 | Given source `16e483d` staging, When 누적 회귀를 retries 0 단일 실행, Then `45 expected / 0 unexpected / 0 flaky / 0 skipped`, EXIT 0 |
| AC-2 | Given 실제 `DONE` 결제, When `paysuccess`·`dopamine` 을 390·1024·1440 에서 열고 CTA 를 누름, Then HTTP 200·overflow 0·console error 0·오류 문구 0, 성공과 성장이 분리되고 시안 구조와 같음 |
| AC-3 | Given 16e483d diff 가 결제 성공 범위로 한정, When 나머지 23화면 판정, Then 직전 직접 PNG 근거 재사용을 경로와 함께 명시 |
| AC-4 | Given `cashout` staging 미관찰(과거 16e483d 회차는 D-052 결정 대기, 현재는 D-053 정책 해소 후 로컬 통합 FAIL), When 분모 집계, Then `cashout` 은 일치에 넣지 않음(16e483d 회차 범위 제외, W-12 현재 미확인) |
| AC-5 | Given 실행 종료, When fixture 정리, Then 결제 플래그 복구(HTTP 503)와 fixture 잔존 0 |

## 5. 검증 결과 <a id="results"></a>

| AC | 결과 | 증거 등급 | 원본 |
|---|---|---|---|
| AC-1 | 충족, 45/45, EXIT 0, 479.9초 | 관찰됨(원 세션) | `.goal/runs/g7-regression-20261109-192x/summary.{json,md}`, `run.exit`=0 |
| AC-2 | 충족, 2화면 × 3폭 = 6쌍 일치 | 관찰됨(원 세션) | `.goal/runs/g7-independent-192x/` PNG 12장 + `observations.json` |
| AC-3 | 충족, 23화면 재사용 | 근거 확인 | `.goal/verify-20261109-192x.md:33` (diff 7파일 목록) |
| AC-4 | 16e483d 회차 충족(`cashout` 범위 제외 1). W-12 현재: 분모 규칙은 충족(일치로 세지 않음)이나 `cashout` 자체는 미확인 1 | 근거 확인 | `wiki/거버넌스/결정.md` D-052·D-053, `.goal/runs/w12-local-20261109/observations.json` |
| AC-5 | 충족 | 관찰됨(원 세션) | `summary.json` `fixture_cleanup` |

## 6. 화면별 판정표 26행 <a id="screens"></a>

경로 접두어(`direct-captures/` 등)의 실제 root 는 [§9](#paths) 에 있다. 모든 경로는 저장소 루트 기준이다.

| 화면 ID | 폭·속성별 실제 관찰 | 판정 | 증거·후속 위치 |
|---|---|---|---|
| `admin` | 390·768·1024·1440. 운영 경보 36건을 삭제하지 않고 상세는 `aria-expanded=false`, 직접 클릭 뒤 `true`와 현재 fixture 상세를 관찰 | 일치 | `direct-captures/admin-{390,768,1024,1440}.png`, `observations.json` |
| `bannerupload` | 390·768·1024·1440. 빈 보관함 상태, 불투명 배경 `rgb(251,250,247)`가 viewport 전체 폭을 덮음. 390에서 사진 2장 선택·선택 변경·세로 위치 76·crop·쓰기 뒤 서버 `REVIEW` 관찰 | 일치 | `direct-captures/bannerupload-*-empty.png`, `bannerupload-390-selected-review.png`, `targeted-observations.json` |
| `belong` | 390·1024·1440. 관계 배지·아바타·수치는 fixture 차이이며 관계 해제는 D-026 기능이다. 방향·순서·위계는 승인본과 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `business` | 390·1024·1440. 6행·순서·법적 고지 블록 유지. 데스크톱 전체 폭 확장은 DESIGN 데스크톱 가용 폭 100% 결정 | 일치 | 이전 3폭 좌우 대조와 UI 불변 diff 근거 |
| `cashhistory` | 390·768·1024·1440. compact 요약 3칸, 거래 행, 세금 고지, 환전·홈 동작 순서가 승인본과 같고 fixture 금액·건수만 다름 | 일치 | `direct-captures/cashhistory-{390,768,1024,1440}.png` |
| `cashout` | **현재(W-12 f9d9b99, staging 2026-11-10 03:49 KST, Claude 세션)**: 격리 staging(sourceSha f9d9b99, D-053 전용 키 배포 한 건 주입) 390·1024·1440 HTTP 200·폼·확인 버튼 보임·가로 넘침 0. 실제 신청 POST 1회 HTTP 200, 응답 본문 `REQUESTED` 포함·계좌 원문 0·마스킹 포함, DB #734 `REQUESTED` `••••••8421`, 상태·내역 화면 마스킹·원문 0(글자·HTML). 승인 기준 `docs/design/clean-frames/core-cashout-30-27-form-390-v1-gpt-codex.png` 와 2장 나란히 Read 대조: 제목·클로버 요약·환산/이용료/원천징수·받으실 금액·신청 폼(클로버·은행·계좌·예금주)·요약 줄·녹색 신청 버튼의 구조와 순서는 같다. 시안에 없는 요소 5개: 이용료 설명 문단, 예금주 안내 문구, 전화번호 칸(D-010 알림톡 근거), 계좌 암호화 안내 박스(D-012 근거), 하단 `해낼게 관리로 돌아가기` 링크. 다섯 다 W-12 이전부터 있던 화면이며 f9d9b99 는 화면 코드를 바꾸지 않았다. 내역 화면 날짜가 `2026. 11. 9.`(UTC, `history/page.tsx:88` `toLocaleDateString` 시간대 미지정)로 상태 화면 `11/10 03:49`(KST)와 다르다(결함 후보) | 불일치(시안에 없는 요소 5개. 결정 근거 있는 2개 포함, 승격·수용 판정 필요) | `.goal/runs/w12-staging-20261110/{observations.json,captures/staging-cashout-{390,1024,1440}.png,captures/staging-status-{390,1440}.png,captures/staging-history-{390,1440}.png}`, 로컬 r2 `.goal/runs/w12-local-r2-20261110/` |
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
| D-053 격리 staging 환전 신청 검증(현재) | `cashout`(prototype:2844) 미확인 | `.goal/runs/w12-local-20261109/{observations.json,driver.log,captures/cashout-form-390.png}`: driver EXIT 1, POST 0건. staging health `sourceSha=16e483d` | W-12 소스 회귀 미실행. 승인 판정 `.goal/w12-approval.summary.md` NOT_MET / FAIL |

**증거 재사용 이유**: 16e483d diff 는 e2e spec, `payment/success` 3파일, 결제 범위 CSS 선택자, `/g/[slug]` 고정 CTA `id="cheer"` 1개다(`.goal/verify-20261109-192x.md:33`). 23화면 UI 코드는 바뀌지 않았으므로 직전 직접 캡처 판정을 재사용했다. 이는 사용자 승인된 영향 범위 판단이며 누락이 아니다. `/g/[slug]` 는 회귀 45건과 `#cheer` 이동 관찰로 확인했다.

## 8. 출고 기준과 보장 범위 <a id="gate"></a>

| 출고 필수 항목 | 충족 여부 | 실제 관찰 | 증거 |
|---|---|---|---|
| W-12 환전 신청 happy + edge(현재) | 미충족 | 로컬 통합 driver EXIT 1, POST 0건, staging 미반영 | `.goal/w12-approval.summary.md` |
| 이번 기능 happy + edge(과거 16e483d) | 충족 | 홈 검색 일치·0건, 사진 선택·crop·업로드 `REVIEW`, 환전 읽기, 업적·워드맵·관리자 접힘을 staging에서 실제 조작 | [§6](#screens), `.goal/runs/g7-independent-192x/observations.json` |
| 누적 regression | 16e483d 과거 근거 충족. W-12 소스 미실행 | source `16e483d` exact staging 단일 실행 `45 expected / 0 unexpected / 0 flaky / 0 skipped`, retries 0, EXIT 0. 종료 후 결제 플래그 복구 HTTP 503, fixture 잔존 0 | `.goal/runs/g7-regression-20261109-192x/summary.{json,md}` |
| 디자인 QA | 16e483d 범위 충족. W-12 `cashout` 미확인 | `25 일치 / 0 불일치 / 1 미확인`(16e483d 당시 `1 범위 제외`). `cashout` 은 D-053 이후 정책 대기가 아니라 W-12 로컬 통합 FAIL 로 staging 반영 보류. 16e483d diff는 결제 성공 CSS 선택자와 `/g/[slug]` 고정 CTA `id="cheer"` 속성만 바꿔 나머지 23화면은 직전 근거 재사용 | [§6](#screens) |

이 QA가 보장하는 것은 source `16e483d` exact staging에서 결제 성공과 성장 화면이 분리되고 그 구조(뒤로가기 header·목표 문맥·녹색 CTA·하단 4탭)가 승인 시안과 맞으며, 단어 적립·`#cheer` 진입이 3폭에서 동작하고, 누적 45건 회귀가 깨지지 않은 사실이다. UI 불변 23화면은 직전 픽셀 근거 재사용이다. 보장하지 않는 것은 W-12 `cashout` enabled staging 쓰기, 실제 Toss 결제 승인 호출, 운영 환경, 비 Chromium 브라우저, 그리고 W-12 판정 전의 qa 단계 승격이다.

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
| O-3 | W-12 `cashout` staging enabled 쓰기 미확인. 정책은 D-053 으로 해소. 병목은 로컬 통합 FAIL(동의 배너가 확인 버튼 클릭 차단, POST 없음, 원인 미분류) | qa 단계 승격 불가(`.goal/w12-approval.summary.md` NOT_MET) | 컨트롤러: 원인 분류 → 수정 → 로컬 POST 1회 → 격리 staging 반영·cashout 3폭 관찰 |
| O-4 | 실제 Toss 승인 호출·운영·비 Chromium 미검증 | 보장 범위 밖 | 회장 지정 시 |
| O-6 | 2026-11-09 19:5x 문서 보완 중 1024 pair 2장(`.goal/runs/g7-independent-192x/{paysuccess,dopamine}-pair16e-1024.png`)을 Read 로 직접 대조했다. `paysuccess`: 시안은 내용이 상단 정렬, staging 은 viewport 세로 중앙 정렬이고 아이콘 원 안 글리프 유무가 다르다. `dopamine`: 시안 CTA 아래 안내 박스("보낸 응원이 워드맵에 쌓였어요…")가 staging 1024 프레임에는 보이지 않는다(스크롤 밖인지 미확인). 독립 판정의 `일치`는 바꾸지 않았다 | 정렬 축·표시 요소 축 차이 후보. 표현 편차인지 계약 누락인지 판정 필요 | 컨트롤러: 재판정 또는 회장 수용 확인 |

## 11. 과거 회차 이력 (판정 효력 없음) <a id="history"></a>

> 아래는 이전 source 의 기록이다. 현재 판정은 §1·§5·§6 만이다.

- source `614c9490ac6810cb3230da0b0287c863ef2d0d84`(2026-11-09 최종 동결 QA): D-051에 따라 실제 `DONE` 결제 상태를 390·1024·1440px에서 대조해 `paysuccess`·`dopamine`을 배치·표시 요소 차이로 `불일치` 판정했고, 분모는 `일치 23 / 불일치 2 / 미확인 1`, 누적 회귀는 `44 passed / 1 failed / 0 flaky`, EXIT 1이었다. 근거 `.goal/runs/g7-final-qa-20261109/`. 이 실패는 16e483d에서 해소됐고 이력으로 보존한다.
- source `78c401d`: 87폭 수집은 완료했지만 데스크톱 전체 폭·fixture·법적 전문·coverage를 오대조해 `2 일치 / 19 불일치 / 5 미확인`으로 잘못 집계했다.
- source `3142e9a`: 홈 검색 접힘과 사진·워드맵 기능 누락을 재발견했고 독립 시각 감사가 진짜 결함·오대조·재캡처 항목을 재분류했다.
- source `c2eb2f6`: 390px 26/26·1024px 22/26만 회수되어 미완으로 종료했다.

## 12. 개정 이력 <a id="revisions"></a>

| 버전 | 시각(KST) | 변경 | 작성 |
|---|---|---|---|
| v2.1.16 | 2026-11-09 21:5x | 후속 재채점(15/25) 지적 보정: 표지·§1 에 현재(W-12 FAIL·25/0/1 미확인)와 과거 16e483d 근거 분리, `cashout` 행 과거 POST 200 과 현재 POST 0건 분리, §7 D-053 행, §8 W-12 행 추가, 자가채점 블록 버전 명시. 판정·시험 원본 변경 없음 | qa-verifier / Claude Opus 5.5 |
| v2.1.15 | 2026-11-09 21:3x | W-12 승인 요건 판정 반영: `cashout` 행 미확인(로컬 통합 실패로 staging 반영 보류), §1 분모 `25/0/1 미확인`, 범위·AC-4·O-3 을 D-053 기준으로 갱신. 16e483d 판정·이력 보존 | qa-verifier / Claude Opus 5.5 |
| v2.1.13 | 2026-11-09 19:53 | 표지·목차·범위·용어·수용 조건·추적성·경로 root·오픈 이슈(O-1 시안 SHA 불일치 발견)·개정 이력 추가. 판정·행 변경 없음 | qa-verifier / Claude Opus 5.5 |
| v2.1.12 | 2026-11-09 19:5x | source 16e483d 독립 판정 반영, paysuccess·dopamine 일치, 25/0/1 | qa-verifier / Claude |
| v2.1.11 이전 | 2026-11-08~09 | [§11](#history) 회차별 기록 | GPT-5 Codex |

기반 포맷: 이 파일 v2.1.12 판정표와 `standard-doc-review.md` §5.1·§8 FDD 골격(명시 앵커)을 계승했다.

SKILLS_USED: 없음(문서 보완, 새 QA 실행 없음)
SKILLS_SKIPPED: qa·qa-only — 제품·브라우저 재실행 금지 과제라 미사용
SOURCES/MODEL: Claude Opus 5.5 (claude-opus-5-5) | `~/.claude/standards/standard-doc-review.md` §1·§2·§5 | https://docs.gitlab.com/ci/testing/unit_test_reports/ | https://playwright.dev/docs/test-reporters | `.goal/verify-20261109-192x.md` | `wiki/거버넌스/결정.md` D-050~052 | `pipeline-state.v2.md:52`

## 문서 품질 채점 (standard-doc-review.md §2, v2.1.16 최신)

- 완결성 4: 표지·목차·범위·용어·수용 조건·결과·추적성·오픈 이슈·개정 이력이 현재 상태와 맞다. 재사용 6행 PNG 경로 공백(O-2).
- 정밀성 3: 현재·과거 POST 를 분리했으나 시각 `21:3x` 분 단위 아님, W-12 실패 원인 미분류, 용어 표에 `미확인` 정의 없음.
- 벤치마크 반영 3: 공식 문서 2건 재인용, 동종 QA 보고서 실물 비교 없음.
- 추적성 4: D-050~053 → 시안 id → 관찰 → 회귀/승인 판정. 시안 핀 SHA 불일치(O-1).
- 전문성/톤 3: `cashout` 행이 한 칸에 과거·현재·참고 대조를 담아 길다. mermaid 0(§5.2 커버리지 맵은 tracker §4 에만).

RUBRIC_SCORE: 완결성=4 정밀성=3 벤치마크=3 추적성=4 전문성=3 total=17/25 (합격선 20 미달, FAIL)
WEAKEST_LINE: "`cashout` | **현재(W-12 미커밋 소스 …)**" (§6. 한 행에 과거 근거·현재 관찰·참고 대조가 함께 있어 길다)

## 과거 자가채점 (v2.1.13 기준, 최신 평가 아님. 2026-11-09 21:4x 후속 재채점 15/25 로 대체됨)

- 완결성 4: 표지·목차·목적·범위·용어·수용 조건·결과·오픈 이슈·개정 이력을 갖췄다. 재사용 6행 원본 PNG 경로가 비어 5점이 아니다.
- 정밀성 4: 건수·폭·HTTP·SHA·EXIT 가 수치로 있다. 23화면은 이번 회차 수치가 아니라 재사용이다.
- 벤치마크 반영 4: 공식 보고서 문서 2개를 실제 조회하고 차용·미채택을 §2 에 적었다. 보고서 구성 참고이고 동종 QA 보고서 실물 비교는 아니다.
- 추적성 4: D-050~052 → 시안 id·줄 → 원본 캡처 → 회귀 시험 ID 로 연결했다. 시안 핀 SHA 불일치(O-1)가 남는다.
- 전문성/톤 4: 표·용어 정의·명시 앵커로 제3자 탐색이 된다. 판정표 행 서술이 길고 영문 식별자가 섞인다.

과거 점수(v2.1.13 자가신고, 무효): 완결성=4 정밀성=4 벤치마크=4 추적성=4 전문성=4 total=20/25
과거 약점: "현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거" (해당 6행 원본 PNG 경로 미기재, O-2)
