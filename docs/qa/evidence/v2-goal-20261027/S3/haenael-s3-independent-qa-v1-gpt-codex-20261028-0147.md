# 해낼게 S3 독립 QA 최종 보고 v1

> STAMP: 2026-10-28 01:47 KST | model gpt-codex(API model ID 미노출) | agent qa-verifier | skills qa, review | scope S3 independent staging QA | verdict PASS_INTERNAL_S3_CLOSED
>
> 기반 포맷: S2 독립 QA 보고 구조. 승인 정본은 `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0이며, S1·S2 판정과 제품 코드는 변경하지 않았다.

## 결론

S3는 무료 staging 내부 범위에서 **PASS, S3 closed**다. 독립 실행에서 초대 생성 → 다른 계정 수락 → 친구 목록 → 실제 목표 Link 클릭 → 친구 공개 목표를 HTTP 사전 예열 없이 완주했고, DB 연결 `ACTIVE`, 잘못된 소유자·비공개·삭제 연결 HTTP 404, 비인증 HTTP 307과 금지 DOM 0을 확인했다. 기존 P1 두 건은 모두 해소됐다.

외부 Kakao OAuth callback·세션 생성, Toss sandbox 승인·callback, 실결제, production 배포와 전체 제품 QA 승인은 이 판이 보장하지 않는다.

## 출고 기준 판정

| 필수 항목 | 판정 | 직접 근거 |
|---|---|---|
| 기능 happy + edge | 충족 | 독립 01A·01B·01C 3/3 PASS, skip 0. 실제 UI Link 클릭, DB `ACTIVE`, 404·307·금지 DOM 0 |
| 누적 회귀 | 충족 | 동일 E2E SHA에서 builder F6 v10 17/17, 실패 0, skip 0. 제품 `web/src`는 S2 최종 staging과 동일해 78파일·439/439 결과 재사용 |
| 디자인 QA | 충족 | 승인본 v3.0.0과 staging의 초대·수락·친구 390px 화면을 양쪽 이미지로 직접 대조. 주축·순서·열·정렬·표시·타입·버튼 위계가 일치하며 실제 데이터량 차이는 별도 분리 |

## 독립 실행

| 케이스 | 실제 관찰 | 판정 |
|---|---|---|
| QA-REVERIFY-FLOW-01A | 초대 UI → token 링크 → 다른 인증 계정 수락 → 친구 목록 DOM → 목표 Link 클릭 → 상세 DOM. `connectionStatus=ACTIVE`, 목표 제목 일치 | PASS |
| QA-REVERIFY-FLOW-01B | 정상 친구 상세·wordmap은 표시. 잘못된 friendId, PRIVATE 목표, REMOVED 연결은 HTTP 404와 보호 DOM 0 | PASS |
| QA-REVERIFY-FLOW-01C | 익명 요청 HTTP 307, 정확한 `/?next=...`, landing HTTP 200, `friend-wordmap-page` 0 | PASS |

실행 로그: `logs/haenael-s3-independent-01abc-v1-gpt-codex-20261028-0133.log`. 결과는 3 passed, 실패 0, skip 0, Playwright 종료코드 0이다. 실행 전후 E2E SHA-256은 `a5b18a71ed2e3601ed2f29a5e427e5e7ec85c354c0f50a80c76b462598922234`로 manifest와 같다.

## 기존 P1 두 건 해소

| P1 | 해소 판정 | 근거 |
|---|---|---|
| 실제 Link 클릭 전 인증 HTTP 200 예열 | 해소 | 현재 01A에 `friendGoalProbe`와 상세 route `request.get()`이 없다. 친구 목록에서 exact href를 가진 Link를 클릭한 뒤 URL·상세 DOM을 확인한다. 독립 회차도 같은 경로로 PASS했다. |
| F6 결제 플래그 수명주기 | 해소 | canonical F6 verify가 시작 전 staging `PAYMENTS_ENABLED=true`, 전체 Playwright 종료 처리의 `false` 복구, HTTP 503 `payments_disabled` 확인을 한 명령에 포함한다. v10은 17/17, 복구 rc 0, 503, 외부 결제 호출 0이다. 독립 종료 뒤에도 별도 smoke에서 HTTP 503·`payments_disabled`를 재확인했다. |

## 회귀·정리·환경

- builder 전체 회차: `logs/haenael-s3-f6-full-v10-gpt-codex-20261028-0055.log`, 17 passed, 실패 0, skip 0, 7.2분.
- F5: 7/7, 실패 0, skip 0. `CC-01`은 동시 수락 성공 1·used 1·connection 1을 유지한다.
- 독립 namespace `1793119379683`: DB member/goal/payment 0, Auth 0, goal-cover Storage 0, avatar queue·asset·object 0.
- 지연 avatar는 v10에서 PENDING·object 존재를 먼저 관찰한 뒤 정확한 test-owned queueId·assetId·objectPath를 강제 정리했다. 이는 **자연 TTL cleanup PASS가 아니라 fixture teardown 이후 잔여 0**이다.
- 독립 결제 비활성 증거: `haenael-s3-payment-disabled-independent-v1-gpt-codex-20261028-0146.json`, curl rc 0, HTTP 503, code `payments_disabled`.
- 실제 Toss API·실결제·과금 호출은 하지 않았다.

## 디자인·데모 판정

| 화면 | 승인본 | staging | 판정 |
|---|---|---|---|
| 초대 생성 | `approved-connect-390.png` | 독립 캡처 01·02 | 일치. 세로 흐름, hero, Kakao preview, CTA 2열, 하단탭 위계 유지 |
| 초대 수락 | `approved-inviteaccept-390.png` | 독립 캡처 03 | 일치. cover·avatar, 초대 문구, 목표 설명, primary CTA 순서 유지 |
| 친구 목록 | `approved-friends-390.png` | 독립 캡처 04 | 일치. 제목·추가 CTA·카드 구조·관계 badge·progress·message·chevron 유지. 승인본 3명과 독립 fixture 1명은 데이터량 차이이며, 1명 상태의 초대 유도 카드가 정상 노출됨 |
| 친구 공개 목표 | 승인 prototype의 친구 상세 흐름 | 독립 캡처 05 | 일치. cover·목표·관계 badge·응원자·wordmap·다른 목표·관계 해제 흐름 유지 |

S3 데모 허브를 별도 headless Chromium으로 열어 이미지 5/5 로드, 깨진 이미지 0, 링크 4/4 실제 열림, 가로 overflow 0, console·page error 0을 확인했다. 증거는 `haenael-s3-independent-demo-render-v1-gpt-codex-20261028-0145.json`과 같은 이름의 PNG다.

## 이 QA가 보장하는 것과 보장하지 않는 것

보장한다: 배포 ID `dpl_8vUvNNqSBhBa2cJ98bnMrRxKNt58`의 무료 staging에서 S3 초대·수락·친구 목록·친구 공개 목표·접근 거부 흐름, 현재 E2E source의 F5/F6 assertion coverage, test-owned fixture 잔여 0, staging 결제 플래그 false 경계, 승인 v3.0.0의 S3 화면 구조 정합.

보장하지 않는다: 실제 Kakao OAuth, 실제 Toss sandbox 승인·callback, 실결제·환불·송금, production 배포·production DB 쓰기, 성능·부하·크로스브라우징, S1·S2 재검증, 전체 제품 QA 승인과 출시 준비.

정리된 fixture URL과 token은 현재 재사용할 수 없다.

## 실행 명령과 종료 코드

| 실행 | 종료코드 | 결과 |
|---|---:|---|
| staging wrapper + heavy-slot + Playwright grep `QA-REVERIFY-FLOW-01A|01B|01C` | 0 | 3 passed, 실패 0, skip 0, fixture 8계수 0 |
| wrapper 주입 `cheer-order` disabled smoke | 0 | curl rc 0, HTTP 503, `payments_disabled` |
| S3 demo headless Chromium smoke | 0 | 이미지 5/5, 링크 4/4, overflow 0, console/page error 0 |
| 전체 F6 v10 로그·source hash 대조 | 0 | 17/17, skip 0, hash 일치 |

SKILLS_USED: qa, staging 실제 flow·보안 경계·정리·데모 종료 증거 판정. review, 기존 P1 두 건과 assertion 보존 여부의 독립 대조.
SKILLS_SKIPPED: 없음.

KNOWLEDGE_QUERY: S3 recovery prompt, D-049와 관련 실수 맥락, 현재 source manifest·E2E source·F6 v10·S3 데모와 캡처를 repo-local로 조회했다.
HITS_USED: 승인 prototype v3.0.0, E2E SHA 일치 source, F6 v10 원문, 독립 01A·01B·01C 로그, 승인/dev 390px 이미지, demo headless 결과를 판정에 사용했다.
HITS_REJECTED: S1·S2 상류 전체와 과거 실패 회차는 재검증 범위 밖이거나 최종 소스 판정 근거가 아니어서 제외했다. 외부 웹조사는 이미 확정된 QA 실행이라 수행하지 않았다.
CONFLICTS: 없음. 외부 Kakao·Toss는 정본과 충돌하지 않게 미검증으로 유지했다.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | `docs/design/prototypes/social-viral-loop-v3-opus5.html` v3.0.0 | `docs/qa/evidence/v2-goal-20261027/S3/source-manifest.json` | `web/e2e/social-web-first.spec.ts` | F6 v10·독립 01A/B/C·demo headless 증거

PRESENTATION_CHECK: 내부 태그 잔재 없음, 원문 Markdown 렌더 대상, 브라우저 자동 열기 없음.

RUBRIC_SCORE: evidence=5 traceability=5 clarity=5 completeness=5 presentation=5 total=25/25
WEAKEST_LINE: production과 외부 사업자 callback은 금지 범위라 이 보고서의 PASS에 포함하지 않는다.
