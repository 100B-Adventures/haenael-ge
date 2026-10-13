# 해낼게 V2 운영 배포 후 최종 read-only QA

> **최종 출고 판정: ❌ NG**  
> 운영 배포와 인증 read-only 화면은 정상이나, 수용 경로로 지정된 `/admin/covers`가 권한 분기가 아니라 공통 404로 종료된다.

## 문서 정보

| 항목 | 값 |
|---|---|
| 라인 | v2 |
| 문서 버전 | 1.0.0 |
| 검증 시각 | 2026-10-13 23:42~23:49 KST |
| 운영 주소 | `https://haenael-ge.vercel.app` |
| 검증 방식 | 운영 read-only 브라우저 관찰, HTTP 헤더 실측, Playwright Chromium |
| 기반 포맷 | `docs/qa/v2-social-viral-loop-qa-v1.0.0-gpt-codex-20261013-1625.md` |
| 승인 산출물 | `pipeline-state.v2.md`의 design·eng-design v1.1.0 핀 |

STAMP: 2026-10-13 23:51 KST | model gpt-6.1-sol | agent qa-verifier | skill qa | 근거: 운영 브라우저·HTTP·Playwright 실측 | 고민: 운영 쓰기 없이 인증 화면과 라우트 계약을 함께 검증

## 목차

1. [판정 요약](#판정-요약)
2. [운영 경로별 판정](#운영-경로별-판정)
3. [인증 read-only 화면](#인증-read-only-화면)
4. [Viewport·콘솔·하단탭 실측](#viewport콘솔하단탭-실측)
5. [보안 응답 헤더](#보안-응답-헤더)
6. [운영 쓰기 방지](#운영-쓰기-방지)
7. [결함과 출고 결정](#결함과-출고-결정)
8. [보장 범위](#보장-범위)

## 판정 요약

| 출고 필수 항목 | 상태 | 직접 증거 |
|---|---|---|
| V2 신규 경로 해피·엣지 | ❌ 미충족 | 지정 7경로 중 `/admin/covers`가 390·1280 모두 HTTP 404 |
| 운영 인증 read-only 회귀 | ✅ 충족 | `/cashout`, `/my`를 390·1280에서 HTTP 200, 콘솔 오류 0, page error 0 |
| 운영 화면 디자인 핵심 수치 | ✅ 이번 범위 충족 | 가로 넘침 0, 모바일 하단탭 라벨 4개 모두 computed `13px` |
| 운영 보안 응답 헤더 | ✅ 충족 | 대표·신규·인증·오류·health 경로에서 정책 헤더 유지 |
| 운영 쓰기 금지 | ✅ 충족 | 금지된 비조회 요청 0, 전후 가시 데이터 카운트 동일 |

전체 관찰은 익명 14건(7경로 × 2폭), 인증 4건(2경로 × 2폭)이다. 총 18건 모두 가로 넘침은 0이었다. 최종 판정은 하나의 수용 경로 결함 때문에 NG다.

## 운영 경로별 판정

익명 상태에서 동일 경로를 390px과 1280px로 열었다. 브라우저는 redirect 최종 화면까지 관찰했고, HTTP 원응답은 별도 헤더 로그로 대조했다.

| TC | 경로 | 기대 분기 | 390px 실제 | 1280px 실제 | 판정 | 증거 |
|---|---|---|---|---|---|---|
| V2-PROD-ANON-01 | `/my` | 비로그인 권한 분기 | HTTP 307 → `/`, 랜딩 렌더, 콘솔 오류 0 | 동일 | ✅ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-my.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-my.png) |
| V2-PROD-ANON-02 | `/friends` | 비로그인 권한 분기 | HTTP 307 → `/`, 랜딩 렌더, 콘솔 오류 0 | 동일 | ✅ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-friends.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-friends.png) |
| V2-PROD-ANON-03 | `/friends/1` | 잘못된 상세 입력 오류 분기 | HTTP 404, 공통 not-found | 동일 | ✅ | 경로 계약상 `goal` query가 없으면 인증보다 먼저 not-found. [`390`](evidence/v2-production-final-readonly/browse-anon-390-friend-1.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-friend-1.png) |
| V2-PROD-ANON-04 | `/invite` | 비로그인 권한 분기 | HTTP 307 → `/`, 랜딩 렌더, 콘솔 오류 0 | 동일 | ✅ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-invite.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-invite.png) |
| V2-PROD-ANON-05 | `/invite/qa-token-that-does-not-exist` | 없는 토큰 오류 분기 | HTTP 200, “이 초대를 사용할 수 없어요 / 초대 링크를 찾을 수 없어요”, 콘솔 오류 0 | 동일 | ✅ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-invite-missing.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-invite-missing.png) |
| V2-PROD-ANON-06 | `/me/goal/1` | 비로그인 권한 분기 | HTTP 200, “권한이 필요한 화면이에요”, 콘솔 오류 0 | 동일 | ✅ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-goal-1.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-goal-1.png) |
| V2-PROD-ANON-07 | `/admin/covers` | 관리자 cover review 권한 분기 | HTTP 404, 공통 Next.js 404 | 동일 | ❌ | [`390`](evidence/v2-production-final-readonly/browse-anon-390-admin-covers.png) · [`1280`](evidence/v2-production-final-readonly/browse-anon-1280-admin-covers.png) |

`/friends/1`은 `web/src/app/(receiver)/friends/[friendId]/page.tsx`가 필수 `goal` query를 검증한 뒤 인증을 확인하는 계약이므로 오류 분기가 정상이다. 반면 `/admin/covers`는 수용 경로 자체가 없다. 기존 승인 설계와 코드는 cover review를 `/admin` 안의 섹션으로 두고 있으며, 익명 `/admin`은 실제로 307 → `/` 권한 분기를 수행했다.

## 인증 read-only 화면

자격증명은 `~/.sj-agent-harness/secrets/haenael-ge-qa-production.env`에서 주입했다. 값은 출력·로그·문서에 남기지 않았다.

| TC | 화면·폭 | HTTP·렌더 | 콘솔·page error | 가로 넘침 | 판정·증거 |
|---|---|---|---|---:|---|
| V2-PROD-AUTH-01 | `/cashout` 390 | 200, 잔액·이용료·원천징수·예상 지급액·전화번호 동의 영역 렌더 | 0 · 0 | 0px | ✅ [`스크린샷`](evidence/v2-production-final-readonly/authenticated-390-cashout.png) |
| V2-PROD-AUTH-02 | `/my` 390 | 200, 프로필·목표 empty·DB 집계 업적 3종·친구 목표 empty 렌더 | 0 · 0 | 0px | ✅ [`스크린샷`](evidence/v2-production-final-readonly/authenticated-390-my.png) |
| V2-PROD-AUTH-03 | `/cashout` 1280 | 200, 같은 read-only 정보 렌더 | 0 · 0 | 0px | ✅ [`스크린샷`](evidence/v2-production-final-readonly/authenticated-1280-cashout.png) |
| V2-PROD-AUTH-04 | `/my` 1280 | 200, 같은 read-only 정보 렌더 | 0 · 0 | 0px | ✅ [`스크린샷`](evidence/v2-production-final-readonly/authenticated-1280-my.png) |

Playwright 실행 결과는 1/1 PASS다. 이 수치는 위 네 화면 관찰과 쓰기 방지 assertion을 묶은 단일 시나리오 수다. 개별 화면 수를 과장해 네 테스트로 세지 않았다.

## Viewport·콘솔·하단탭 실측

| 항목 | 390px | 1280px | 판정 |
|---|---:|---:|---|
| 총 관찰 화면 | 9 | 9 | 18/18 실행 |
| `scrollWidth - clientWidth` | 전 화면 0px | 전 화면 0px | ✅ 가로 넘침 0 |
| 인증 `/cashout`·`/my` console error | 0 | 0 | ✅ |
| 인증 `/cashout`·`/my` page error | 0 | 0 | ✅ |
| 모바일 하단탭 라벨 computed font-size | `13px` × 4 | 데스크톱에서는 하단탭 비표시 | ✅ D-023 준수 |

익명 `/friends/1`과 `/admin/covers`는 HTTP 404 리소스 오류가 폭별 1건씩 콘솔에 남았다. 전자는 명세된 입력 오류 분기, 후자는 결함이다. 이를 애플리케이션 JavaScript 오류 0으로 합쳐 숨기지 않았다.

## 보안 응답 헤더

대표 페이지, 신규 경로, 인증 redirect, 404 경로, `/api/health`를 운영에서 직접 조회했다. 운영값은 `web/next.config.ts`와 기존 `docs/qa/security-report.md` 기준선과 일치했다.

| 정책 | 운영 실측 | 판정 |
|---|---|---|
| Content-Security-Policy | `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, 제한된 script·connect·frame source | ✅ 완화 없음 |
| `unsafe-eval` | 없음 | ✅ |
| Permissions-Policy | camera·microphone·geolocation 등 비활성화 | ✅ |
| Referrer-Policy | `strict-origin-when-cross-origin` | ✅ |
| HSTS | `max-age=63072000; includeSubDomains; preload` | ✅ |
| X-Content-Type-Options | `nosniff` | ✅ |
| X-Frame-Options | `DENY` | ✅ |
| X-Powered-By | 없음 | ✅ |

`script-src`와 `style-src`의 `unsafe-inline`은 기존 기준선에도 있는 hardening 부채다. 이번 배포에서 새로 느슨해진 항목으로 분류하지 않았다. 별칭 `https://haenaelge.vercel.app`는 canonical 주소로 HTTP 308 redirect하며, canonical 응답에서 전체 정책을 재확인했다.

벤치마크는 [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)의 HSTS·nosniff·referrer·CSP 권고, [W3C CSP Level 3](https://www.w3.org/TR/CSP/)의 `frame-ancestors` 정책 정의를 기준으로 삼았다. Playwright의 [Page API](https://playwright.dev/docs/api/class-page)를 따라 console·page error·viewport·screenshot을 같은 브라우저 세션에서 수집했다.

## 운영 쓰기 방지

| 안전장치 | 결과 |
|---|---|
| 금지된 비조회 요청 감시 | 0건 |
| `member`, `goal`, `friend_connection`, `friend_invite`, `cashout_request` 전후 가시 카운트 | 동일 |
| 환전 신청 버튼 | 클릭하지 않음 |
| 목표·응원·친구·초대 생성 | 실행하지 않음 |
| 원본 증거 | [`browser-evidence.json`](evidence/v2-production-final-readonly/browser-evidence.json) · [`Playwright 로그`](evidence/v2-production-final-readonly/playwright-auth-readonly.log) |

RLS 때문에 일부 friend 테이블 count는 `null`로 관찰됐다. 이를 “0건”으로 바꾸어 적지 않았고, 네트워크 쓰기 0과 전후 불변을 함께 근거로 썼다.

## 결함과 출고 결정

### QA-V2-PROD-ROUTE-01: `/admin/covers` 운영 경로 부재

| 항목 | 내용 |
|---|---|
| 심각도 | Major, 최종 출고 차단 |
| 실제 | 390·1280 모두 HTTP 404, 공통 Next.js 404 렌더 |
| 기대 | 관리자 cover review 화면의 비로그인 권한 분기 |
| 근본원인 | 최신 수용 경로는 `/admin/covers`인데 승인 FDD·화면 인벤토리·실구현은 cover review를 `/admin` 내부 섹션으로만 정의했다. 경로 계약이 갈라졌다. |
| 영향 | 지정 URL로는 cover review에 도달할 수 없고, 접근 제어 동작도 검증할 수 없다. |
| 수정 여부 | 미수정. 이번 과제는 보고 전용이다. |
| 재검증 종료증거 | `/admin/covers`가 공통 404가 아니라 승인된 권한 분기로 응답하고, 390·1280에서 콘솔 오류·가로 넘침 0 |

추천은 `/admin/covers`를 정식 경로 또는 `/admin` cover review 섹션으로의 인증 보존 alias로 계약에 명시하는 것이다. 어느 쪽이든 FDD·screen inventory·라우트 구현을 같은 경로로 맞춘 뒤 이 보고서의 18개 화면 조합을 그대로 재실행해야 한다.

## 보장 범위

이 QA가 보장하는 것:

- 2026-10-13 23:42~23:49 KST 운영 배포에서 지정 익명 경로 7개와 인증 경로 2개가 위 표처럼 응답했다.
- 인증 `/cashout`·`/my`는 Chromium 390px·1280px에서 렌더됐고, 콘솔 오류·page error·가로 넘침이 없었다.
- 모바일 하단탭 네 라벨이 운영 computed style 기준 13px였다.
- 관찰 중 금지된 제품 쓰기 요청은 없었고, 대상 데이터의 전후 가시 상태는 같았다.
- 운영 보안 응답 헤더가 코드·기존 QA 기준선보다 느슨해지지 않았다.

이 QA가 보장하지 않는 것:

- 관리자 계정으로 `/admin` cover review 해피 경로를 실행하지 않았다. read-only QA 계정은 관리자 계정이 아니다.
- 환전 신청, 목표·응원·친구·초대 생성과 같은 쓰기 플로우는 의도적으로 실행하지 않았다.
- Chromium 외 브라우저, 390px·1280px 외 viewport, 성능·부하를 이번 라운드에서 다시 측정하지 않았다.
- 전체 누적 회귀 스위트의 모든 케이스를 이번 운영 실측 라운드에서 재실행한 것은 아니다. 이 문서는 요청된 배포 후 read-only 경로 검증에 한정한다.

## 셀프심문과 레드팀

가장 그럴듯한 반론은 “승인 설계가 `/admin`만 정의했으므로 `/admin/covers` 404가 정상”이라는 주장이다. 그러나 이번 수용 요청은 `/admin/covers`를 V2 신규 경로로 명시했고, 그 경로에서 권한 분기를 판정하라고 요구했다. 승인 산출물과 최신 수용 경로가 충돌한 상태 자체가 결함이므로 PASS로 바꿀 근거가 없다.

까다로운 운영자 관점에서 보면 나머지 17개 화면 관찰이 정상이어도, 북마크·운영 매뉴얼에 지정된 관리자 URL 하나가 404이면 출고 가능한 상태가 아니다. 따라서 결함 하나를 평균으로 희석하지 않고 NG를 유지한다.

KNOWLEDGE_QUERY: BRAIN business index에서 신뢰 마찰·공유 장벽을 좁혀 조회하고, OWASP·W3C·Playwright의 운영 보안 헤더와 브라우저 관찰 기준을 검색했다.
HITS_USED: BRAIN 신뢰 마찰 원칙은 환전 화면을 쓰기 없이 검증하는 안전 경계에, OWASP·W3C는 응답 헤더 판정에, Playwright 공식 문서는 콘솔·page error·viewport 증거 수집에 사용했다.
HITS_REJECTED: 일반 마케팅·바이럴 사례는 운영 QA의 합격 기준과 직접 연결되지 않아 반영하지 않았다.
CONFLICTS: 승인 설계·실구현은 관리자 cover review를 `/admin`에 두지만, 최신 수용 요청은 `/admin/covers`를 요구한다. 이 경로 계약 충돌을 QA-V2-PROD-ROUTE-01로 등록했다.

SKILLS_USED: qa, 운영 브라우저·HTTP·Playwright 증거 수집과 결함 분류에 사용
SKILLS_SKIPPED: 없음
SOURCES/MODEL: gpt-6.1-sol | `pipeline-state.v2.md` | `docs/eng-design/fdd-social-viral-loop-web-first-v1.1.0.md` | `docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md` | `docs/design/screen-inventory.md` | `web/src/app` | OWASP HTTP Headers Cheat Sheet | W3C CSP3 | Playwright Page API
RUBRIC_SCORE: 완결성=5/5 정밀성=5/5 추적성=5/5 증거성=5/5 가독성=5/5 total=25/25
WEAKEST_LINE: 관리자 계정의 `/admin` 해피 경로는 이번 read-only QA 계정으로 미검증이다.
PRESENTATION_CHECK: 내부 태그 잔재 없음 / 8개 표·31개 링크 구조 확인 / 브라우저 렌더·가로 넘침 0·콘솔 오류 0 확인
