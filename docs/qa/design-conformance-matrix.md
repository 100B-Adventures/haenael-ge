# 해낼게 V2 Design Conformance Matrix

| 항목 | 값 |
|---|---|
| 버전 | v2.1.1 |
| 작성일 | 2026-11-08 |
| 파이프라인 라인 | `v2`, current stage `qa` |
| 승인 시안 | `docs/design/prototypes/social-viral-loop-v3-opus5.html`, SHA-256 `afca1c0374e5c7f7df6e874e41be3f59f6463b2b256f5e2c4e6fef6b24d5de9a` |
| staging 구현 | `https://haenael-ge-v2-staging-100-b.vercel.app`, source SHA `62585130ceaa56a4677e67cea597a0ac0b12697f` |
| 캡처 증거 | `/Users/sj/sj_code_master/haenael-ge-v2-hotfix/.goal/runs/v2-qa-artifacts-20261108/captures/`, `captures-1024/` |

## 2026-11-08 11:4x KST 재판정 (source `14c991d`, 독립 검증 FAIL D3·D4 반영)

**기준.** 모바일 390 = 승인 시안 `docs/design/prototypes/social-viral-loop-v3-opus5.html`. 데스크톱 1024·1440 = DESIGN.md §3.7 레이아웃 표(데스크톱 1024px 상한, 받는사람 화면 1단, 환전 신청만 2단, 정렬선 22px, 페이지별 max-w 금지). 프로토타입 390 프레임은 데스크톱 기준이 아니다. 친구 관계 = 결정 D-024. **04:30 규칙 유지: 승인 시안에 없는 UI 는 디자인 정합에서 `불일치`다**(10:40 에 친구 목록을 `미확인`으로 낮춘 것은 기준 완화였으므로 철회).

**근거 캡처(현재 배포본).** `.goal/runs/g5-cap4/` (staging sourceSha `14c991d`, 390·768·1440 은 `QA-REVERIFY-VIEWPORT-01`, 1024 는 같은 테스트의 1024 실행). 390 시안 대 staging 같은 폭 나란히 = 독립 검증 `.goal/runs/iv-1019-cap/sbs-*-390.png`(현재 배포본과 390 레이아웃 차이 없음: 5d1f7cd 이후 변경은 데스크톱 상한 제거·`word-break`·`:active` 뿐). 수치 = 아래 캡처의 본문 왼쪽 x / 본문 폭(px), 모바일 크기 = `.goal/runs/g5-cap4.log` `RECEIVER_ERGONOMICS` 36행.

| 화면 | 상태 | 행동 명세(시안·정본) | 행동 구현(관찰) | 수치 규격 | 수치 구현 | 판정 | 다른 점과 이유 |
|---|---|---|---|---|---|---|---|
| 랜딩 | 비로그인 | 워드맵·시작 CTA·로그인 시트 | `SMOKE-01`·`QA-TC-GT-03`·`QA-TC-LG-01` PASS(r6) | 390 정렬선 22 / 데스크톱: 받는사람 셸 밖 공개 화면(§3.7 대상 아님) | 390 x=19 폭 351 · 1024 x=336 폭 351 · 1440 x=544 폭 351 | 일치 | 공개 랜딩은 390 본문을 가운데 둔다. §3.7 은 받는사람 셸 규칙 |
| 마이페이지 | 로그인·소개 비어 있음 | 프로필·업적·환전 내역·응원 내역 탭·알림 | `MY-01` PASS, 9폭 크기 위반 0 | 390 정렬선 22 / 데스크톱 1024 상한 1단 정렬선 22 | 390 x=22 폭 345 · 1024 x=22 폭 979 · 1440 x=230(=208+22) 폭 979 | 일치 | 소개 문구 차이는 테스트 회원 소개가 비어 있는 데이터 차이 |
| 친구 목록 | 로그인·친구 3·귀속 없는 과거 응원 20 | 시안: 친구 카드 목록만. D-024: 계정 귀속 응원 쌍은 친구 | 친구 카드 3 + 「과거 응원 기록」 섹션(`G4-FRIEND-HISTORY-01`, `QA-TC-FD-03` PASS) | 390 정렬선 22 / 데스크톱 1024 1단 | 390 x=22 폭 345 · 1024 x=22 폭 979 · 1440 x=230 폭 979 | **불일치** | 시안에 없는 섹션. 귀속 없는 게스트 응원(표시명만)이라 D-024 친구 연결 대상이 아니지만 화면 존재는 시안·결정 어디에도 없다. 판정 기록 필요(아래). 안내문 어절 줄바꿈은 `14c991d` 이전 `7a6760e` 에서 `word-break: keep-all` 로 수정·단언 추가 |
| 친구 상세 | 로그인·친구 목표 | 커버·인물·응원 요약·워드맵 | `QA-REVERIFY-FLOW-01A`·`QA-TC-CL-04` PASS | 390 정렬선 22 / 데스크톱 1024 1단 | 390 x=21 폭 346 · 1024 x=21 폭 980 · 1440 x=229 폭 980 | 일치 | 1440 에서 인물 사진이 얼굴 아래만 보이게 잘림(표현 편차 후보, 레이아웃 규칙 위반 아님) |
| 초대 생성 | 로그인 | 히어로·카카오 미리보기·카카오/링크 2버튼 | `QA-REVERIFY-FLOW-01A` PASS, 9폭 눌림 상태 100%(14c991d 에서 2버튼 `:active` 추가) | 390 정렬선 22 / 데스크톱 1024 1단 | 390 x=21 폭 347 · 1024 x=21 폭 981 · 1440 x=229 폭 981 | 일치 | 종전 왼쪽 390 고정은 5d1f7cd 에서 해소 |
| 초대 수락 | 비회원 초대 링크 | 초대 카드·커버·가입 CTA | `QA-REVERIFY-INVITE-NAV-01`·`CC-01` PASS | 공개 화면, 390 카드 가운데 | 390 x=22 폭 345 · 1024 x=297 폭 389 · 1440 x=505 폭 389 | 일치 | 공개 화면이라 §3.7 받는사람 셸 대상 아님 |
| 목표 관리 | 로그인·소유자 | 필드별 편집·응원자 집계·커버 선택 | `PW-02`·`PW-03`·`PW-04`·`QA-TC-CV-01`·`CV-02` PASS | 390 정렬선 22 / 데스크톱 1024 1단 | 390 x=21 폭 347 · 1024 x=21 폭 981 · 1440 x=229 폭 981 | 일치 | 없음 |
| 공개 목표 | 비로그인·결제 비활성 | 워드맵·고정 응원 CTA | `PW-07`·`QA-TC-SP-03` PASS | 390 정렬선 22 / 데스크톱 1024 1단 | 390 x=21 폭 347 · 1024 x=22 폭 979 · 1440 x=230 폭 979 | 일치 | CTA 문구 「응원 결제 준비 중」은 staging `PAYMENTS_ENABLED=false` 상태 표시 |
| 관리자 | 관리자 | 커버 검토 큐·환전 큐·회원 원장 | `OPS-ALERT-01`·`PW-05`·`QA-REVERIFY-ADMIN-ORPHAN-01` PASS | screen-inventory 15번: 데스크톱 1440 테이블 | 390 x=22 폭 345 · 1024 x=32 폭 959 · 1440 x=208 폭 1023 | 일치 | 관리자는 받는사람 셸이 아니고 인벤토리가 넓은 테이블을 정한다 |

화면 단위 판정: **일치 8 / 불일치 1 / 미확인 0**.

모바일 크기 실측(360·390·412·600·700·780·820·900·1000, 친구 목록·마이페이지·초대 생성·목표 관리 각 9폭 = 36행): 13px 미만 글자 0, 44px 미만 누름 영역 0, 가로 넘침 0, 고정 요소 겹침 0, 눌림 상태 비율 최소 1.0, 본문 토큰 16px, 중앙 글자 13px. 공개 목표는 기존 `MOBILE_ERGONOMICS` 9폭.

**친구 목록 불일치 해소 조건.** 이 섹션은 2.1.1 운영 결함 수정(회원 귀속 전 응원이 사라짐)으로 들어왔다. 회장 결정 또는 회장이 위임한 컨트롤러 판정으로 (가) 승인 시안·화면 인벤토리에 섹션을 추가하고 핀을 갱신하거나 (나) 화면을 바꾼다. 운영에서 CI 로 계정을 특정할 수 있는 귀속 없는 응원 건수는 운영 DB 읽기 권한이 없어 미확인이다(staging 0건).

## 한 줄 결론

**불일치.** 승인 시안과 staging을 390·1024·1440px 같은 viewport에서 직접 대조한 결과, 가로 overflow는 0이지만 9개 화면 모두 1024·1440px에서 승인본의 390px 프레임보다 넓게 확장된다. 친구 목록에는 승인 시안에 없는 `과거 응원 기록` 섹션도 추가되어 있다. 따라서 QA 디자인 게이트를 승인할 수 없다.

## 판정 규칙

- 판정어는 `일치`, `불일치`, `미확인`만 사용한다.
- 화면 판정은 배치·문구·overflow 세 항목 중 하나라도 `불일치`면 `불일치`다.
- 이름·목표명·사진·숫자·wordmap 단어 위치 같은 fixture 데이터는 문구 판정에서 제외한다.
- 승인 시안과 staging 캡처는 같은 viewport에서 열었다. 승인 시안 자체는 390px `.frame`을 유지한다.
- `과거 응원 기록`은 기능 결함 여부와 별개로 승인 시안에 없는 UI이므로 디자인 정합에서는 `불일치`다.

## 화면별 정합 매트릭스

| 화면 | 같은 폭 대조 | 배치 | 문구 | overflow | 화면 판정 | 관찰 근거 |
|---|---|---|---|---|---|---|
| 랜딩 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | staging wordmap·CTA·하단 탭 프레임이 desktop에서 승인본보다 확대됨 |
| 마이페이지 | 390·1024·1440 | 불일치 | 불일치 | 일치 | 불일치 | desktop 카드 폭 확대. 승인본 소개 문구와 staging 기본 소개 문구가 다름 |
| 친구 목록 | 390·1024·1440 | 불일치 | 불일치 | 일치 | 불일치 | desktop 목록이 전체 폭으로 확장. 승인본에 없는 `과거 응원 기록` 섹션이 추가됨 |
| 친구 상세 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | desktop cover·portrait·wordmap 폭이 승인본 390px 프레임보다 확대됨 |
| 초대 생성 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | desktop hero·Kakao preview·action 영역 폭이 확대됨 |
| 초대 수락 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | 390px 승인 위치는 복원됐지만 desktop cover·CTA 폭이 확대됨 |
| 목표 관리 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | WHY 편집 아이콘 중심은 일치하나 desktop cover·wordmap·응원자 목록이 전체 폭으로 확대됨 |
| 공개 목표 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | desktop content·wordmap·sticky CTA 폭이 승인본보다 확대됨 |
| 관리자 | 390·1024·1440 | 불일치 | 일치 | 일치 | 불일치 | desktop 환전 queue와 회원·ledger가 2열 전체 폭으로 확장됨 |

화면 단위 판정: **일치 0 / 불일치 9 / 미확인 0**.

## 반응형·배치 관찰

| 폭 | runtime | 가로 overflow | 승인 시안 정합 | 증거 |
|---:|---|---:|---|---|
| 390 | 일치 | 0 | 화면별 세부 차이 외 기본 모바일 구조 관찰 | `captures/approved-*-390.png`, `captures/dev-*-390.png` |
| 768 | 일치 | 0 | 미확인 | staging 캡처만 존재하므로 같은 폭 디자인 판정에는 사용하지 않음 |
| 1024 | 일치 | 0 | 불일치 | `captures-1024/approved-*-1024.png`, `captures-1024/dev-*-1024.png` |
| 1440 | 일치 | 0 | 불일치 | `captures-1024/approved-*-1440.png`, `captures/dev-*-1440.png` |

`QA-REVERIFY-VIEWPORT-01`의 1024px 표적 실행은 1/1 PASS, fixture cleanup 0이다. 목표 관리 WHY 행과 편집 버튼의 세로 중심 차이는 0px, hit ownership은 모두 true였다. 이 결과는 runtime·overflow 통과 증거이며 승인 시안 정합 통과로 대체하지 않는다.

## 현재 출고 차단 항목

1. desktop max-width 정책. 승인본은 390px frame을 유지하지만 staging은 화면별로 약 640px 또는 viewport 전체 폭까지 확장된다.
2. 친구 목록의 `과거 응원 기록`. 기능 hotfix로 추가됐지만 승인 시안에는 없는 섹션이다. 디자인 정본을 변경하거나 제품 UI를 승인본에 맞추는 결정이 필요하다.
3. 마이페이지 기본 소개 문구. 승인본과 staging 문구가 다르다.

## 증거 무결성

- staging health가 `sourceSha=62585130ceaa56a4677e67cea597a0ac0b12697f`, `version=2.1.1`, database `ok`를 반환했다.
- 판정에 사용한 핵심 캡처는 승인·staging same-width 27쌍(9화면 × 390·1024·1440)이다. staging 768px 9장과 마이페이지 상태 5장은 responsive·상태 증거로 별도 보존했다.
- 이번 판정에서 승인·staging 이미지를 모두 이미지 Read로 직접 열었다.
- 테스트 기대값은 수정하지 않았다. 1024px 실행용 임시 복사본은 실행 후 삭제했고 tracked diff는 0이다.
- 운영 배포와 `/approve`는 수행하지 않았다.

## 개정 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v2.1.1 | 2026-11-08 | current staging source에서 390·1024·1440 same-width 전수 대조. 9개 화면 불일치 판정 |
| v2.0.0 | 2026-10-25 | 목표 관리 badge 재대조로 과거 포괄 판정 철회 |

KNOWLEDGE_QUERY: 해당 없음. 이미 승인된 D-049 프로토타입과 current staging의 기계적 same-width 재검증 작업
HITS_USED: `pipeline-state.v2.md`, `~/.claude/pipeline/product-lane.yaml` qa 정의, 승인 prototype SHA, current staging screenshot
HITS_REJECTED: 과거 9/9 일치 자기신고는 current source same-width 관찰과 충돌하므로 출고 근거에서 제외
CONFLICTS: 기능 hotfix의 `과거 응원 기록`은 제품 요구에는 필요하지만 승인 디자인에는 없음
MODEL: GPT-5 계열 Codex
벤치마크: 해당 없음. 승인 시안과 구현의 기계적 대조이며 외부 디자인 기준을 새로 정하지 않음
소스 1: `pipeline-state.v2.md`
소스 2: `~/.claude/pipeline/product-lane.yaml`
소스 3: `/Users/sj/sj_code_master/haenael-ge-v2-hotfix/.goal/runs/v2-qa-artifacts-20261108/captures-1024/`

🏷 STAMP | line: v2 | 생성: 2026-11-08 KST | agent: Codex | skill: qa | 근거: same-width approved+staging image Read, source SHA health, viewport E2E
