---
# pipeline-state.md — Stage Controller 런타임 상태 (각 레포 루트에 committed)
# `/pipeline init` 이 이 템플릿을 복사해 시드. 진실원은 이 파일.
project: haenael-ge
repo: /Users/sj/sj_code_master/haenael-ge
pipeline_version: 1
controller: claude             # 2026-07-17 user decision: Codex orchestration terminated; Claude owns all further orchestration.
current_stage: ship   # 2026-08-28 상류 5단계 전부 승인 완료(plan·design 이번 턴 마감). ship 만 남았다. # 2026-08-24 환전 신청 로컬 실여정 QA 착수. 화면·DB 동시 관찰, 반려·금액·최소액·중복·loading·overflow·프로토타입 정합 검증. (구 eng-design) # 2026-08-21 회장 "쭉쭉 진행해 기술설계 개발 QA" + 표현안 A안 확정. design 반영 후 eng-design→build→qa 연속 진행. (구 design) # 2026-08-21 이용료 10% 슬라이스 진행: design(프로토타입 반영) → build(코드) → review → qa 순. (구: 2026-07-23 v2 design 진행 중(마이페이지·프라이버시설정 와이어). 병행: build 재개(7-21~23) 3종 정책링크·소식받기·응원클로버·웰컴·약관 코드·배포 완료(prod 실측 GREEN), 미검증 2건(클로버 개수 UI·로그아웃)·보안결함 1건(cheer_public 필터) 다음 슬라이스로.
approved_stages: [plan, design, eng-design, build, qa]   # 플랫 인라인 리스트 — hook이 grep으로 읽는 단일 필드. /approve만 append.
approved_artifacts:   # 규약 = ~/.claude/standards/release-and-artifacts.md §1.1. 대시보드가 이걸 읽는다. 실물 없는 라벨 금지.
  plan:
    - { path: docs/prd-haenael-ge-v0.4.0.md, version: 0.4.0, status: approved, label: "PRD" }
    - { path: docs/risks.md, version: unversioned, status: approved, label: "리스크 원장" }
    - { path: docs/persona.md, version: unversioned, status: approved, label: "페르소나" }
    - { path: docs/one-thing.md, version: unversioned, status: approved, label: "One Thing" }
  design:
    - { path: DESIGN.md, version: 2.0.0, status: approved, label: "디자인 시스템" }
    - { path: docs/user-flow.md, version: 0.3.0, status: approved, label: "유저플로우" }
    - { path: scratchpad/cashout-full-journey-v3-opus.html, version: 3.7, status: approved, label: "환전 프로토타입" }
  eng-design:
    - { path: docs/fdd-haenael-ge-cashout-clover-lock-v1.0.0-opus5.md, version: 1.0.0, status: approved, label: "FDD 환전 잠금" }
    - { path: docs/fdd-haenael-ge-v0.1.0.md, version: 0.1.0, status: approved, label: "FDD 기저" }
    - { path: docs/api-contract.md, version: unversioned, status: approved, label: "API 계약" }
    - { path: docs/architecture.md, version: unversioned, status: approved, label: "아키텍처" }
    - { path: docs/design-patterns.md, version: unversioned, status: approved, label: "설계 패턴" }
    - { path: docs/folder-structure.md, version: unversioned, status: approved, label: "폴더 구조" }
    - { path: docs/test-plan.md, version: unversioned, status: approved, label: "테스트 계획" }
  build:
    - { path: docs/build-log.md, version: unversioned, status: approved, label: "빌드 로그" }
    - { path: "supabase/migrations/2026082*.sql", version: unversioned, status: approved, label: "환전 마이그레이션" }
  qa:
    - { path: docs/qa-tracker.md, version: unversioned, status: approved, label: "QA 트래커" }
    - { path: docs/core-cashout-qa-report-v1-gpt-codex.md, version: 1.0.0, status: approved, label: "환전 QA 리포트" }
    - { path: docs/core-cashout-design-conformance-matrix-v1-gpt-codex.md, version: 1.0.0, status: approved, label: "디자인 정합 대조표" }
    - { path: "qa/contracts/*.json", version: unversioned, status: approved, label: "QA 계약 정의" }
  ship:
    - { path: RELEASE.md, version: 1.2.0, status: approved, label: "릴리즈 매니페스트" }
    - { path: CHANGELOG.md, version: 1.2.0, status: approved, label: "변경 기록" }
stages:
  plan:       { status: approved, artifacts_ok: true }   # 2026-08-28 APPROVED (v0.4.0, 595줄). 미결이던 §10.7 Q9~Q11 처리: Q10(카카오 비즈앱+phone_number)=해소(member.phone 컬럼 20260805010000 + 운영 ALIMTALK 실발송 CASHOUT_REQUESTED·CASHOUT_PAID 각 1건), Q11(템플릿 사전심사)=해소(회장 2종 등록 확인), Q9(구글 provider 콘솔 활성)=**앱 출시로 defer**(LoginSheet.tsx:80 SHOW_SOCIAL_LOGIN=false 가 현 상태를 기록, 가역·비차단). §9 Q1~Q8 은 v0.3.0 승인분에서 이미 처리됨. (구 2026-07-26 REOPENED→v0.4.0: 로그인 확장(카카오+구글) + 알림톡 phone(비즈앱 전환) + 본인인증=환전만 명문화. 회장 결정 3/3 확정. prd-architect 위임 중. (2026-07-21 v0.3.0 승인분은 유효, v0.4.0이 계승)
  design:     { status: approved, artifacts_ok: true }   # 2026-08-28 APPROVED. 잔여였던 안내문구 볼드 강조가 코드에 반영된 것을 컨트롤러가 직접 확인(CashoutRequestForm.tsx:506 `<b>입금이 끝나면 그때 N개가 빠져요.</b>`, SplitBalanceCard.tsx:120 `<b>{total}개는 그대로</b>`). 실화면 대조 confirm 507.16px(시안 510)·submitting 614.94px(시안 617). (구 2026-08-22 A안(잠금 유지) 반영 완료: 프로토 v3.6 + DESIGN.md v1.12.0(§6-(d) 잔액 표기 규칙 신설·SplitBalanceCard 등록·A안 확정 이력) + user-flow §5.5. **화면 픽셀 대조 일치 판정**(컨트롤러가 모바일 390 실화면 me-390-locked-v5.png와 프로토 v3.6을 좌우 합성 qa-compare-v5.png로 직접 대조). 잔여 경미 1건: 안내문구 볼드 강조 미적용(리뷰 3차 지적과 함께 처리 예정). /approve design 대기. (구 2026-08-21 이용료 10% 반영 완료: 프로토타입 v3.4(회장 지적 3건 반영 — 차감표 1줄화·안내 2블록 분리·.u-side 갭 규칙 승격 5화면) + DESIGN.md v1.10.0 §8 UX 라이팅 신설. verify PASS(Score A−, RUBRIC 24/25), 컨트롤러 모바일 캡처 2장 직접 육안 대조. /approve design 대기. (구 REOPEN 사유: 이용료 10%: 승인 프로토타입 scratchpad/cashout-full-journey-v3-opus.html 541-546행 및 docs/WIREFRAMES/cashout.html 119-120행이 '수수료 미정' 플레이스홀더 — 10% 확정으로 정본이 어긋남. product-designer 위임. (구: 2026-07-22 프로토타입 완성(verify PASS·A-) — 회장 피드백 대기. 갈림길 2건(프라이버시진입·고객센터이메일) 미결. 재open 금지 규칙 적용(이미 1회 open하게 있음)
  eng-design: { status: approved, artifacts_ok: true }   # 2026-08-01 수동환전 계좌수집 계약 v1.2 승인(492줄·매핑갭0·코드0건). (2026-07-31 ⟲ REOPEN(수동환전 계좌수집 슬라이스): design 승인 완료(회장 "플로우 OK", 프로토타입 cashout-full-journey-v3-opus.html, verify PASS Score A− + 컨트롤러 실측 줄표0·배치분기23). 이제 계좌 저장/암호화 스키마·RPC 계약을 회장과 티키타카(§6.3.5)로 확정해야 함. 기저 6문서 승인분(2026-07-05)은 유효.
  build:      { status: approved, artifacts_ok: true }   # 2026-08-27 반려 사유 전부 해소. 시안정합 3건(확인화면 1346→371px·로딩화면 1505→403px·워드맵 12→6개) 수정 후 컨트롤러가 Storybook 캡처를 직접 열어 육안 확인, 회장 확인 완료. 빌드 통과·vitest 269/269·test:qa-contracts 깨뜨리기 8건 전부 검출. 환전 실동작은 운영 4건 지급·알림톡 2종 발송으로 확인됨. **2026-08-27 승인 완료.** (구 2026-08-26 부분 해소: 환전 실동작 확보(운영 5건 처리·알림톡 2종 발송 확인). 해소분=본인인증 게이트 완화(20260825010000)·최소기준 총보유 판정·오류사유 보존·notify 인증 교체·관리자 Slack 통지. **미해소=2026-08-22 code-review MAJOR 4건 중 시안정합 잔여(전용 확인단계·loading 전환·워드맵 미리보기 개수)**. 이 잔여가 남아 changes-requested 유지. (구 2026-08-22 2차 code-review 또 BLOCK(MAJOR 4건, 전부 "계산은 A안인데 그 계산을 설명하는 화면들이 B안 그대로"). ①status:55 beforeBalance를 라이브 총량에서 역산 → PAID 배너가 계속 떠서 이후 응원분이 얹힘("60개에서 30개" 같은 존재한적없는 수) ②CashoutRequestForm:333-334가 §6-(d)① 예고 누락 + 폐기어 "돌아옵니다" + 죽은 라벨 "환전 진행중"(프로토 v3.6 문구가 코드에 안 옴) ③관리자 admin/page:316,57,59 + CashoutQueue:243 "반려하고 복원"이 허위(A안 반려는 delta=0, 복원할 것 없음) ④status:97-105가 잠김 화면인데 SplitBalanceCard 미적용(사용가능 행·분할막대 없음). 컨트롤러 코드 직접 확인 4/4 사실. **MAJOR 4건 중 테스트가 잡는 것 0건** — 246 PASS와 무관. 1차 BLOCK 3건은 라인대조로 실제 해소 확인. (구 3건 수정 완료. 컨트롤러 직접 확인: DROP FUNCTION request_manual_cashout(:21) / 게이트 3종 복원(:426 actor NULL, :448 reveal_required, :462 account_purged_at) / ManualCashoutForm.tsx 삭제됨 / pgTAP 재실행 Files=10 Tests=246 PASS. 부수성과: cashout_security_hardening.test.sql이 안 돌던 진짜 원인 = pgtap에 최상위 like() 없음(alike가 정답), 교체 후 첫 통과. (구 BLOCK 3건. ①B안 함수 request_manual_cashout이 authenticated GRANT 살아있어 사용자 직접 호출 시 이중 차감(20260821:108, 20260822에서 미조치) ②admin_mark_cashout_paid 재정의가 20260802 보안게이트 3개 삭제(계좌열람 10분게이트/actor NULL거부/account_purged_at) — 컨트롤러 grep 직접 확인, 신규 파일에 3항목 등장 0회 ③입금완료 화면이 DESIGN §6-(d) 필수문장(감소 전후 대조+회수경로) 누락. 재위임 중. (구 재작업 완료, code-review 진행중. 컨트롤러 직접 재실행 증거: next build EXIT=0 / vitest 227-227 / Playwright 11-11(개발자 실행) / 인증세션 실렌더 캡처 2장 직접 열람(52유지+분할, 지급후 52→12+블록소멸) / 마스킹 단언 변경 0건. 운영 DB 미적용·미커밋. (구 1차 반려·재작업 중. 반려사유 3건: ①next build 실패를 "기존 결함"으로 오진(실제로는 database.types.ts 재생성이 update_goal p_reason을 string|null→string으로 좁혀 GoalEditSheet.tsx:102를 깬 것 = 이번 변경이 원인) ②Playwright 미실행(typecheck만) ③인증 세션 화면 미확인(307 리다이렉트만). 컨트롤러 직접 재실행 확인분: vitest 227/227 PASS. 산출: supabase/migrations/20260822000000_cashout_clover_lock_a1.sql, web/src/components/goal/SplitBalanceCard.tsx. (구 2026-08-21 이용료 10% 구현 완료. 두 RPC 모두 30000→25819 로컬 실행 확인, pgTAP 235/235, vitest 223/223(컨트롤러 직접 재실행), Playwright 11/11, build PASS. 운영 DB 미적용·미커밋. /approve build 대기. (구 REOPEN: 이용료 10% 슬라이스: 약관·환전화면·withholding 모듈·RPC·E2E 5곳 계산식 일원화. code-builder 위임 실행 중. 이후 code-reviewer(돈코드) → qa-verifier 필수. (구: 2026-07-17 6차 승인: /how 페이지 신설. (5차: 리드폼 정책링크·wordmap 404·GA4 배선 4종·Slack 커버리지. verify PASS + 컨트롤러 직접 재확인(web 98/98·build PASS)
  qa:         { status: approved, artifacts_ok: true }   # 2026-08-27 시안정합 3건 해소 확인(위 build 참조). QA 계층 신설분 유지: `npm run test:qa-contracts`(production env var 존재·DB↔UI 판정기준 대조·notify 계약·DB RAISE 13개 전수·시험데이터 가입직후 기준) + 깨뜨리기 8건 전부 검출 + `npm run qa:verify-production` 3건 통과. **잔여 갭: 운영 E2E 부재**(playwright baseURL 이 localhost, 로컬 Supabase 미기동). Storybook 우회로 화면은 확인 가능해짐. **2026-08-27 승인 완료(잔여 갭 회장 인지분 명시).** (구 2026-08-26 QA 계층 복구: `npm run test:qa-contracts` 신설(production env var 존재·DB↔UI 판정기준 대조·notify 계약·DB RAISE 13개 전수·시험데이터 가입직후 기준). **깨뜨리기 시험 8건 전부 검출(failures=0).** 단위 263/263·빌드 통과. **미해소=시안정합 잔여 + 운영 E2E 부재**(playwright baseURL 이 localhost. 운영 1바퀴 자동검증 경로 없음). changes-requested 유지. (구 2026-08-24 로컬 실여정: 신청→관리자 계좌 열람→지급, 신청→반려, 금액 30K·40K, 중복, loading, 101건 너머 검색은 화면+실로컬 DB 관찰 통과. 승인 프로토타입 v3.7의 전용 확인·loading 전환과 dev가 불일치하고 워드맵 미리보기 6→12도 불일치해 디자인 정합 FAIL. 최소액 영어 native 문구·전역 design-lint 경고도 남아 changes-requested. 증거 `docs/core-cashout-qa-report-v1-gpt-codex.md`, `docs/core-cashout-design-conformance-matrix-v1-gpt-codex.md`. (구 2026-08-22 A안 백엔드 QA 통과(관찰됨, 로컬 db reset 후 실 RPC 호출+원장 직접조회): 신청 직후 총량 52 불변/잠김 40, 지급완료에 52→12 감소, 반려 시 52 불변(처음과 동일), 중복신청·최소액미달 거부, 불변식 I1·I2 전 시점 성립, 30000→25819·40000→34426 실호출 일치. **화면 픽셀 대조는 미검증** — qa-verifier 도구셋에 브라우저 없음(하네스 갭, open-decisions 등록). QA 독립 발견 결함 2건(CashoutQueue:243 "복원" 금지어=2차 리뷰 MAJOR3과 교차확증, status:64 "잠금이 풀렸어요" 안내 누락). build 2차 재작업 대기. (구 2026-08-21 ⟲ REOPEN(이용료 10%): 기준값 4종(30000→25819 등) 재현 + 환전 한 바퀴 실행이 증거. (구: 2026-07-17 prod 직접 관찰: 정책링크·브랜딩404 실서빙, 리드 E2E(DB row+Slack 실수신), GA4 /g/collect 발화+Realtime 실수신. 신규 P2(/how 데드링크) 백로그
  ship:       { status: in-progress, artifacts_ok: partial }  # 2026-07-18 rosemallow95 이전+웰컴클로버 prod 실검증 완료(haenaelge.vercel.app). 환전/DM/토스만 잔여         # GA4·Slack·리드·카카오 로그인 = 운영 실검증 완료(2026-07-17). 남은 partial 사유=Toss 실키 1건
override: false               # 게이트가 build 단계 소스쓰기를 정상 허용하도록 hook 수정(2026-07-06) → override 불필요
override_reason: ""
override_expires: ""          # ISO8601; 지나면 게이트 자동 재무장
---

# Pipeline State — haenael-ge

> 브랜드 **해낼게** · 슬로건 "응원은 돈으로 하는 겁니다." · 성장응원 도네이션 양면시장
> 제품 정본(brain): `wiki/business/pmf/idea-성장응원-도네이션-플랫폼.md`

## 산출물 체크리스트
### plan  ✅ (approved 2026-06-29, prd=v0.2.0 핀)
- [x] docs/prd-haenael-ge-v0.2.0.md
- [x] docs/one-thing.md
- [x] docs/persona.md
- [x] docs/bm.md
- [x] docs/risks.md

### design  ✅ (approved 2026-07-04 05:19 KST, design=DESIGN-v1.6+ 핀)
- [x] DESIGN.md (v1.6+)
- [x] docs/user-flow.md (dead-end 0)
- [x] docs/WIREFRAMES/*.md (10화면, coverage ❌0)
(2026-06-29 "갈림길 대기" 메모는 stale — 이후 design 직행으로 확정·완주됨)

### eng-design  ✅ (approved 2026-07-05, 6문서 1100줄·ERD 12테이블)

### build  ✅ (approved 2026-07-16 06:36 KST, 3차 최종 하드닝까지 — build-log.md가 상세 진실원)
- B1(코어 무료 루프)+B2(결제)+v1.0.0 출시기능(리드·GA4코드·Slack코드·kill switch·webhook)까지 전부 구현·Codex money-code 2nd-pass 다회 통과.
- 결제/리드 SECURITY DEFINER RPC 하드닝 3라운드 종결(payment_key NULL우회·잔액부족영구롤백·lead NULL해시·이메일중복레이스·amount_krw NULL우회 전부 수정+Codex PASS).

### qa  ✅ (approved 2026-07-16 06:36 KST, 로컬 전항목 GREEN — qa-tracker.md가 상세 진실원)
- pgTAP 110/110·web unit 88/88·production build PASS·동시성 4종 ALL PASS·release E2E 3/3 전부 컨트롤러 직접 재확인.
- `prod-health-200`/`prod-demo-login-200`은 배포 전 물리적 수집 불가한 구조적 갭이라 ship 단계 실배포 후 사후수집으로 명시 이관(회장 결정) — "qa approved"가 "prod 완전검증"을 뜻하지 않음, 착오 방지용으로 여기 명기.

### ship  🔄 (in-progress, artifacts_ok: partial — 아래 "Blocked / Notes" 최상단이 상세 진실원)
- 프로덕션 인프라 + 무료 코어 루프 = 라이브(관찰됨: Supabase 16 migration 무드리프트·EF 11개 ACTIVE·Vercel READY·`/api/health` 200).
- 결제(Toss) = kill switch로 의도적 비활성(설계대로, 결함 아님).
- GA4·Slack·Toss 실키·카카오 = 자격증명 부재로 미착수·미검증(ship 완료 조건, launch blocker 아님 — 무료 코어 공개는 별도 판단).

<!-- 위 요약은 인덱스일 뿐, 각 단계 승인 근거의 상세 서술은 아래 "승인 로그"가 진실원 -->

## 승인 로그

2026-08-28 04:50 KST — design APPROVED — 유일 잔여였던 "안내문구 볼드 강조 미적용"이 해소된 것을 컨트롤러가 코드에서 직접 확인했다. `web/src/components/cashout/CashoutRequestForm.tsx`:506 `<b>입금이 끝나면 그때 {cloverAmount}개가 빠져요.</b>` / `web/src/components/goal/SplitBalanceCard.tsx`:120 `<b>{total}개는 그대로</b>` — 승인 프로토타입 v3.7 의 712행·632행 강조와 대응한다. 실화면 대조: confirm 507.16px(시안 510) · submitting 614.94px(시안 617), E2E 캡처 실측. 재검증: 빌드 EXIT=0 / vitest 269-269 / Playwright 12-12 / test:qa-contracts 깨뜨리기 8건 전부 검출. (artifacts: DESIGN.md v2.0.0, docs/user-flow.md v0.3.0, scratchpad/cashout-full-journey-v3-opus.html v3.7)

2026-08-28 04:50 KST — plan APPROVED — PRD v0.4.0(595줄) 승인. 미결로 남아 있던 §10.7 Q9~Q11 을 사실 확인으로 닫았다. **Q10(카카오 비즈앱 전환 + phone_number 동의항목) = 해소** — `supabase/migrations/20260805010000_member_phone_alimtalk.sql` 로 member.phone 이 실재하고 운영에서 ALIMTALK 이 CASHOUT_REQUESTED·CASHOUT_PAID 각 1건 실발송됐다. **Q11(템플릿 사전심사) = 해소** — 회장이 2종 등록을 확인했다. **Q9(구글 provider 콘솔 활성) = 앱 출시로 defer** — `web/src/components/auth/LoginSheet.tsx`:80 `SHOW_SOCIAL_LOGIN = false` 가 현 상태의 진실원이고, 코드·테스트는 보존돼 있어 콘솔 설정만으로 되살아난다. 가역이고 출시 비차단이라 plan 승인을 막지 않는다. §9 Q1~Q8 은 v0.3.0 승인분에서 이미 처리됐다. (artifacts: docs/prd-haenael-ge-v0.4.0.md v0.4.0)

2026-08-28 04:50 KST — ship 결함 1건 발견·수정 — 운영 `/api/health` 가 `version:"1.0.0"` 을 반환하는데 `RELEASE.md` 는 1.2.0 이다. 원인은 Vercel 운영 환경변수 `NEXT_PUBLIC_APP_VERSION` 이 40일 전 값(1.0.0)에 멈춰 있던 것. **릴리즈 매니페스트의 존재 이유가 "지금 운영에 뭐가 올라가 있나"에 답하는 것인데 그 답이 틀려 있었다.** 1.2.0 으로 갱신했고 다음 배포부터 반영된다.

2026-08-27 20:04 KST — build APPROVED — 시안 정합 3건 해소(확인화면 1346→371px·로딩화면 1505→403px·워드맵 12→6개). 회장이 대조 페이지 확인 후 GO. 재검증: 빌드 통과 / vitest 269-269 / test:qa-contracts 깨뜨리기 8건 전부 검출. (artifacts: RELEASE v1.2.0, commit 7435619)

2026-08-27 20:04 KST — qa APPROVED — 운영 실경로 재검증 통과. qa:verify-production 3건(홈 200·약관 이용료 10% 10곳·5% 0곳·환전화면 200). 운영 환전 4건 지급 완료. 환전 알림톡 실발송 기록 CASHOUT_REQUESTED·CASHOUT_PAID 각 1건 ALIMTALK 확인. **잔여 갭 회장 인지분: 운영 E2E 부재(playwright baseURL localhost), 전역 디자인 검사 경고 1건.** (artifacts: RELEASE v1.2.0, commit 7435619) (append-only)
2026-08-21 — build AWAITING-APPROVAL (이용료 10% 슬라이스) — ★BLOCKER 1건을 발견·해소하고 완료. **컨트롤러 지시서가 죽은 DB 함수를 지목한 것이 원인.** 실사용 경로는 cashout/page.tsx → CashoutRequestForm → actions.ts:136-137 → `create_cashout_request`인데 지시서는 `request_manual_cashout`을 지목했다. 후자의 호출처는 web/src/components/receiver/ManualCashoutForm.tsx:31 하나뿐이고 임포터 0건이며, **운영 DB에는 함수 자체가 존재하지 않음**(컨트롤러 read-only 조회로 확인). 그대로 배포했으면 화면 25,819원 / DB 29,010원. 변경 전(양쪽 29,010원 일치)보다 나빠지는 상태였다. 근본 원인: 마이그레이션 파일에서 함수를 찾고 실사용이라 가정, UI→액션→RPC 역추적 미실시. 교훈: 돈 코드는 호출 경로부터 역추적. / 구현 범위: withholding.ts(platformFee 0 제거), web/src/lib/cashout-fee.ts(신규 웹 정본), cashout/page.tsx(인라인 계산 제거+승인 카피), **CashoutRequestForm.tsx(Codex 교차리뷰가 발견 — 폼 미리보기와 최종확인이 옛 식을 따로 돌려 한 화면에 25,819와 29,010 동시 노출)**, terms/page.tsx(5%→10%·원천징수 기준 명시·PAYMENTS_ENABLED 허위문장 제거), privacy/page.tsx(결제 준비중 허위문장만 삭제, 수집항목 무변경 2+/4- diff), e2e, pgTAP 2곳(fee_krw 단언 추가=강화), 신규 마이그레이션 20260821000000(두 RPC 모두 CREATE OR REPLACE). / 증거: 두 RPC 격리 DB 실호출 각각 30000|3300|881|25819, pgTAP 10스위트 235단언 통과, **컨트롤러 직접 재실행 vitest 223/223**, Playwright 11/11, build PASS, tsc 신규에러 0(기존 2건 HEAD 대조). 계좌 마스킹 단언 변경 0줄(컨트롤러 git diff 확인). 운영 DB has_10pct=false 확인 = 미적용. 커밋·푸시 없음. / ⛔ 회수 3건: ①추가된 REVOKE/GRANT 2문 유지 여부(추천 유지) ②pgTAP like() 부재는 이 레포 테스트 실행 경로 전반 문제일 수 있음 ③죽은 코드 삭제 시점. (artifacts: build=fee-10pct-2RPC-pgTAP235)

2026-08-21 — design AWAITING-APPROVAL (이용료 10% 슬라이스) — 산출물: scratchpad/cashout-full-journey-v3-opus.html v3.4 + DESIGN.md v1.10.0. 회장이 v3.3을 직접 보고 지적한 3건 반영: ①차감표 "사업소득 원천징수 3.3% / 국세청에 대신 냅니다" 2줄 행을 1줄로 되돌림(꼬리표 제거, 설명은 표 밖으로) ②안내를 회장이 말한 납득 순서대로 2블록 분리("커피 한 잔 값"+쓰임새 2줄 / "저희가 가져가는 돈이 아니에요"+2줄). 회장이 새로 짚은 "도전과 응원 확산" 결은 선언이 아니라 돈의 쓰임새 문장으로 수용 ③모바일 갭 0 수정 — **화면 하나가 아니라 규칙의 구멍이었다**: #reqForm만 예외 땜질돼 있었고 같은 결함이 신청확인·완료·중복차단·진행상태 4화면 더. `.u-side` 공통 규칙(margin-top:24px, DESIGN.md §3.3 4px 그리드)으로 승격. 추가 산출: DESIGN.md §8 UX 라이팅 신설(263줄) — 보이스·용어사전 7종(수수료 금지→이용료, 후원·기부 금지→응원, 정산·출금 금지→환전)·돈 차감 표기 5규칙·실문장 GOOD/BAD 6쌍·금지. 회장 지적 "디자인시스템도 없냐"에 대한 사실관계: DESIGN.md는 있었고 UX 라이팅 축만 없었음. 검증: verify-agent-quality PASS(Skill 2회·WebSearch 3회·소크라마커 7·Design Score A−), RUBRIC 24/25, 컨트롤러가 request-confirm-390.png·crop390.png 직접 Read해 갭 확보·표 1줄화 육안 확인. 벤치마크 실조사 2건(Dots 크리에이터 지급 대시보드, Patreon 수수료 구조). ⛔ 회수: 약관 "서비스 이용수수료" 14회가 UI "이용료"와 불일치 — 회장 판단 대기. (artifacts: design=cashout-journey-v3.4 + DESIGN-v1.10.0)

2026-08-21 — ⟲ REOPEN design + build + qa (이용료 10% 확정 슬라이스) — 회장이 환전 서비스 이용료를 10%로 확정(근거: "3만원 받으면 2만5천원은 실제로 받아야 거부감 적다", 10% 적용 시 실수령 25,819원=86.1%). 이 결정이 승인된 design 산출물과 배포된 코드를 동시에 무효화한다. ①design: 승인 프로토타입 scratchpad/cashout-full-journey-v3-opus.html(541-546행)과 docs/WIREFRAMES/cashout.html(119-120행)이 "서비스 수수료 -(미정%)" 플레이스홀더 상태 — 정본이 확정값과 어긋남. ②build: 계산식이 5곳에 중복(약관 5% / 환전화면 "플랫폼 수수료 없이" / withholding.ts platformFee=0 / RPC fee_krw 리터럴 0 / E2E) — 3중 불일치를 10%로 일원화. 원천징수 기준도 총액 → 이용료(VAT포함) 차감 후로 약관과 정합. ③qa: 기준값 4종 재현 + 환전 한 바퀴 실행 필요(cashout_request 0행 = 실행 이력 없음). 회장 지시: "약관수정하면 프로토타입도 수정해야하고 개발하면 리뷰도해야하고 QA도해야한다" — build만 돌리고 종결하려던 컨트롤러 판단을 교정. 순서: design → build → code-reviewer(돈코드) → qa. 마이그레이션 운영 적용은 회장 승인 후.

2026-06-29 — INIT — 파이프라인 시드, current_stage=plan (산출물 0, README만 존재)
2026-06-29 17:23 KST — plan APPROVED — PRD 풀세트 5종 재검증 통과, 회장 대화로 코어 루프 정밀화 + Open-Q 6개 닫음 (artifacts: prd=haenael-ge-v0.2.0)
2026-07-04 05:19 KST — design APPROVED — WIREFRAMES 10화면·user-flow dead-end0·coverage ❌0 재검증, design-review 스킬 QA 통과(실버그 3건 수정), v2 정본 승격, 금액3층·스코프제외(pledge/admin/달성) 명시. 랜딩 추가정제·앱친구피드=phase2 defer (artifacts: design=DESIGN-v1.6+, wireframes 10화면)
2026-07-05 — eng-design APPROVED — 6문서 1100줄·ERD 12테이블·매핑 갭 0·verify PASS. 스택(Supabase 서버리스)·자금무보유 패스스루·독립코드베이스·정책값·카카오/알림톡/간편결제/GA4/PASS본인인증/모더레이션 전부 회장 소크라테스 확정. 보안=build Codex 리뷰 위임. ⛔ legal 4건(선불수단·개인정산·take-rate·국외이전)=build 결제파트 밑돌. (artifacts: fdd=v0.1.0, eng-design 6문서)
2026-07-14 00:03 KST — build APPROVED — docs/build-log.md 596줄 재검증(슬라이스 #1~#10 + B2 결제 전 과정 기록). B2 결제 코드는 Codex money-code 2nd-pass 4라운드(cancelPayment 검증→cheer-order 남용방지→동시성 blocker→request_key fingerprint)를 거쳐 **Codex 최종 PASS** 확보. 컨트롤러 직접 fresh 재검증 누적: web unit 69/69·build PASS·pgTAP 72/72(payment_abuse_guard 20+rls_policy 52)·실제 병렬 psql 세션 스크립트 3종(rate_limit_race·request_key_race·request_key_fingerprint_race) ALL PASS·Playwright goal-flow 14/14 PASS(회귀). 실 Toss 결제(진짜 test secret 없음)·Supabase 클라우드·Vercel 링크는 미검증/미착수로 남음(qa/ship 단계 밑돌로 이월). (artifacts: build=build-log-596줄-Codex4라운드PASS)
2026-07-14 01:10 KST — qa AWAITING-APPROVAL(미승인, PASS-with-gaps) — qa-verifier 위임 후 컨트롤러가 그 자체보고를 그대로 신뢰하지 않고 직접 재검증. build/DB(pgTAP 72/72)/web unit(69/69)/EF smoke/정적 코드리뷰 GREEN. **E2E는 qa-verifier의 "28/29 PASS" 주장이 컨트롤러 독립 재실행(2회, 10/29 PASS)과 불일치해 직접 근본원인 추적** — `next dev` Turbopack HMR WebSocket 핸드셰이크 간헐적 실패로 React 하이드레이션이 깨지는 환경 버그(앱 코드 결함 아님, `docs/qa-tracker.md` §5-보정 상세) 확인. `next build && next start`(프로덕션 서버)로 전환 + `supabase functions serve` 재기동 + report-flow.spec.ts 전용 env var(PLAYWRIGHT_BASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY) 보정 후 **27 passed·2 정당스킵·0 failed** 재확인 — 이걸 진실원으로 채택. **게이트 미통과 사유(구조적, 코드 문제 아님): `stages.yaml` qa 필수증거 `prod-health-200`·`prod-demo-login-200`이 Supabase 클라우드/Vercel 미배포로 물리적 충족 불가.** approved_stages에 qa 미추가, current_stage는 qa 유지. 회장 판단 대기(override 승인 vs cloud bootstrap 후 재평가). (artifacts: qa=PASS-with-gaps-prod증거2건미충족)
2026-07-14 — build REOPENED — 회장 승인 48시간 v1.0.0 출시계획에 따라 리드 저장·GA4·Slack 알림·Toss 웹훅·운영 kill switch를 신규 build 범위로 편입. 기존 QA 증거는 기준선일 뿐이며 신규 diff 재검증·Codex 돈코드 리뷰·build/qa 재승인 전 출고 금지. (artifacts: release-plan=2026-07-14-48h-v1.0.0)
2026-07-15 — v1.0.0 LOCAL RELEASE CANDIDATE — 리드·GA4·Slack·health·kill switch·Toss webhook/취소 재조정 구현. pgTAP 95/95, web unit 71/71, production build PASS, release E2E 3/3, 실제 DB lead+UTM 저장 관찰. 운영 배포는 Supabase access token/project와 실 secrets 부재로 미검증. Codex 최종 재리뷰 진행 중. (artifacts: qa-tracker-2026-07-15)
2026-07-16 03:02 KST — build APPROVED(재승인) — v1.0.0 재오픈분(리드·GA4·Slack·kill switch·Toss webhook 재조정) 산출물·증거 재검증 통과. `toss-webhook`은 Codex money-code 2nd-pass를 3라운드 거쳐(요청단위 테스트 부재 지적→해소, null/array/원시값 JSON dereference 재지적→해소) **Codex 최종 재리뷰 PASS(No P0-P2 findings)** 확보. `docs/build-log.md` 605줄 재검증. 컨트롤러 직접 fresh 재확인: web unit **86/86** PASS·`NEXT_PUBLIC_APP_VERSION=1.0.0` production build PASS·migration 드리프트 없음·pgTAP **95/95** PASS(payment_abuse_guard 20+release_v1 23+rls_policy 52)·release-v1.spec.ts **3/3** PASS(격리 포트 3463, `next start` 프로덕션 모드로 재기동해 직접 관찰). 실 Toss 웹훅 왕복·Slack 실발송·Supabase 클라우드/Vercel 배포는 여전히 미검증(secret·계정 부재, qa/ship 단계 밑돌로 이월). current_stage → qa. (artifacts: build=build-log-605줄-v1.0.0-Codex최종PASS)
2026-07-16 03:25 KST — qa AWAITING-APPROVAL(미승인, PASS-with-gaps) — qa-verifier가 v1.0.0 전체(B1+B2+신규 출시기능)를 빌드→DB→unit→EF curl→prod모드 E2E까지 fresh 재실행, 컨트롤러가 핵심 수치(web 86/86·build PASS·pgTAP 95/95)를 독립 재확인. 로컬 전 항목 GREEN(EF smoke 전부 관찰됨, `/api/health` 200, E2E 45/46 — 1건은 `NEXT_PUBLIC_PAYMENTS_ENABLED` kill switch 기본값 off로 인한 정상 disabled 상태를 구 테스트가 반영 못한 테스트부채로 확정, 앱버그 아님·컨트롤러가 `CheerPaymentButton.tsx:38` 코드로 직접 재확인). **신규 발견**: qa-verifier가 이전에 Codex 리뷰 대상에서 빠졌던 `payment_webhook_reconciliation.sql`+`release_review_fixes.sql`에 Codex money-code 2nd-pass를 처음 실행 → **REJECT 4건**(①`reconcile_canceled_payment` payment_key NULL 우회 `!=`→`IS DISTINCT FROM` 필요, 컨트롤러가 코드 직접대조로 실재 확인 ②DONE취소 시 잔액부족 영구롤백=cashout 미출시라 v1.0.0 도달불가 ③`capture_lead` NULL submitter_hash fail-open=EF가 선차단해 현재 도달불가 ④이메일 중복 SELECT-then-INSERT 레이스=재현 가능·저빈도). 전부 "현재 단일 호출자 기준 도달 불가"로 즉시 launch blocker는 아니나 REJECT 상태 그대로 다음 build 라운드 인계 대상. **게이트 미통과 사유 2종**: (a)구조적 — `prod-health-200`/`prod-demo-login-200` Supabase클라우드/Vercel 미배포로 물리적 미충족 (b)코드 — Codex REJECT 4건 미해소. approved_stages에 qa 미추가, current_stage는 qa 유지. **회장 판단 대기: v1.0.0을 이 4건 tracked 상태로 지금 출시할지, build 재오픈해 먼저 닫을지.** (artifacts: qa-tracker-2026-07-16-PASSwithgaps-CodexREJECT4)
2026-07-16 03:35 KST — build ⟲ REOPENED — **회장 판단 확정: tracked 출시 거부.** Codex REJECT 4건 전부 수정 후 재승인 필요. 스코프: ①`reconcile_canceled_payment` payment_key NULL 우회 → `IS DISTINCT FROM` 강제 ②DONE취소 잔액부족 시 영구롤백 대신 durable risk/manual-reconcile 상태+감사로그로 수렴 ③`capture_lead` NULL submitter_hash fail-open을 DB 레벨에서도 거부(EF 선차단에 더해 방어계층 추가) ④이메일/Instagram 중복 SELECT-then-INSERT 레이스를 DB unique index 또는 advisory lock/ON CONFLICT로 안전 수렴. 각 결함 pgTAP+동시성 테스트 추가, 기존 적용 migration 수정 금지(신규 migration만), 고위험 money code Codex 재리뷰 PASS까지 완료 후 qa 재진입. approved_stages에서 build 제거(재잠금), current_stage=build, qa=todo로 되돌림. (artifacts: 무효화 — 재승인 시 재기록)
2026-07-16 05:33 KST — build APPROVED(재승인) — Codex REJECT 4건 전부 수정 완료. 신규 migration `20260716120000_release_v1_hardening_fix.sql`(기존 3개 migration 미수정): ①payment_key NULL 우회 `IS DISTINCT FROM`으로 차단 ②DONE취소 잔액부족을 예외+영구롤백 대신 `cancel_reconcile_required_at` durable마커+`risk_event`로 수렴(트랜잭션 커밋, 웹훅 200+reviewRequired+Slack, 재시도 멱등) ③`capture_lead` NULL/빈 submitter_hash DB레벨 거부 추가 ④이메일/인스타 dedup 레이스를 advisory lock(email→instagram 고정순서)+unique_violation 방어로 안전 수렴. 컨트롤러가 신규 migration 전체·`toss-webhook-handler.ts` 변경분·신규 pgTAP 어서션(payment_key NULL 거부·잔액부족 커밋+risk_event 1건+재시도 멱등·submitter_hash 거부)을 코드 직접 대조로 재감사(자체보고 신뢰 안 함). **Codex 재리뷰 PASS**(1라운드, REJECT 0건). 컨트롤러 직접 fresh 재확인: web unit **88/88** PASS·production build PASS·migration 드리프트 없음·pgTAP **109/109** PASS(payment_abuse_guard 20+release_v1 37+rls_policy 52)·동시성 스크립트 4종(신규 lead_dedup_race+기존 3종) 전부 ALL PASS·release-v1.spec.ts **3/3** PASS(격리 포트 3463, 프로덕션 모드). current_stage → qa. (artifacts: build=build-log-release_v1_hardening_fix-CodexPASS)
2026-07-16 05:55 KST — qa AWAITING-APPROVAL(미승인, PASS-with-gaps) — qa-verifier가 4대 하드닝을 psql/curl로 직접 재현(payment_key NULL 거부 관찰·잔액부족 커밋+review_required=t+risk_event 1건+재시도 멱등 관찰·submitter_hash NULL/빈문자열 거부 관찰·lead_dedup_race.sh 등 동시성 4종 재실행 ALL PASS·toss-webhook CANCELED review_required 200 경로 vitest 교차확인). 전체 회귀 재확인: build PASS·pgTAP 109/109·web unit 88/88·`/api/health` 200·E2E 31/32(1건은 기지의 kill switch 테스트부채, 재조사 불필요 확정 상태 유지). **신규 발견**: qa-verifier가 세 번째로 독립 Codex 컨텍스트를 실행해 REJECT 3건 → 컨트롤러가 코드 직접 대조로 재검증한 결과 1건은 오탐 확정(`_shared/slack.ts`의 `sendSlackAlert`가 전 경로 try/catch로 감싸 500 유발 불가, 컨트롤러가 파일 전체 직접 Read로 확인), 나머지 2건은 실질적으로 동일한 근본원인 1건 — `reconcile_canceled_payment`의 `amount_krw != p_amount_krw`가 payment_key와 같은 NULL-unsafe 패턴(컨트롤러가 마이그레이션 코드 직접 대조로 실재 확인). 단 유일 호출부(`toss.ts::getPayment`)가 `Number.isInteger(totalAmount)` 강제 검증을 이미 하고 있어 현재 도달 불가 — payment_key와 동일 리스크 등급, 트리비얼 1줄 수정(`IS DISTINCT FROM`). **게이트 판정: PASS-with-gaps** — 갭 = (a)구조적 prod증거 2건(변동없음) (b)신규 트리비얼 amount_krw NULL-unsafe 1건(비블로커, 동일 패턴 이미 승인된 수정 재적용이면 해소). approved_stages에 qa 미추가. **회장 판단: 이 1줄을 지금 3차 라운드로 마저 닫을지, 다음 마이너 릴리스로 미룰지.** (artifacts: qa-tracker-2026-07-16-2차-PASSwithgaps)
2026-07-16 06:40 KST — build ⟲ REOPENED(3차, 최종 하드닝) — **회장 지시: amount_krw NULL-unsafe도 마저 닫는다.** 스코프: `reconcile_canceled_payment`의 `amount_krw != p_amount_krw` → `IS DISTINCT FROM`(payment_key와 동일 패턴) + NULL 회귀 pgTAP. 신규 migration만(기존 4개 미수정). Codex review-only PASS 필수(단 **종료기준 명시**: P0-P2 실질결함만 blocking, 오탐/현재 도달불가 트리비얼 지적은 문서화만 하고 재작업 루프 금지 — 무한 재리뷰 방지). 전체 핵심 회귀 후 build/qa 재승인. **재승인 후에는 자동으로 운영 배포 진행** — Supabase/Vercel 자격증명·외부 콘솔이 실제 blocker가 되는 지점에서만 정확한 값과 설정 경로를 회장에게 요청하고 그 외엔 멈추지 않음(회장 명시 지시). approved_stages에서 build 제거(재잠금), current_stage=build, qa=todo. (artifacts: 무효화 — 재승인 시 재기록)
2026-07-16 06:36 KST — build APPROVED(재승인, 3차 최종) — 신규 migration `20260716130000_amount_krw_null_safe_fix.sql`(기존 5개 미수정): `reconcile_canceled_payment`의 `amount_krw != p_amount_krw` → `IS DISTINCT FROM`(payment_key와 동일 패턴, 1줄만 변경, 나머지 로직 동일 — 컨트롤러가 파일 전체 직접 대조 확인). 신규 pgTAP 1건. **Codex 재리뷰 PASS**(1라운드, 종료기준① 충족 — "이 diff 신규 P0/P1/P2 없음"). 컨트롤러 직접 fresh 재확인: `supabase test db` **110/110** PASS(20+38+52)·web unit **88/88**·production build PASS·동시성 4종(rate_limit/request_key/fingerprint/lead_dedup) 전부 ALL PASS·release-v1.spec.ts **3/3**(격리 포트 3463, 프로덕션 모드). pane 충돌 없음 확인. 결제/리드 SECURITY DEFINER RPC 하드닝 3라운드 전부 종결.
2026-07-16 06:36 KST — qa APPROVED — 로컬 검증 가능한 전 항목 GREEN(위와 동일 근거 + 이전 라운드 4대 하드닝 직접 재현). **prod-health-200/prod-demo-login-200은 배포 전 물리적으로 수집 불가한 구조적 갭이며, 회장이 이 시점에 "자격증명 blocker까지 멈추지 말고 ship 진행" 명시 지시** — 두 증거는 ship 단계에서 실배포 직후 사후 수집하는 것으로 처리(override 대신 명시적 회장 결정으로 처리, 별도 override 플래그 불필요). current_stage → ship. (artifacts: qa=v1.0.0-로컬GREEN-prod증거사후수집)
2026-07-16 08:15 KST — ship 진행 보고(실배포, 다른 세션 실행 + 컨트롤러 독립 교차검증) — 회장 지시로 실 배포 진행: 기존 `wongoryo-production`(ref tomiajlsupjkzctdhzwf) 삭제 후 신규 전용 Supabase 프로젝트 `haenael-ge`(ref gmpwrcxpvgylmllasoqy, Seoul ap-northeast-2, ACTIVE_HEALTHY) 생성·링크. **컨트롤러가 이 턴에 직접 재현 확인한 것(관찰됨)**: `curl https://haenael-ge.vercel.app/` → 200, `/api/health` → `{status:ok,version:1.0.0,database:ok}` 실응답 확인 · `supabase migration list --linked` → local 16개 전부 remote와 일치(드리프트 0) · `supabase functions list` → 11개 전부 `status:ACTIVE`(auth-kakao/cashout/cashout-payout/cheer-order/kyc-verify/lead-capture/notify/report/toss-confirm/toss-webhook/wordmap-render). **회장 보고 기반 기록(컨트롤러 미재현 — API 키 노출 방지 정책으로 REST 직접조회 차단됨, credential-blocked)**: lead 테이블 5행 저장(REST 직접 확인), `LEAD_RATE_LIMIT_SALT` 발급·Keychain 저장·배포, `PAYMENTS_ENABLED=false`·`CASHOUT_ENABLED=false` Supabase/Vercel 양쪽 명시 설정, 운영 release E2E 3/3(실 prod URL 대상). **v1.0.0 현재 출고 상태 판정**: 핵심 인프라(Supabase 클라우드·11 EF·16 migration)와 무료 코어 루프(목표작성·공유·워드맵·리드캡처)는 **prod 라이브**(직접 관찰). 결제(Toss)는 킬스위치로 **의도적 비활성**(설계대로). GA4·Slack·Toss 실키·카카오 로그인 4건은 자격증명 부재로 **미착수·미검증** — "v1.0.0 완전 출시"가 아니라 "인프라+무료 핵심기능 라이브, 유료·연동 기능은 다음 자격증명 확보 후" 상태. (artifacts: ship=infra+free-core-live-4개외부연동대기)
<!-- /approve 가 한 줄씩 추가: "YYYY-MM-DD HH:MM KST — <stage> APPROVED — <note> (artifacts: <pinned>)" -->
2026-07-16 18:20 KST — ship readiness 점검 완료(무료 코어 루프, 유저 공개 4시간 전) — qa-verifier가 실 prod URL(`https://haenael-ge.vercel.app`)을 직접 curl+headless 브라우저로 검증(스크린샷 14장). 컨트롤러가 핵심 발견 직접 재현: `curl /privacy`·`/terms` → 둘 다 "내용 준비 중입니다" 실서빙 확인, `web/src/app/privacy/page.tsx`·`terms/page.tsx` 소스 직접 대조로 실재 확인. **판정: launch-ready-with-caveats.** 무료 코어(랜딩→리드폼 UI성공→온보딩→LoginSheet→404안전망→cashout/카카오 안전비활성→모바일 390x844) P0/P1 크래시 없음. **신규 발견 P1 1건**: 개인정보처리방침·이용약관이 placeholder("내용 준비 중")인 채로 리드폼·LoginSheet가 PII 수집 동의 문구로 이 문서들을 참조 — 법률/신뢰 인접 사안. **컨트롤러 판단: build reopen 보류** — 코드 결함이 아니라 실제 정책 문서 내용을 무엇으로 채울지는 회장의 판단(법률 문서 발명은 컨트롤러 권한 밖)이 필요해 자동 위임하지 않음, 회장 확정 문구/방향 수령 후 code-builder 위임 예정. P2 1건(wordmap 404가 브랜딩 not-found.tsx 없이 Next 기본 404로 폴백)은 build-reopen 기준(P0/P1) 미달로 백로그만. GA4/Slack/Toss실키/카카오 실왕복은 지시대로 "미검증(자격증명 부재, launch blocker 아님)"으로 분리 기록. (artifacts: qa-tracker-launch-readiness-2026-07-16)
2026-07-16 18:35 KST — build ⟲ REOPENED(4차) — **회장 판단 확정: 표준 개인정보처리방침/이용약관을 지금 구현.** 문의처는 명시적 "추후 입력" placeholder. 스코프: `web/src/app/privacy/page.tsx`·`terms/page.tsx`에 실제 정책 내용(수집항목·목적·보유기간·제3자처리자[Supabase/Vercel/Toss/Kakao/GA4]·이용자권리·시행일·문의처=추후입력) 작성. code-builder 위임, pane 타이틀에 진행상태 노출. Codex 2nd-pass는 이번 변경이 순수 정적 콘텐츠(SECURITY DEFINER/결제로직 무관)라 스킵 판단(근거: dev.md 위협모델상 money-code/DB함수만 필수 대상). verify-agent-quality→테스트/build→qa-verifier 재검증→운영 재배포→prod curl 확인까지 멈추지 않고 진행(회장 명시 지시). approved_stages에서 build 제거(재잠금), current_stage=build. qa는 이전 승인 유지(로직 무영향). (artifacts: 무효화 — 재승인 시 재기록)
2026-07-16 21:25 KST — build APPROVED(재승인, 4차) — `web/src/app/privacy/page.tsx`·`terms/page.tsx`에 표준 개인정보처리방침(9개 조항)·이용약관(10조+부칙) 작성 완료, 문의처 전부 "(추후 입력)"(가짜 값 없음). **컨트롤러가 WebSearch로 개인정보보호법 제30조 필수 9개 항목을 직접 확인**해 1차 산출물에서 누락 2건(파기방법 구체적 절차·쿠키 자동수집장치 거부방법)을 발견 → code-builder에 보완 위임 → §3에 파기방법 문단 추가, 신규 "7. 쿠키의 설치·운영 및 거부" 섹션 삽입(이후 번호 재배열, 교차참조 동기화)까지 컨트롤러가 코드 직접 대조로 확인. 컨트롤러 직접 fresh 재확인: web unit **88/88** PASS·production build PASS·로컬 격리 서버(포트 4175)에서 `/privacy`·`/terms` curl 직접 확인 — "내용 준비 중입니다" 완전 제거, 신규 항목 실서빙 확인. Codex 2nd-pass는 정적 콘텐츠라 스킵(사유 기록 유지). current_stage → qa. (artifacts: build=privacy-terms-4차-법정9항목충족-WebSearch근거)
2026-07-16 21:40 KST — qa APPROVED — qa-verifier가 좁은 스코프(privacy/terms 콘텐츠 대조·동의링크 연결·모바일 스모크·release E2E)로 재확인. web 88/88·build PASS 회귀 확인. privacy/terms 법정 9항목 전부 섹션 제목 기준 대조 확인(9/9), "내용 준비 중입니다" 완전 제거, 문의처 정직하게 "(추후 입력)". LoginSheet의 이용약관/개인정보처리방침 링크 실제 `/terms`·`/privacy` 연결 확인(Playwright 실구동). 모바일 390x844 오버플로 없음(스크린샷 확보). release-v1.spec.ts 3/3 PASS(최초 1회 env 설정 실수로 FAIL했으나 앱 결함 아님, 재확인 PASS). **신규 발견 P2**: `LeadCaptureForm.tsx`(랜딩 리드폼)에 개인정보처리방침/이용약관 링크 자체가 코드에 없음 — 컨트롤러가 grep으로 직접 재확인(매치 0건). launch 비차단(PII 수집 동의 체크박스는 있으나 정책 링크만 부재, LoginSheet 쪽은 정상), 백로그로 다음 라운드 권고. **종합: launch-ready-with-caveats(P2 1건만).** current_stage → ship, 운영 재배포 진행. (artifacts: qa=privacy-terms-launch-ready, P2=LeadCaptureForm-정책링크부재-백로그)
2026-07-16 21:45 KST — ship 재배포 완료(관찰됨, 컨트롤러 직접 실행) — `npx vercel deploy --prod`(프로젝트 `haenael-ge`, 기존 링크 재사용) → `https://haenael-ge.vercel.app`로 alias 완료(`readyState: READY`). **컨트롤러 직접 curl 확인**: `/api/health` 200 `{status:ok,version:1.0.0,database:ok}` · `/privacy` "내용 준비 중입니다" 0건, "파기합니다"·"쿠키(Cookie)의 설치"·"추후 입력" 실서빙 확인 · `/terms` "내용 준비 중입니다" 0건, "담당자: (추후 입력)" 확인 · `GET /` 200. **개인정보/약관 P1은 이 배포로 완전 해소.** 남은 것은 P2 1건(LeadCaptureForm 정책링크 부재, 백로그)과 기존 4개 외부연동(GA4/Slack/Toss실키/카카오, 자격증명 부재로 미착수) 뿐. (artifacts: ship=privacy-terms반영-재배포완료-prod직접확인)

2026-07-17 — build ⟲ REOPENED(5차, 회장 5대 요구 착수) — Claude 컨트롤러 인계 후 첫 라운드. 스코프: ①LeadCaptureForm.tsx consent 라벨에 /privacy·/terms 링크(LoginSheet 패턴 재사용, P2 해소) ②wordmap 라우트 브랜딩 not-found(g/[slug]/not-found.tsx 패턴) ③GA4 이벤트 배선 확대(goal_created·share_link_copied·wordmap_viewed·wordmap_shared — lead_submitted만 실발사 중) ④Slack 알림 커버리지 확대(주요 EF 5xx 경로 warning, _shared/slack.ts 재사용). 결제 이벤트·Toss·카카오는 스코프 외. code-builder 위임→verify→컨트롤러 감사→테스트/build→qa→재배포. 회장 확정: 알림=Slack, 외부콘솔=브라우저 자동화 허용, DM=반자동 템플릿. approved_stages에서 build·qa 제거, current_stage=build. (artifacts: 무효화 — 재승인 시 재기록)

2026-07-17 — build APPROVED(5차) — code-builder 위임분 4건 완료: ①LeadCaptureForm consent 라벨에 /terms·/privacy 링크(LoginSheet 패턴) ②wordmap/[goalId]/not-found.tsx 신설(g/[slug] 패턴, page.tsx는 이미 notFound() 호출 확인) ③GA4 배선 확대 — WordmapViewTracker 신설(wordmap_viewed)·WordmapShareIcons share_link_copied·ShareLinkCard share_link_copied(goal_created는 기존 배선 확인) ④cheer-order·toss-confirm 실패경로 sendSlackAlert fire-and-forget(응답 코드/바디 불변, toss-webhook-handler는 기존 6지점 유지). verify-agent-quality PASS(Skill 1회·소크라 3). 컨트롤러 직접 재확인(관찰됨): web unit 98/98 PASS·production build PASS. deno CLI 부재로 EF 타입체크는 미검증(기존 시그니처 재사용). Codex 2nd-pass는 결제 로직 무변경(알림 추가만)이라 스킵 판단 기록. (artifacts: build=5차-P2해소-GA4배선-Slack커버리지)
2026-07-17 — 외부연동 진행(컨트롤러 직접, 관찰됨) — Slack: 앱 "haenael-ge alert"(J.the.great.CEO 워크스페이스) 생성, #해낼게-alert 채널 신설, Incoming Webhook 발급, Keychain(slack-webhook-haenael-ge) 저장, supabase secrets set SLACK_WEBHOOK_URL 완료(count:1), 테스트 발송 HTTP 200 + 채널 실수신 브라우저 관찰. GA4: 속성 "해낼게 haenael-ge"(KST/KRW) 생성, 웹 스트림 haenael-ge.vercel.app, 측정 ID G-3QR2FB5BGC(공개 클라이언트 ID), Vercel production env NEXT_PUBLIC_GA_MEASUREMENT_ID 등록, 재배포 진행.

2026-07-17 — qa 진행 중 발견 2건 — ①P1급 배선버그: GoogleAnalytics.tsx의 ga4-init Script(onReady, 내용 없음)가 실행되지 않아 window.gtag 영구 미정의 → GA 이벤트 전량 무발화(prod 네트워크 관찰: gtag/js 200 로드되나 /g/collect 0건). code-builder 재위임으로 수정 중. ②P2: 랜딩 "어떻게 쓰는 건가요?" 링크가 /how 404(미브랜딩 기본 404) 데드링크 — 백로그(다음 라운드: 대상 페이지 신설 또는 링크 제거).

2026-07-17 — qa APPROVED + ship 증거 갱신(전부 컨트롤러 직접 관찰) — ①GA4 배선버그(ga4-init Script onReady 미발화 → gtag 미정의 → 이벤트 전량 무발화) 수정: 인라인 dangerouslySetInnerHTML 초기화 + dataLayer 폴백(web/src/components/analytics/GoogleAnalytics.tsx·lib/analytics/index.ts), web 99/99·build PASS, 재배포 후 prod 브라우저에서 /g/collect page_view POST 발화 + GA Realtime(속성 p545972102) 활성 사용자 1·page_view·first_visit 실수신 관찰. ②리드 E2E: prod 폼 실제 제출 → lead id=7 DB 직접 조회(psql) + Slack #해낼게-alert lead_captured 실수신. ③정책링크·wordmap 브랜딩404 prod 실서빙. verify 게이트: GA수정분 기계 FAIL(Skill/WebSearch 0 — 1파일 버그픽스, Next 공식문서 로컬 대조로 근거 확인, known 오탐 패턴) → 컨트롤러 직접 재검증으로 대체. SNS 패키지(content-growth-marketer)는 scratchpad/sns-launch/ 3종(프로필팩·W1큐·dm-compose.mjs 실행 테스트 통과) — verify 기계 FAIL(스킬 미호출, 사유=정본 원문 무편집 재사용 선언) ⛔ 검증실패 라벨로 출고, 회수 3건(발신계정·W1 시작일·유튜브 계정) open-decisions행. (artifacts: qa=5차-prod직접관찰-GA4실수신)

2026-07-17 — build ⟲ REOPENED(6차, 미니) — 랜딩 '어떻게 쓰는 건가요?' → /how 데드링크(P2) 해소: 와이어프레임 steps3(선언→🍀응원→환전) 정본 카피 기반 브랜딩 가이드 페이지 신설. code-builder 위임.

2026-07-17 — build+qa APPROVED(6차) — web/src/app/how/page.tsx 신설(정본 카피만 재사용: page.tsx steps3·landing-final.html·voice-copy-bank [stable], 환전은 '오픈 예정' 수위). 컨트롤러 직접 재확인(관찰됨): web 99/99·production build에 ○ /how 라우트 생성·vercel --prod 재배포·prod curl /how 200+선언/환전/해낼게 콘텐츠 실서빙·health 200. verify 기계 FAIL(스킬/웹서치 0 — 정본 재사용 코드작업, known 오탐)은 컨트롤러 직접 재검증으로 대체, ⛔ 라벨 출고. (artifacts: build=6차-how페이지, qa=prod실서빙관찰)

2026-07-17 — 카카오 로그인 콘솔 세팅 완료(컨트롤러 직접, 관찰됨) — 회장이 developers.kakao.com 로그인 제공. 앱 '해낼게'(ID 1516450, 회사명 정성컴퍼니, 카테고리 소셜네트워킹, 도메인 haenael-ge.vercel.app) 생성. REST API 키 발급, 카카오 로그인 리다이렉트 URI 등록(prod https://haenael-ge.vercel.app/auth/kakao/callback + localhost:3000), 클라이언트 시크릿 활성(ON), 카카오 로그인 제품 활성화, 동의항목 닉네임=필수·프로필사진=선택. account_email은 비즈앱 미전환으로 권한 없음 → 웹 scope에서 임시 제외 위임(EF에 synthetic email 폴백 실재 확인), 비즈앱 전환(사업자 798-31-01774 등록+앱아이콘) 후 복원 가능. 키는 Keychain(kakao-rest-api-key·kakao-client-secret) + supabase secrets(KAKAO_CLIENT_ID/SECRET, count:2) + vercel env(NEXT_PUBLIC_KAKAO_REST_API_KEY, production) 주입 완료. 남은 것: scope 수정 배포 후 실 로그인 왕복 검증.

2026-07-17 — 카카오 로그인 실왕복 검증 완료(관찰됨) — scope에서 account_email 임시 제외(LoginSheet.tsx:44, EF synthetic email 폴백 실재·비즈앱 전환 후 복원 주석) 후 재배포. 1차 시도 auth_error=config_error → 원인 NEXT_PUBLIC_APP_URL 프로덕션 env 누락, 추가 후 재배포. 2차 시도: prod 온보딩→저장→LoginSheet→카카오 동의화면(닉네임 필수·프로필사진 선택 정상 표시)→동의→콜백→로그인 세션 확립(UI '내 링크 받기' 로그인 모드 전환) + DB member 테이블에 provider=kakao·nickname=조성진 row 생성 직접 조회. 소셜로그인 = 운영 검증 완료. ship 잔여는 Toss 실키뿐(콘솔 로그인/심사 필요). (artifacts: kakao-login=prod실왕복관찰)

2026-07-18 — build ⟲ REOPENED(7차, 카카오 인증 보안) — Codex 2nd-pass(카카오 OAuth)가 P1 2건+P2 1건 지적, 컨트롤러 코드 직접 재확인: ①P1 로그인 CSRF/세션고정 — state에 랜덤 nonce 없이 redirect 경로만 담아 세션 미결속(LoginSheet.tsx:37, callback route.ts:35) = 도달가능 실재결함 ②P2 백슬래시 오픈리다이렉트 — isSafeRedirectPath가 `/\evil.example` 통과시킴(route.ts:20) = 도달가능 ③P1 이메일충돌 계정탈취 — 현재 account_email scope 제외로 synthetic email(카카오id 유니크)만이라 도달불가나 비즈앱 전환·이메일 복원 시 활성화되는 계약결함(auth-kakao:179,232). code-builder 위임→Codex 재리뷰→build/qa 재승인→재배포. current_stage=build.

2026-07-18 — build+qa APPROVED(7차, 카카오 인증 보안) — Codex 2nd-pass가 카카오 OAuth에서 P1 2건+P2 1건 지적, 컨트롤러 재확인 후 code-builder 수정: ①로그인 CSRF → /auth/kakao/start 서버라우트 신설(암호nonce→httpOnly·Secure·SameSite=lax·10분 쿠키→state=nonce.path), callback이 상수시간 대조+전경로 쿠키 1회용 삭제 ②백슬래시 오픈리다이렉트 → redirect-path.ts 화이트리스트(백슬래시·//·콜론·유니코드 차단) ③이메일충돌 자동연결 → isSyntheticKakaoEmail(email,providerId) 정확일치(Codex 3차 P2 지적 반영, kakao_{providerId}@ 정확대조). 컨트롤러 직접: web 117/117·EF deno test 10/10·build PASS·oauth-kakao deno check·코드 diff 감사. Codex 재리뷰: nonce·redirect 통과, 이메일 P2는 정확일치로 닫음. 배포 완료(supabase auth-kakao 번들성공+vercel prod). **운영 관찰**: start가 nonce쿠키(HttpOnly·Secure·SameSite=lax·Max-Age=600) 발급+카카오 리다이렉트, 백슬래시 우회 state는 /?auth_error=invalid_state로 외부유출 차단. **미재확인**: 정상 로그인 성공 실브라우저 왕복(nonce 대조 통과)은 claude-in-chrome 확장이 세션 차단("This site is blocked")돼 미재현 — 단위/통합테스트 state왕복 성공케이스 + 앞선 이 세션 카카오 로그인 성공(DB member row) + start쿠키발급으로 대체검증. 회장/다음세션이 브라우저로 1회 로그인 시 최종확인 가능. current_stage → ship.

2026-07-18 — build ⟲ REOPENED(8차, 웰컴 클로버 성장훅) — 회장 확정: 목표생성시 시스템 웰컴응원+체험클로버, 환전 도달판정=웰컴포함/실지급=웰컴제외. 홈표기=🍀개수 크게+원화 작게 등가(DESIGN.md 3층규칙 이 기능한정 개정). 목업 3화면 design-review A− 통과(scratchpad/welcome-clover). 스코프: DB migration(웰컴 응원 시스템경로+clover_ledger WELCOME entry_type+환전계산 웰컴제외), 목표생성시 웰컴 자동삽입, UI 3화면, 친구화면(g/[slug]) 흐름 유지. 고위험(환전 돈로직)→Codex 리뷰 필수. ⚠️ 배포타이밍: 친구응원=결제묶임이라 결제 off 상태선 훅 반쪽 → 실유저 배포는 결제(토스)와 함께 권장(회장 판단중). current_stage=build.

2026-07-18 — build+qa APPROVED(8차, 웰컴 클로버) — 구현 완료·전검증 통과: DB migration 2개(WELCOME_GRANT enum / is_welcome+payment_id nullable+CHECK+웰컴 유니크 / grant_welcome_clover 트리거 멱등 / clover_eligibility RPC 4분해 auth.uid본인확인). 환전: payable=GREATEST(total-welcome,0) 친구분만 지급·reached=total>=30 웰컴포함 도달. UI 3화면(홈 개수+원화보조·환전 실수령정직·ShareLinkCard 배너). DESIGN.md §6 개정. g/[slug]·CheerPaymentButton 무수정(웰컴 CONFIRMED 워드맵 반영·결제off 준비중 안전). 검증(관찰/테스트됨): pgTAP 130/130(신규20 경계 W10-W20)·web 117/117·build PASS·컨트롤러 계산공식 직접감사·verify-agent-quality PASS·**Codex 돈코드 2nd-pass No P0-P2 findings**(웰컴 유출·트리거 멱등·본인확인·기존RPC충돌 무). current_stage → ship. ⚠️ 실배포 미실행: 회장 배포타이밍 결정 대기(결제 off라 친구응원 미작동=훅 반쪽, 결제와 함께 배포 추천). git commit 없음.

2026-07-18 — ship 부분배포·정정 — 웰컴 클로버: DB migration prod 배포 성공(migration list local=remote, 트리거 실발동 psql 관찰: 새 goal→웰컴 cheer 🍀3 CONFIRMED+WELCOME_GRANT ledger, 롤백). **web(Vercel) 배포는 인증 만료(whoami Not authorized)로 실패** — 컨트롤러가 grep 파이프로 exit0만 보고 "완료" 오보고(실수원장 [proxy] 기록). 현재 prod=이전 web배포+새 DB: 홈에 웰컴 🍀3개·웰컴응원("해낼게, 첫 클로버는...")·워드맵 반영은 뜨나(기존 UI+새 데이터), 신규 UI(원화 보조표시 "≈N원 상당"·환전 분해표)는 DOM에 없음(미배포). cashout=CASHOUT_ENABLED off "준비중" 안전. **다음: 회장 Vercel 재로그인(`npx vercel login`) 후 web 재배포→prod DOM에서 원화표시·분해표 실서빙 확인.** DB/게이트/Codex는 완료.

2026-07-18 — 웰컴 클로버 + Vercel rosemallow95 이전 ship 실검증 완료(전부 관찰됨) — 회장이 Vercel을 code0to1→rosemallow95(팀 100-b)로 이전 지시. 컨트롤러가 브라우저로 rosemallow95 토큰 발급→VERCEL_TOKEN 배포. 프로젝트 haenael-ge rename, 도메인 haenaelge.vercel.app(+3개 alias), env 8개, 배포보호 해제(ssoProtection null). health {ok,1.0.0,db ok}. 카카오 REST키(1516450)에 redirect https://haenaelge.vercel.app/auth/kakao/callback 추가·저장. **prod 실왕복 관찰**: 새 도메인 온보딩→목표저장→LoginSheet→카카오 로그인(새 redirect+nonce)→콜백→세션→ShareLinkCard "해낼게 팀이 웰컴 클로버 3개 보냈어요" 배너 + 링크 haenaelge.vercel.app/g/bql9oe9g. home DOM "🍀 6개 ≈6,000원 상당"(원화 보조표시 신규UI 실서빙)+웰컴응원("첫 클로버는 저희가 먼저...")+워드맵 반영. 웰컴 트리거 prod 실발동 확증. 환전=CASHOUT_ENABLED off "준비중"(도달 미달, 안전). **웰컴 클로버 성장훅 + rosemallow95 이전 = prod 라이브 완료.** 잔여: 환전(legal 4건·PASS벤더·토스 지급대행 선결로 스텁), DM 발신계정, 토스 새상점(회장 다음주), 기존 haenael-ge.vercel.app(code0to1) 방치.

## Blocked / Notes
### 2026-08-25 환전 릴리즈 최종 QA NG
- 로컬 관찰 통과: 계좌번호 오류 차단, 관리자 전체 계좌 열람, 10분 열람 만료 차단, 새 열람 뒤 지급 완료, 계좌 정보 오류 이체 실패 후 반려.
- BLOCKER: 운영 migration history의 local-only gap 15개. 관련 `20260821000000`, `20260822000000`도 remote 미적용이라 새 웹과 운영 DB 금액 계약이 갈린다.
- 품질 게이트: 전역 design-lint 2종 위반, Storybook 인벤토리와 릴리즈 핵심 돈 상태 story 및 토큰 표면 부족.
- 환전 클로버 잠금 및 화면 정합 릴리즈 PR 1번은 QA 판정 전에 main에 머지됐다. 운영 read-only 확인은 기존 약관 5%와 health 200이며 새 릴리즈 운영 반영은 미검증이다.
- 최종 상태: `qa=changes-requested`, 운영 배포 보류. 승인 필드는 변경하지 않았다. 증거 `docs/core-cashout-release-final-qa-v2-gpt-codex.md`.

### 2026-07-17 controller handoff
- User explicitly terminated Codex orchestration and assigned continuation to Claude. Primary pane remains `%50` until the user changes it.
- Takeover truth and next commands are at `.handoff-state.md` top section `CLAUDE TAKEOVER`.
- Do not reset the large intentional dirty worktree. Do not repeat the completed privacy/terms deployment without regression evidence.
- Immediate product backlog: LeadCaptureForm policy links (P2), then external credentials for GA4, Slack/Discord, Toss, and Kakao.

### biz-panel 판정 (2026-06-29) = GO-with-changes
- One Thing 섰음: "친구가 선언한 목표에, 달성을 걸고 쏜다." 차별점 = 오직 '돈'(무결제 영역은 셋로그/Strava 점령).
- 패널 권고(무결제 Phase 0 먼저)는 ↓ 회장 결정으로 일부 override.

### 회장 결정 (2026-06-29) — PRD 정의 확정
1. **스코프**: 결제 = 메인 기능. "조용히 돈으로 응원"(DM+기프티콘 껄끄러움을 조용한 클로버 결제로 대체). → 무결제 Phase 0 아님.
2. **GTM**: 공스타그램 임베드 — 프로필/운영계정에 "여기 기록하고 친구한테 조용히 응원받으세요" 링크 → 친구 조용히 결제.
3. **BM**: 환전 수수료 — 응원받은 사람이 모인 클로버를 환전(cash-out)할 때 수수료(별풍선·투네이션형 가상화폐 모델).
4. 인센티브: "조용히"가 핵심 에토스 → 패널의 시끄러운 호혜/뱃지보다 discreet support 톤. PRD에서 재설계.

### ⚠️ #1 리스크 (존립 조건)
- 전자금융거래법: 클로버=선불전자지급수단 발행 + 환급(cash-out) = 전자금융업 등록·선불충전금 별도관리 등급. 2026-12-17 개정 강화.
- → 투네이션/별풍선 실제 합법 운영구조(PG 경유/등록/위탁) 선례 규명을 docs/risks.md 핵심으로. 결제 코어이므로 deferrable 아님.

### 회장 결정 (2026-06-29, 2차) — Q1 적립형 확정
- **재화(클로버/하트/모찌 등) 선물 → 받는 사람은 '일정금액 이상 모이면' 환전.** = 즉시전달 아닌 **잔액 적립형 확정.**
- ⚠️ 결과(회장 인지 하 선택): 적립=잔액 보유 → 전금법 무거운 등급(선불충전금 별도관리·전금업 등록 경로) 쪽으로 확정 진입. risks.md 합법경로 옵션을 '적립형 전제'로 좁혀 재정리 필요.
- 미정: 환전 임계금액(일정금액↑) 숫자, 재화 네이밍.

### 코어 루프 확정 (회장 대화 2026-06-29) — One Thing 정밀화
1. **진입**: 인스타 바이오에 linktree식 링크 박음(프로필 고정). 친구 = 인스타에서 클릭 유입.
2. **받는 사람 페이지**: 목표·일정·왜 만 적음(매일 진행 인증 부담 X). = 선언/액자.
3. **응원**: 친구가 조용히 하트/클로버(소액 결제) + 한 줄 응원 메시지. 비동기·무부담(카톡선물의 "뭐보낼까/감사답장" 피로 제거).
4. **콘텐츠**: 쌓인 응원 메시지를 **워드맵**으로 시각화 → 받는 사람 감정 보상 + 사회적증거(다음 친구 유입). 매일 콘텐츠를 받는 사람이 아니라 *친구 응원이* 채움.
5. **확산 고리**: 예뻐진 워드맵을 받는 사람이 인스타에 재공유 → 다른 친구 유입 → 응원 추가. 응원=콘텐츠.
6. **수익**: 모이면(일정금액↑) 환전, 우리가 수수료. (적립형 = 전금법 무거운 등급, 기결정.)
- **코어 밖(보류)**: 팔로우/팔로잉 커뮤니티. "일단 핵심만 뿌린다"(회장).
- ⚠️ 여전히 열림: 친구가 인스타에서 링크 타고 우리 앱까지 넘어와 하트 누르는 **그 한 단계 전환율**이 콜드스타트 생사 — 시딩으로 실측 대상.

### 다음 액션
- PRD(v0.1.0)는 이 대화 *이전* 산출이라 위 코어 루프 미반영(stale). → 반영 후 plan 게이트.

<!-- 2026-07-06 세션 노트 -->
- 2026-07-06: 브랜드 마케팅 전략 v0.1 초안 완성 (아이데이션 신분 — scratchpad only, wiki/docs 미반영). content-growth-marketer 작성, verify-agent-quality PASS(스킬3·웹조사14·소크라6). 파일: /private/tmp/claude-501/-Users-sj-sj-code-master-haenael-ge/66c730dc-895f-43ba-995f-c83f3d217e7b/scratchpad/haenael-ge-brand-marketing-strategy-v0.1.md · 회장 결정 대기 3건(DM 발신주체/제작기 공개수위/사회적증거 수위) → open-decisions.md 등록됨.
- 2026-07-07: 브랜드 마케팅 전략 v0.2 개정 완료 (회장 확정 3건 반영: DM=브랜드 계정 / 톤 2층: 선언=단호·대화=따뜻 / 사회적 증거=적극 노출 "선언과 인원수는 보이게, 지갑은 조용하게"). verify PASS. 신규 미결 1건: 탐색 피드 공개 범위 → open-decisions 등록. 파일 동일 경로(scratchpad, 제목 v0.2). 아직 wiki/docs 미반영(아이데이션 신분).
- 2026-07-07: wiki 정본화 완료 (brand-marketing-strategy.md 신설 + decisions D-001~003 + index 링크, brain 핀 9건 메인세션 대조 완료) · 채널 아이덴티티 킷 완료 (scratchpad, 추천=@haenaelge 3플랫폼 통일·한글 채널명 "해낼게"). verify PASS. 비주얼 자산(store-visual-producer) 진행 중.
- 2026-07-08: 브랜드 비주얼 자산 완성 (7개 PNG 모두 정확한 규격으로 렌더, design-html+design-review 파이프라인 완주). 벤치마크 5건 실행(Ko-fi·토스·당근·YouTube 2026 가이드). Higgsfield 실사 합성 2회. QA 수정 4건(그린 텍스트색·아이콘 오독·중앙 갭·radius). verify PASS(디자인). 파일: scratchpad/brand-assets/final/. 산출물 기록 — open 1회(이미 표출됨), 경로만 재안내 원칙.
- 2026-07-08 15:36 KST: `%28` build에서 B2 테스트 결제 해피패스 구현·검증. `cheer-order`/`toss-confirm` + DB RPC(payment/cheer/ledger 원자 전이) + 웹 CTA/success/fail. 검증: Vitest 63 PASS, Next build PASS, pgTAP 38 PASS, Playwright goal-flow 14 PASS. 실배포 차단: Supabase/Vercel/Toss/Kakao secrets, Toss redirect, `toss-webhook`, 환전/PASS/payout/legal/privacy.

## 2026-07-11 — B2 결제 차단 결함 3건 수정 (build 단계 내부, 이 세션)
- Codex money-code 2nd-pass 결함 3건(cancelPayment 미검증·cheer-order 남용방지 부재·오류 원문 노출) 전부 수정 완료. code-builder 2단계 위임(중단분 감사→재위임)+컨트롤러 직접 fresh 재검증: web test 69/69·build PASS·migration 드리프트0·pgTAP 65/65·cheer-order 멱등 HTTP smoke 관찰·Playwright goal-flow 14/14. 상세: `.handoff-state.md` 2026-07-11 17:50 KST 항목.
- current_stage는 여전히 build(qa 게이트 미진입). ⚠️ tmux pane %50이 같은 결함에 병렬 작업 중으로 감지됨 — primary 확정 전까지 이 파일들(toss-confirm/toss.ts/cheer-order/errors.ts/CheerPaymentButton.tsx) 추가 수정 시 충돌 가능. 회장 판단 필요.
- 실 Toss 결제·webhook·환전·PASS·payout·Supabase클라우드/Vercel 배포·legal 4건은 여전히 미착수/미검증 — ship NG 유지.

### 마케팅 위키 완주 (2026-07-12 00:20 KST, Fable 5 세션) — 비개발 트랙 전체 GREEN
- 정본 신규 12문서 + 에셋 18점: brand/(킷·카피뱅크·visual-guidelines) · content/(캘린더·S1~S3 원고 26편) · growth/(DM·KPI·first-revenue) · ops/agent-runbook(§⑦ 모델 교대 프로토콜 포함) · decisions D-007/D-008 · brand-assets 신규 10점+photo-bank 8장.
- 검증: verify-agent-quality 6배치 전부 PASS · 금지어 린트 위반 0 · wiki 상대링크 161개 broken 0 · 에셋 규격 sips 실측 일치 · 하위모델 실행성 테스트 통과.
- 힉스필드 잔여 6크레딧(타 세션이 공유 계정에서 36 소비 — 포렌식으로 본 트랙 결백 확인). 충전 = 회장 결정 대기.
- Blocked(회장 회수): 캠페인 개시 전 6건(도메인·유튜브 구글계정·S1/S3 발신계정·DM 일한도·미성년 제외·S2 시드 고지) + 결제 오픈 전 5건(수수료율·정산주기·시드응원·앵커 역마진·오픈일) + 크레딧 충전 + 사후 거부권 2건(계정명 D-007·OG 스크림 D-008). 상세 = 각 문서 ⛔ 표기.

### 마케팅 위키 최종 마감 (2026-07-12 06:00 KST, Fable 5 마지막 세션)
- 오늘 추가: story-canon(주연=유저 관계 서사)·design-benchmark-bank(⛔라벨)·feedback-loop + 런북 배선. 하위모델 리허설(하이쿠 무맥락) 1차 배선 구멍 발견→수정→재시험 통과. 링크 210 broken 0.
- 위키 = "어떤 모델이 와도 실행 가능" 검증됨. 이후 세션은 agent-runbook §①·§⑦ 준수.

## 2026-07-13 — create_cheer_order 동시성 blocker 2건 수정 (Codex 최종 리뷰 REJECT 후속, 이 세션)
- rate-limit count↔insert 직렬화(pg_advisory_xact_lock, customer→goal 고정순서) + request_key SELECT-then-INSERT 레이스(INSERT...ON CONFLICT DO NOTHING 기반 안전 수렴) 수정. 신규 migration 20260713180819. 실제 병렬 psql 스크립트 2종(rate_limit_race.sh·request_key_race.sh) 신설·ALL PASS 직접 관찰. pgTAP 65/65·web 69/69·build PASS 재확인. 상세: `.handoff-state.md` 2026-07-13 18:15 KST 항목.
- current_stage 여전히 build. 실 Toss·클라우드 배포 미착수. pane %50 충돌 가능성 미해소.

## 2026-07-13 22:35 — request_key fingerprint 강화 (Codex 3차 REJECT 후속, 이 세션)
- request_key replay가 amount만 비교하던 결함(goal/customer/displayName/isAnonymous/message 위조 가능)을 request_fingerprint jsonb + IS DISTINCT FROM 비교로 수정. 신규 migration 20260713190000. pgTAP 72/72·병렬 세션 3종(회귀2+신규1) ALL PASS·web 69/69·build PASS 전부 직접 재확인. 상세: `.handoff-state.md` 2026-07-13 22:35 KST 항목.
- Codex 결제 리뷰 3연속 REJECT(cancelPayment검증→abuse guard→동시성→fingerprint) 이력 — current_stage 여전히 build, 배포 미착수.
2026-07-31 — ✅ DESIGN(수동환전 계좌수집 슬라이스) — 회장 "플로우 OK". 산출: scratchpad/cashout-full-journey-v3-opus.html(전체 플로우 지도 + 사용자 4화면(신청·대기·완료·반려) + 관리자 3화면(큐·상세·확인모달), 7화면 19상태, 모바일390/데스크톱1024 이중레이아웃). 증거: verify-agent-quality PASS(design-review 실호출, Design Score A−, AI Slop A) + 컨트롤러 직접 실측(줄표 26→0 grep, 뷰포트 배치분기 23규칙). 반려 이력 2회(①컨트롤러 손목업→위임교체 ②반응형·줄표 위반→재작업). ⟲ eng-design REOPEN — 계좌 저장/암호화 계약 티키타카 필요.
2026-08-01 — ✅ eng-design APPROVED(수동환전 계좌수집 슬라이스) — 산출: scratchpad/cashout-manual-account-engdesign-decisions-v1-opus5.md v1.2(492줄). 컨트롤러 재검증: §0-1 확정 구현계약(스키마 10항목·암호화키 계약(Vercel 서버 환경변수, NEXT_PUBLIC_ 금지·Production만·Server Action 경유)·RPC 7개 시그니처/검증/상태전이/원장/권한·계좌 90일 파기·창고 켜기고치기 W-1~W-12·경계테스트 15건) + 화면 7개 19상태 매핑 갭 0 실측. 코드/migration 생성 0건 확인(git status clean). verify-agent-quality PASS(WebSearch 8·소크라 6). 회장 확정 3건 반영: 토스 상점 기존유지·원천징수 3.3% 유지(→본인인증 잠정보류, 세무사 미결)·카카오 대행사 솔라피. G5 오판(웰컴 유출 돈구멍) 컨트롤러 코드 직접확인으로 철회, 실이슈=웰컴계산 중복구현(W-6) 단일소스 통합. current_stage → build.

## 📢 문서 규격 공지 (2026-08-02, 하네스 전파)
- **PRD·FDD·QA는 이제 표준 규격 v2를 따른다.** 규격 정본 = `~/.claude/standards/doc-review.md` v2 (IEEE 830/ISO 29148·arc42·Volere·Gherkin 대조).
- **새 문서는 반드시 템플릿에서 시작**: PRD=`~/.claude/standards/templates/doc-template-prd.md` · FDD=`doc-template-fdd.md` · QA=`doc-template-qa.md`.
- 각 문서: 목차·스탬프·TL;DR·표준 섹션·mermaid 다이어그램·요구↔설계↔테스트 매핑(RTM)·RUBRIC_SCORE(≥20/25) 필수. PRD/FDD/QA 한 파일 통합 금지(분할 유지).
- **QA 필수(신규): 빌드된 프론트를 승인 프로토타입과 스크린샷 대조**해 design-conformance-matrix를 채운다. 불일치 미해소면 qa /approve 불가.
