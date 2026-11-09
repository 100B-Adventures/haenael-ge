# 해낼게 V2 Design Conformance Matrix

> 2026-11-09 최종 동결 QA: D-051에 따라 `paysuccess`·`dopamine`은 회장 표현 선택 대기가 아니다. source `614c9490ac6810cb3230da0b0287c863ef2d0d84`의 실제 `DONE` 결제 상태를 승인 시안과 390·1024·1440px에서 대조했고, 단어 적립은 보존됐지만 배치·표시 요소가 시안과 달라 두 화면을 `불일치`로 판정했다.


| 항목 | 값 |
|---|---|
| 버전 | v2.1.11, G7 최종 동결 QA |
| 작성일 | 2026-11-09 |
| 파이프라인 라인 | `v2`, current stage `qa` |
| 승인 시안 | `docs/design/prototypes/social-viral-loop-v3-opus5.html`, SHA-256 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a` |
| staging 구현 | `https://haenael-ge-v2-staging-100-b.vercel.app`, source SHA `614c9490ac6810cb3230da0b0287c863ef2d0d84` |
| 현재 캡처 | 결제 2화면 `.goal/runs/g7-final-qa-20261109/payment-captures/`, D-050 보존 `.goal/runs/g7-final-qa-20261109/friend-preservation/`, 불변 23화면은 직전 실제 캡처 근거 재사용 |

## 2026-11-09 현재 판정

**판정: 디자인 불일치 2건과 누적 회귀 실패 1건.** source `614c9490`의 변경 범위인 결제 성공·워드맵 성장 화면을 실제 `DONE` 결제 상태로 390·1024·1440px에서 승인 시안과 직접 대조했다. 친구·손님 응원 보존은 최신 source에서 별도 fixture로 직접 조작했고, 나머지 UI 불변 화면은 제품 diff와 직전 직접 PNG 판정을 재사용했다. 현재 분모는 `일치 23 / 불일치 2 / 미확인 1`이다. 누적 회귀는 단일 실행·retries 0에서 `44 passed / 1 failed / 0 flaky`, EXIT 1이며, 유일한 미확인은 W-12 정책으로 staging enabled 신청을 수행하지 않은 `cashout`이다.

| 화면 ID | 폭·속성별 실제 관찰 | 판정 | 증거·후속 위치 |
|---|---|---|---|
| `admin` | 390·768·1024·1440. 운영 경보 36건을 삭제하지 않고 상세는 `aria-expanded=false`, 직접 클릭 뒤 `true`와 현재 fixture 상세를 관찰 | 일치 | `direct-captures/admin-{390,768,1024,1440}.png`, `observations.json` |
| `bannerupload` | 390·768·1024·1440. 빈 보관함 상태, 불투명 배경 `rgb(251,250,247)`가 viewport 전체 폭을 덮음. 390에서 사진 2장 선택·선택 변경·세로 위치 76·crop·쓰기 뒤 서버 `REVIEW` 관찰 | 일치 | `direct-captures/bannerupload-*-empty.png`, `bannerupload-390-selected-review.png`, `targeted-observations.json` |
| `belong` | 390·1024·1440. 관계 배지·아바타·수치는 fixture 차이이며 관계 해제는 D-026 기능이다. 방향·순서·위계는 승인본과 같음 | 일치 | 현 source 회귀 캡처와 이전 1024 좌우 대조 재사용. UI 불변 diff 근거 |
| `business` | 390·1024·1440. 6행·순서·법적 고지 블록 유지. 데스크톱 전체 폭 확장은 DESIGN 데스크톱 가용 폭 100% 결정 | 일치 | 이전 3폭 좌우 대조와 UI 불변 diff 근거 |
| `cashhistory` | 390·768·1024·1440. compact 요약 3칸, 거래 행, 세금 고지, 환전·홈 동작 순서가 승인본과 같고 fixture 금액·건수만 다름 | 일치 | `direct-captures/cashhistory-{390,768,1024,1440}.png` |
| `cashout` | staging은 W-12 안전계약에 따라 비활성이다. 격리 localhost에서는 390·1024·1440 HTTP 200, 신청 POST 200, DB `REQUESTED`, 마스킹 계좌, 상태·내역과 namespace 0을 관찰했으나 staging 일치로 승격하지 않음 | 미확인 | staging 비활성 증거 + 로컬 대체 증거 `.goal/g7-cashout-local-final.summary.md`; staging enabled는 미확인 |
| `cashstatus` | 390·768·1024·1440. 상단 상세 헤더, 접수 hero, 세로 3단계, 금액·잔액·알림·홈 순서가 승인 계약과 같음 | 일치 | `direct-captures/cashstatus-{390,768,1024,1440}.png` |
| `connect` | 390·1024·1440. 실제 초대 수락 fixture 뒤 `윤도경님이 초대를 받고 들어왔어요` 확인 상태를 촬영. 승인 수락 후 상태와 방향·순서·위계가 같음 | 일치 | `direct-captures/connect-{390,1024,1440}-accepted.png` |
| `coverage` | 제품 `page.tsx` route 24개와 승인 시안 coverage 표 24행을 코드·문서로 확인. landing 캡처를 근거로 쓰지 않음 | 일치 | `find web/src/app -name page.tsx`=24, 승인 시안 표=24 |
| `dopamine` | 390·1024·1440. 실제 DB `DONE`에서 overlay 1·성장 워드맵 1·누적 25개·방금 보낸 단어 `한걸음`, consent dialog 0, overflow 0. 승인본의 상단 뒤로가기·목표 문맥·녹색 `조용히 응원하기` CTA·하단 탭이 staging에 없고, staging은 테두리 카드 안에 성공 피드백과 성장 워드맵을 함께 배치 | 불일치 | `.goal/runs/g7-final-qa-20261109/payment-captures/dopamine-{approved,staging,pair}-{390,1024,1440}.png`, `observations.json` |
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
| `paysuccess` | 390·1024·1440. 실제 DB `DONE`에서 제목 `응원이 전달됐어요`·친구 목표 귀환·홈 복귀·overlay 1·성장 워드맵 1, consent dialog 0, overflow 0을 확인. 승인본은 전체 폭의 간결한 성공 피드백이지만 staging은 테두리 카드·다른 icon·좁은 본문 폭을 쓰고 같은 viewport에서 워드맵 성장 블록을 즉시 시작 | 불일치 | `.goal/runs/g7-final-qa-20261109/payment-captures/paysuccess-{approved,staging,pair}-{390,1024,1440}.png`, `observations.json` |
| `privacy` | D-040에 따른 법적 전문·목차·소유 화면을 보존했다. prototype 짧은 예문은 전문 삭제 요구가 아님 | 일치 | 기존 390·1024·1440 대조와 D-040 근거. UI 불변 diff |
| `status` | 390·768·1024·1440. `업적` 제목, hero, 통계, 진행률, 사진 메달 6개, 마이 탭 활성과 실제 4/6 상태를 확인 | 일치 | `direct-captures/status-{390,768,1024,1440}.png`, `observations.json` |
| `terms` | D-040에 따른 법적 전문·목차·소유 화면을 보존했다. prototype 짧은 예문은 전문 삭제 요구가 아님 | 일치 | 기존 390·1024·1440 대조와 D-040 근거. UI 불변 diff |

## 출고 기준과 회귀

| 출고 필수 항목 | 충족 여부 | 실제 관찰 | 증거 |
|---|---|---|---|
| 이번 기능 happy + edge | 충족 | 홈 검색 일치·0건, 사진 선택·crop·업로드 `REVIEW`, 환전 읽기, 업적·워드맵·관리자 접힘을 staging에서 실제 조작 | 현재 26행 판정표와 `observations.json` |
| 누적 regression | 미충족 | 단일 실행 retries 0, `44 passed / 1 failed / 0 flaky`, EXIT 1. `QA-REVERIFY-VIEWPORT-01`·`QA-TC-CL-04`는 통과했고, `G4-FRIEND-HISTORY-01`은 선행 `CC-01`이 실제 친구 1명을 추가한 뒤 현재 카드 4개를 fixture 초기값 3으로 고정 기대해 실패. 제품 결함은 관찰되지 않았으나 실패 실행을 통과로 합산하지 않음 | `.goal/runs/g7-final-qa-20261109/logs/social-web-first.log`, `failure-first40.log` |
| 디자인 QA | 미충족 | `23 일치 / 2 불일치 / 1 미확인`. 불일치는 D-051 대상 `paysuccess`·`dopamine`, 미확인은 W-12에 따라 staging enabled를 수행하지 않은 `cashout` | 현재 26행 판정표 |

이 QA가 보장하는 것은 source `614c9490` exact staging에서 실제 `DONE` 결제 영수증을 재조회해 성공 CTA·워드맵·누적 25개·방금 보낸 단어가 유지된 사실, D-050 친구 목록·회원 상세·MY 손님 응원·홈 12 집계가 보존된 사실, 그리고 UI 불변 23화면의 직전 픽셀 근거 재사용이다. 보장하지 않는 것은 실패 1건이 남은 누적 회귀 통과와 W-12 enabled staging 쓰기다. `paysuccess`·`dopamine`은 기능 보존은 관찰했지만 시안 일치를 보장하지 않으며 현재 판정은 `불일치`다.

## 과거 회차 요약

- source `78c401d`: 87폭 수집은 완료했지만 데스크톱 전체 폭·fixture·법적 전문·coverage를 오대조해 `2 일치 / 19 불일치 / 5 미확인`으로 잘못 집계했다.
- source `3142e9a`: 홈 검색 접힘과 사진·워드맵 기능 누락을 재발견했고 독립 시각 감사가 진짜 결함·오대조·재캡처 항목을 재분류했다.
- source `c2eb2f6`: 390px 26/26·1024px 22/26만 회수되어 미완으로 종료했다.

기반 포맷: 이 파일의 직전 G7-SURF QA 구조를 계승했다.

SKILLS_USED: qa-only, staging 브라우저·API·회귀 결함 보고
SKILLS_SKIPPED: 없음
SOURCES/MODEL: GPT-5 Codex | `.goal/g7-surf-full-visual-audit.summary.md` | `.goal/g7-surf-final-remediation-build.summary.md` | `.goal/runs/g7-surf-post-remediation-20261108/`
