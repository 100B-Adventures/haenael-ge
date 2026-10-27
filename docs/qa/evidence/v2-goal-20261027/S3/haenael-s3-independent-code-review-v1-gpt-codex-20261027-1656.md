# 해낼게 S3 독립 코드·로그 검토 v1

> STAMP: 2026-10-27 16:56 KST | model gpt-codex(API model ID 미노출) | agent qa-verifier | skills qa, review | scope S3 lightweight code/log review only | verdict BLOCKED_FOR_INDEPENDENT_EXECUTION
>
> 기반 포맷: S2 독립 QA 보고 구조. 이번 문서는 브라우저·E2E·DB 쓰기를 실행하지 않은 중간 코드리뷰이며 S3 완료·PASS를 주장하지 않는다.

## 결론

현재 F5 7/7과 F6 v3 16/17 로그는 기능 결함보다 테스트 복구가 진전됐음을 보여준다. 관리자 selector 수정, 동적 fixture 식별, 보안·동시성 assertion은 타당하다. 다만 **UI 클릭 직전 authenticated HTTP probe와 결제 flag 수명주기 재현성 2건은 최종 독립 실행 전에 닫아야 한다.** S1·S2 판정은 변경하지 않는다.

## 발견 사항

### P1 · UI 목표 Link 클릭 직전 HTTP 200 probe가 cold UI navigation을 예열한다

- 근거: `web/e2e/social-web-first.spec.ts:2594-2597`이 `acceptInvitePage.request.get(expectedFriendGoalPath)`로 같은 인증 cookie를 사용해 목표 상세 route를 먼저 200으로 호출하고, 그 뒤 `2598-2606`에서 실제 Link click·URL·DOM을 검증한다.
- 판정: probe가 UI 클릭을 **대체하지는 않는다.** 실제 Link click과 `friend-detail-page`, 목표 제목 assertion이 남아 있어 인증 우회로 PASS시키는 구조는 아니다.
- 차단 이유: 첫 UI navigation 전에 서버 route와 데이터 경로가 예열된다. 따라서 cold first-hit에서만 나타나는 인증·라우팅 지연을 이 실행으로는 보장할 수 없다. 이번 과제의 “HTTP 직접호출로 UI 클릭을 대체하거나 예열하지 않는다” 조건에는 맞지 않는다.
- 최소 수정 대상: `friendGoalProbe` 4줄을 최종 독립 흐름에서 제거한다. HTTP 200 계약은 별도 API/route 케이스로 유지하고, 01A는 `친구목록 DOM → 실제 Link click → URL → 상세 DOM`만으로 끝낸다.

### P1 · F6의 ORDER-ATTR 전제인 staging `PAYMENTS_ENABLED=true`가 spec과 canonical verify에 없다

- 근거: `ORDER-ATTR-01`은 `cheer-order`의 201을 요구하지만 `social-web-first.spec.ts`의 `beforeAll`·`afterAll`에는 결제 flag 준비·복구가 없다. `.goal/feature-list.json`의 F6 명령도 flag 제어 wrapper를 명시하지 않는다.
- 로그: F6 v2는 01A 실패 뒤 ORDER-ATTR가 503 `payments_disabled`로 실패했다. F6 v3은 worker 재시작 뒤 ORDER-ATTR가 통과했으므로, v3 외부 wrapper는 npx process 전체에서 flag를 유지한 것으로 보인다.
- 판정: “첫 01A 실패 후 spec afterAll이 flag를 복구했다”는 가설은 현재 코드로 입증되지 않는다. 더 정확한 결론은 **v2 F6가 flag off 상태에서 ORDER-ATTR를 실행했으며, 어느 runner 경계가 복구했는지는 증거 부족**이다.
- 최소 수정 대상: 제품 코드가 아니라 S3 실행 wrapper·manifest다. F6 process 시작 전 1회 enable, process 종료의 `finally`에서 1회 disable, 종료 후 503 `payments_disabled` 확인을 단일 명령으로 고정한다. Playwright worker 재시작은 flag를 건드리지 않아야 한다. 실제 Toss 호출은 계속 금지한다.

## 타당한 수정과 보존된 경계

| 항목 | 판정 | 근거 |
|---|---|---|
| F6 v3의 유일 실패 | 테스트 selector 결함 | 전역 `getByRole('반려')`가 환전 2개와 커버 검수 1개를 합쳐 3개로 셌다. 제품 기능 실패가 아니다. |
| 관리자 selector 수정 | 타당 | `cashoutCards.getByRole(...)`로 환전 카드 내부만 세면서 기대 개수 2와 exact name을 유지한다(`3173-3180`). assertion을 삭제하거나 느슨하게 만들지 않았다. |
| 공유 fixture 제목·닉네임 | 타당 | 01A가 고정 `서연`·`토익 900 넘길게` 대신 현재 DB title과 exact goal href로 카드를 찾는다(`2565-2590`). F6 v3에서 PW-02가 바꾼 `토익 950 넘길게 해낼게`로도 통과해 순서 의존을 제거했다. |
| 초대 ACTIVE | 보존 | 초대 수락 뒤 connection `ACTIVE`, accepted_by·accepted_at, 친구 카드 1개를 각각 assertion한다(`2565-2590`). |
| 소유권·비공개 경계 | 보존 | 01B는 잘못된 friendId·PRIVATE·REMOVED를 실제 HTTP 404와 보호 DOM 0으로 확인한다(`2628-2704`). 01C는 비인증 307·정확한 next URL·landing DOM·보호 DOM 0을 확인한다(`2707-2735`). |
| private Storage path | 보존 | `QA-REVERIFY-SEC-01`이 친구 응답에는 signed URL만, 관리자 RPC에는 quarantine path가 있음을 분리한다. |
| 동시 accept 원자성 | 보존 | 두 actor의 같은 token RPC를 `Promise.all`로 동시에 실행하고 성공 1·already used 1·connection 1·winner accepted_at을 확인한다(`3409-3447`). |
| 지연 Storage cleanup | 구분 적절 | afterAll은 먼저 PENDING·object 존재·owner 분리·asset DELETED를 기록한 뒤, 정확한 queueId·assetId·objectPath만 강제 fixture 정리하고 세 항목 0을 다시 조회한다(`1240-1300`). `SOCIAL_FIXTURE_CLEANUP_ZERO`는 **자연 TTL cleanup이 아니라 test-owned forced cleanup 이후 0**으로만 해석해야 한다. |

## 로그 판정

- F5 v7: 7 passed, 실패 0, skip 0. 초대 happy, 소유권 404, 비인증 307, private path, PUBLIC/FRIENDS/PRIVATE, 동시 accept assertion이 포함됐다.
- F6 v2: 15 passed, 2 failed, skip 0. 01A는 앞선 PW-02의 제목 변경을 고정 문자열로 가정한 테스트 순서 의존, ORDER-ATTR는 flag off의 연쇄 실패다.
- F6 v3: 16 passed, 1 failed, skip 0. 01A와 ORDER-ATTR는 통과했고, 유일 실패는 관리자 전역 selector가 서로 다른 `반려` CTA 3개를 합친 문제다.
- F6 v4: 검토 시점 로그는 heavy-slot 대기 392 bytes뿐이다. 최종 17/17 결과로 사용하지 않았다.

## 다음 독립 실행 필수조건

1. builder 최종 로그가 **현재 검토 코드 hash 또는 후속 hash**와 일치하고 17 passed, failed 0, skipped 0이어야 한다.
2. 01A는 목표 상세 HTTP preflight 없이 실제 friend goal Link click으로 끝나야 한다. 별도 HTTP 계약 검사는 분리한다.
3. 결제 flag wrapper의 enable 범위가 F6 npx process 전체이고, worker 재시작 중 유지되며, `finally` 복구와 무인증 503 확인이 한 증거에 있어야 한다.
4. delayed avatar는 PENDING·object 존재를 먼저 기록하고, 이후 test-owned exact ID cleanup 0을 별도 표기해야 한다. 이를 natural cleanup PASS로 쓰면 안 된다.
5. 독립 qa-verifier는 최종 builder 로그 회수 뒤 F5 핵심 UI flow·접근 거부를 staging에서 1회만 실행해야 한다. 현재 문서는 실행 증거를 대신하지 않는다.

## 범위와 미검증

읽음: `.goal/s3-qa-recovery-prompt.txt`, D-049, `wiki/거버넌스/실수.md`의 assertion 범위·검사 범위 교훈, 현재 E2E diff, F5 v7, F6 v2·v3, payment control, v4 대기 로그. 읽지 않음: S1·S2 상류 전체, S3 브라우저 캡처, 운영·DB 상태. 따라서 제품 실제 독립 PASS는 미검증이다.

SKILLS_USED: qa, 테스트 assertion과 독립 실행 종료조건 판정에 사용. review, 변경 diff의 회귀·보안·fixture 수명주기 공격 검토에 사용.
SKILLS_SKIPPED: 없음.

KNOWLEDGE_QUERY: S3 recovery prompt, D-049, 관련 실수 기록, social-web-first diff, F5/F6 로그, payment control을 repo-local로 조회했다.
HITS_USED: D-049의 staging·최소정보 경계, 실수.md의 assertion 대상·검사 범위 교훈, 현재 spec line 1240-1350·2499-2735·3168-3180·3409-3497, F5 v7과 F6 v2·v3 로그를 판정에 사용했다.
HITS_REJECTED: S1·S2 전체와 F6 v4 부분 로그는 각각 범위 밖·실행 미개시라 판정 근거에서 제외했다. 외부 웹조사는 이미 정해진 테스트 복구 검토라 수행하지 않았다.
CONFLICTS: 없음. 다만 prompt의 “spec afterAll이 결제 flag를 복구했다” 가설은 현재 spec에 해당 코드가 없어 입증되지 않았다.

SOURCES/MODEL: gpt-codex(API model ID 미노출) | `.goal/s3-qa-recovery-prompt.txt` | `wiki/거버넌스/결정.md` D-049 | `wiki/거버넌스/실수.md` | `web/e2e/social-web-first.spec.ts` | S3 F5/F6/payment-control logs

PRESENTATION_CHECK: 내부 태그 잔재 없음 확인. 사용자 지정 단일 Markdown만 작성. 브라우저·렌더·E2E·DB 쓰기 없음.

RUBRIC_SCORE: evidence=5 traceability=5 clarity=5 completeness=5 presentation=4 total=24/25
WEAKEST_LINE: 결제 flag가 v2에서 정확히 어느 외부 runner 경계에서 off로 돌아갔는지는 실행 wrapper 원문이 없어 확정하지 못했다.
