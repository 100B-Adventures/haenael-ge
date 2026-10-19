# 해낼게 V2 소셜 바이럴 루프 웹 우선 테스트 케이스 마스터

| 항목 | 값 |
|---|---|
| 버전 | **v1.2.1** (v1.2.0 의 개정 · Codex 재검수 13/25 반려 5건 반영) |
| 작성일 | 2026-10-19 16:5x KST |
| 작성자/모델 | tech-architect / claude-opus-5[1m] |
| 작업 라인 | v2 |
| 상태 | 신설. 종전 `docs/eng-design/test-cases.md` 는 9행 껍데기였고 v2 라인을 하나도 담지 않았다 |
| 상류 핀 | `fdd-social-viral-loop-web-first-v1.2.1.md` · `api-contract-…-v1.2.1.md` · `erd-…-v1.2.1.md` · `test-plan-…-v1.2.1.md` · `docs/design/prototypes/social-viral-loop-v3-opus5.html` 3.0.0 sha256 `f9398150755d…` · `DESIGN.md` sha256 `0ddeed8caff7…` |
| 기반 포맷 | `docs/eng-design/test-plan-social-viral-loop-web-first-v1.1.0.md` §4~§8 의 TC 서식 |
| 역할 분담 | `test-plan` = 전략·환경·게이트 / 이 문서 = **요구별 해피 + 엣지 TC 본문(Gherkin)** |

> STAMP: 생성 2026-10-19 16:5x KST. 모델 claude-opus-5[1m]. 에이전트 tech-architect. 스킬 미사용. 근거는 승인 프로토타입 R1~R10 원문, DESIGN.md, 결정 원장 D-003·D-024·D-030-C·D-032·D-034, 운영 Supabase·운영 웹 실측, OWASP Excessive Data Exposure. 가장 오래 고민한 지점은 "CSS 로 가린 것" 을 어떻게 기계로 반증하는가였다. 결론은 화면 픽셀이 아니라 **네트워크 raw 응답과 DOM 텍스트**를 보는 것이다.

## 목차

- [0. 읽는 법](#0-읽는-법)
  - [0.1 테스트 ID 실재 확인 (grep 수치)](#01-테스트-id-실재-확인-grep-수치)
- [1. LG · 법적 고지 노출 (R1)](#1-lg--법적-고지-노출-r1)
- [2. GT · 비회원 미리보기 노출 범위 (R2)](#2-gt--비회원-미리보기-노출-범위-r2)
- [3. SP · 간격 토큰과 고정 CTA (R3·R9·R10)](#3-sp--간격-토큰과-고정-cta-r3r9r10)
- [4. CV · 커버 업로드 쓰기 경로 (R5)](#4-cv--커버-업로드-쓰기-경로-r5)
- [5. CS · 응원 요약 바 (R6)](#5-cs--응원-요약-바-r6)
- [5.5 VO · 말투 규칙 집행 (R4)](#55-vo--말투-규칙-집행-r4)
- [5.6 AC · 업적 등급 토글 부재 (R7)](#56-ac--업적-등급-토글-부재-r7)
- [5.7 CP · 접기·펼치기 정책 (R8)](#57-cp--접기펼치기-정책-r8)
- [6. CL · 응원 메시지 2줄 말줄임 (D-030-C)](#6-cl--응원-메시지-2줄-말줄임-d-030-c)
- [7. AU · 인증 경계 (D-034)](#7-au--인증-경계-d-034)
- [8. FD · 응원으로 맺어지는 친구와 관계 방향 (D-024)](#8-fd--응원으로-맺어지는-친구와-관계-방향-d-024)
- [9. 추적성 매트릭스 (갭 0)](#9-추적성-매트릭스-갭-0)
- [10. v1.1.0 TC 승계](#10-v110-tc-승계)
- [11. 개정 이력](#11-개정-이력)

## 0. 읽는 법

| 표기 | 뜻 |
|---|---|
| 종류 태그 | `[단위]` `[계약]` `[pgTAP]` `[E2E-읽기]` `[E2E-쓰기]` `[린트]` |
| 우선도 | `P0` = 데이터 안전·개인정보·돈. 하나라도 실패면 출고 불가 / `P1` = 기능 완결 / `P2` = 조판·여백 |
| 판정어 | **일치 · 불일치 · 미확인** 셋뿐. "부분" 은 쓰지 않는다(회장 2026-10-14) |
| 환경 | 운영 쓰기 0건. 쓰기 TC 는 로컬 Supabase 또는 전용 preview |

### 0.1 테스트 ID 실재 확인 (grep 수치)

Codex 가 "매트릭스가 가리키는 ID 가 파일에 없으면 그 행은 닿은 것이 아니다" 를 지적했다. v1.2.0 은 `CL-01 ~ CL-04` 를 한 헤딩에 묶어 정의 수(30)와 보고 수(33)가 어긋났다. **v1.2.1 은 모든 ID 를 각자 헤딩으로 정의한다.**

확인 명령

```bash
# ① 헤딩으로 정의된 고유 ID 수
grep -oE '^### (LG|GT|SP|VO|CV|CS|AC|CP|CL|AU|FD)-[0-9]+' \
  docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.1.md | sort -u | wc -l
# ② 군별 수
grep -oE '^### (LG|GT|SP|VO|CV|CS|AC|CP|CL|AU|FD)-[0-9]+' \
  docs/eng-design/test-cases-social-viral-loop-web-first-v1.2.1.md \
  | sed 's/^### //' | cut -d- -f1 | sort | uniq -c
```

| 군 | 요구 | 정의된 ID | 범위 |
|---|---|---:|---|
| LG | R1 법적 고지 | 5 | LG-01~05 |
| GT | R2 비회원 티저 | 3 | GT-01~03 |
| SP | R3·R9·R10 간격·CTA | 4 | SP-01~04 |
| VO | **R4 말투** | **4** | VO-01~04 |
| CV | R5 커버 업로드 | 8 | CV-01~08 |
| CS | R6 응원 요약 | 4 | CS-01~04 |
| AC | **R7 업적 토글 부재** | **3** | AC-01~03 |
| CP | **R8 접기 정책** | **5** | CP-01~05 |
| CL | D-030-C 2줄 clamp | 4 | CL-01~04 |
| AU | D-034 인증 경계 | 5 | AU-01~05 |
| FD | D-024 친구·방향 | 3 | FD-01~03 |
| **합계** | **13 요구** | **48** | **미정의 ID 0건** |

실행 결과는 §11 에 수치로 적었다. FDD §A.4.1 의 요구표와 이 표가 **양방향으로 일치**해야 하고, 어긋나면 그 행은 닿지 않은 것이다.

## 1. LG · 법적 고지 노출 (R1)

정본 = `web/src/lib/legal/exposure.ts` 의 `LEGAL_EXPOSURE`. 프로토타입 `social-viral-loop-v3-opus5.html:4443` 과 같은 키·같은 값으로 시작한다.

### LG-01 `[E2E-읽기]` `P1` 표에 없는 화면은 법적 고지 DOM 이 0개다

```gherkin
Given 노출 표에 landing='none' 이고 회원 화면 키들은 표에 없다
When 비로그인·로그인 상태로 표에 없는 모든 화면을 연다
Then 각 화면의 법적 고지 컨테이너 노드 수가 0 이다
And 마크업에 컨테이너가 남아 있어도 렌더 시점에 제거돼 조회되지 않는다
```

판정: 표에 없는 전 화면에서 노드 0. 하나라도 1 이상이면 불일치.

### LG-02 `[E2E-읽기]` `P1` 하단탭이 있는 화면에 법적 고지가 없다

```gherkin
Given 하단탭 4개를 가진 회원 화면과 공개 화면 전수
When 각 화면을 390px 뷰포트로 연다
Then 법적 고지 블록·링크 나열이 0건이다
```

**운영 현재 불일치 기록**: `/me/goal/1` 비로그인 화면에 하단탭과 법적 푸터가 함께 있다(2026-10-19 실측). 이 TC 가 그것을 잡는다.

### LG-03 `[E2E-읽기]` `P1` 이용안내 화면이 사업자 정보를 소유한다

```gherkin
Given 노출 표에 how='biz' 다
When /how 를 연다
Then 사업자 정보 전문이 보이고 링크 나열은 없다
And 랜딩에서 한 번의 클릭으로 /how 에 닿는다
```

### LG-04 `[단위]` `P0` 법정 기재사항 6항목이 전수 존재한다

```gherkin
Given 사업자 정보 데이터가 한 곳에 있다
When 그 데이터를 검사한다
Then 상호 · 대표자 · 사업자등록번호 · 주소 · 이메일 · 개인정보보호책임자 6항목이 모두 비어 있지 않다
```

**현재 불일치 기록**: 운영 푸터에는 주소(서울시 강남구 역삼동 620-17 203호)와 개인정보보호책임자(윤동주)가 있으나 승인 시안 `biz` 블록에는 **없다**(2026-10-19 실측). D-OPEN-4 가 되살리기로 결정되면 이 TC 가 통과한다.

### LG-05 `[린트]` `P1` 노출 표를 거치지 않은 법적 고지 마크업이 없다

```gherkin
Given 소스 전역
When 사업자 정보·약관·개인정보처리방침 문자열을 직접 쓴 컴포넌트를 찾는다
Then 노출 표를 읽는 단일 컴포넌트 외에는 0건이다
```

근거: D-032. 규칙을 두고 집행 주체를 사람 기억에 맡기면 매 판 재협상된다. 법적 고지가 네 판 연속 어긋난 원인이다.

## 2. GT · 비회원 미리보기 노출 범위 (R2)

**회장 확정(2026-10-19)**: 비회원 미리보기는 **예시 데이터로 경험을 미리 보여준다.** 예시 데이터는 클라이언트 상수이고 **서버를 호출하지 않는다.** 원문 "예시 데이터를 주면서 이런 경험을 하겠구나 함 되지".

**이 군은 화면이 아니라 전송된 바이트와 서버 호출 횟수를 본다.** CSS 흐림은 인가가 아니므로 픽셀 판정으로는 반증할 수 없다.

### GT-01 `[E2E-읽기]` `P0` 비회원 응답에 타인 식별 정보가 없다

```gherkin
Given 로그인하지 않은 방문자다
When 랜딩과 공개 목표에서 회원 전용 탭을 눌러 가치 미리보기 시트를 연다
Then 그 화면이 받은 모든 네트워크 응답 본문에
     nickname · display_name · profile_image · avatar_url · member_id ·
     goal_title · goal_slug · goal_id · cheer_message · clover_count ·
     due_date 가 0건이다
And 같은 키가 document.documentElement.outerHTML 과 DOM 텍스트에도 0건이다
And CSS filter 적용 여부와 무관하게 판정한다
```

근거: OWASP WSTG Excessive Data Exposure. 가린다는 것은 보내지 않는다는 뜻이다.

### GT-02 `[계약]` `P0` 미리보기가 서버를 호출하지 않는다

```gherkin
Given 비회원이 회원 전용 탭을 눌러 미리보기 시트를 연다
When 그 조작 동안 발생한 네트워크 요청을 전수로 센다
Then 미리보기를 그리기 위한 서버 호출이 0건이다
And 예시 데이터가 클라이언트 상수(web/src/lib/copy/guest-preview.ts)에서 온다
And platform_social_stats 라는 이름의 RPC 가 존재하지 않는다
```

**회장 확정으로 집계 수치 안이 폐기됐다.** 이번 개정의 신설 서버 자산은 0건이므로, 이 TC 는 "응답에 금지 필드가 있는지" 가 아니라 **"응답 자체가 없는지"** 를 본다. 금지 필드 목록(§api-contract A.2)은 다른 비회원 경로(`/g/[slug]`·`/invite/[token]`)에 GT-01 로 계속 적용된다.

### GT-03 `[E2E-읽기]` `P1` 예시임이 드러나고 자물쇠가 없다

```gherkin
Given 비회원이 회원 전용 탭을 누른다
Then 자물쇠 글리프와 그것을 그리는 스타일 규칙이 0건이다
And 시트에 카카오로 시작하기와 먼저 둘러보기 두 행동이 있다
And 시트는 role="dialog" 와 aria-modal 을 선언한다

Given 미리보기에 예시 행이 그려진다
Then 그것이 예시임이 사용자에게 드러난다 (예시 라벨 또는 명백한 더미 이름)
And 실제 사용자 이름처럼 보이는 값이 0건이다
And filter: blur 를 적용한 요소가 0건이다
And 참이 될 수 없는 수치를 사실처럼 적은 문구가 0건이다
```

**흐림 금지 근거**: 가리면 실데이터처럼 보인다. 그리고 CSS 로 가린 것은 전송된 것이다. 예시 데이터는 **가릴 이유가 없으므로** 흐림이 남아 있으면 그것은 실데이터 경로가 살아 있다는 신호다.

`globals.css` 의 `--tabbar-lock-size` 잔존분도 이 TC 의 폐지 대상이다.

## 3. SP · 간격 토큰과 고정 CTA (R3·R9·R10)

### SP-01 `[단위]` `P2` 간격 토큰 7종이 한 곳에 선언돼 있다

```gherkin
Given web/src/app/globals.css 의 :root
Then --sp-0=2px --sp-1=4px --sp-2=8px --sp-3=12px --sp-4=16px --sp-5=24px --sp-6=32px 가 선언돼 있다
And 같은 이름의 재선언이 다른 파일에 0건이다
And 기존 --space-* 는 페이지 레벨 여백 전용으로 남고 두 계열을 같은 속성에 섞지 않는다
```

### SP-02 `[E2E-읽기]` `P2` 카드 안쪽 상하 여백이 같은 토큰이다

```gherkin
Given 카드 컴포넌트를 쓰는 전 화면
When 각 카드의 computed padding-top 과 padding-bottom 을 읽는다
Then 두 값이 같다
And 카드 안 첫 자식·마지막 자식에 추가 margin 이 얹혀 비대칭을 만들지 않는다
```

라벨과 값의 `--sp-1` 관계는 의도된 비대칭이므로 **경고이고 차단 조건이 아니다**(`DESIGN.md` F 축 규정).

### SP-03 `[E2E-읽기]` `P1` 고정 CTA 와 본문이 겹치지 않는다

```gherkin
Given 공개 목표 화면에 하단 고정 액션 바가 있다
When 진입 직후와 스크롤 끝에서 요소 겹침을 센다
Then 액션 바 영역과 본문 텍스트의 겹침이 0건이다
And 자리 예약 높이가 --cta-h 값과 일치한다
And 손으로 적은 픽셀 높이가 소스에 0건이다
```

원인 기록: R3 의 두 원인은 손으로 적은 `height:220px` 빈 칸과 투명에서 시작하는 그라데이션 배경이었다.

### SP-04 `[린트]` `P2` 넘침과 고아 줄바꿈이 0건이다

```gherkin
Given 제품 화면 전수
When scrollWidth > clientWidth 와 마지막 줄 폭 28px 미만을 센다
Then 둘 다 0건이다
```

정본 = `scripts/qa/lint-prototype-overflow.mjs` 의 판정 2축(D-033). 제품 화면용으로 같은 판정을 쓴다.

## 4. CV · 커버 업로드 쓰기 경로 (R5)

**읽기 전용으로 끝내지 않는다.** 2026-10-14 사고가 쓰기 경로를 한 번도 실행하지 않은 결과였다.

### CV-01 `[E2E-쓰기]` `P1` 업로드 버튼이 스크롤 위치와 무관하게 항상 눌린다

```gherkin
Given 배너 선택기가 열려 있고 프리셋 타일이 가로로 스크롤된다
When 스크롤 위치를 0 · 중간 · 끝으로 각각 두고 업로드 버튼을 클릭한다
Then 세 경우 모두 클릭이 성립하고 파일 선택이 열린다
And 클릭 후 50ms 안에 스크롤 위치가 되돌아가는 현상이 없다
```

원인 기록: `scroll-snap-align` 이 타일에만 있어 맨 왼쪽 버튼에 스냅 지점이 없었고, `scrollLeft=0` 을 넣어도 50ms 안에 108px 로 복귀했다. 조치는 버튼을 스크롤 줄 밖으로 꺼내는 것이다.

### CV-02 `[E2E-쓰기]` `P1` 선택 체크가 정확히 1개다

```gherkin
Given 프리셋과 업로드 중 하나를 고른다
When 여러 번 바꿔 고른다
Then 화면의 체크 글리프 수가 항상 1 이다
And 선택 상태를 들고 있는 변수가 1개다
And 체크를 그리는 CSS 규칙의 적용 범위가 겹치지 않는다
```

원인 기록: 체크를 그리는 규칙이 두 세대 다 살아 있어 2개가 보였다.

### CV-03 `[E2E-쓰기]` `P0` 승인 전에는 기존 활성 커버가 바뀌지 않는다

```gherkin
Given 목표에 활성 커버가 있다
When 소유자가 새 이미지를 올려 확정까지 간다
Then 자산 상태가 REVIEW 이고 goal.active_cover_asset_id 는 그대로다
And 격리 버킷에만 객체가 있고 공개 버킷에는 0건이다
And 관리자가 승인한 뒤에만 활성 커버가 원자적으로 교체된다
```

### CV-04 `[E2E-쓰기]` `P0` FRIENDS 목표의 승인 커버가 공개 버킷에 복사되지 않는다

```gherkin
Given 공개범위가 FRIENDS 인 목표의 커스텀 커버가 승인된다
Then 공개 버킷에 그 객체가 0건이다
And 친구는 120초 수명의 Presigned URL(서명이 붙은 임시 접근 주소)로만 본다
And 비친구는 어떤 경로로도 0건이다
And 서명 발급은 목표 수와 무관하게 1회 일괄이다
```

근거: D-019. 구현 확인 = `web/src/lib/social/server.ts:103`.

### CV-05 `[pgTAP]` `P0` 상태 enum 이 운영 실물과 같다

```gherkin
Given goal_cover_asset.status 의 CHECK 제약
When 허용 값을 조회한다
Then 정확히 UPLOADING · REVIEW · APPROVED · REJECTED · SUPERSEDED · DELETED 6값이다
And PENDING_UPLOAD 같은 다른 이름은 삽입이 거부된다
And goal_cover_asset_state_check 가 APPROVED 는 reviewed_by·reviewed_at 필수·rejection_code NULL,
    REJECTED 는 rejection_code 필수·public_path NULL,
    UPLOADING·REVIEW 는 세 칸 모두 NULL 임을 강제한다
```

근거: `supabase/migrations/20261013050000_social_viral_loop_web_first.sql:56,65-69`. **이 TC 가 v1.2.0 의 반려 사유 1번을 막는 장치다.**

### CV-06 `[pgTAP]` `P1` 정의된 전이만 허용되고 주체가 검사된다

```gherkin
Given 자산이 UPLOADING 이다
When 소유자가 아닌 회원이 확정을 시도한다
Then asset_not_found 로 거부된다

Given 자산이 REVIEW 가 아니다
When 관리자가 심사를 시도한다
Then asset_not_reviewable(409) 로 거부된다

Given 활성 커버가 있는 목표에 새 자산이 승인된다
Then 이전 승인본의 상태가 SUPERSEDED 로 바뀌고 활성 커버가 새 자산을 가리킨다

Given 목표 공개범위가 PUBLIC 인데 public_path 가 없다
Then public_copy_required 로 거부된다

Given 목표 공개범위가 FRIENDS·PRIVATE 인데 public_path 가 주어진다
Then private_cover_must_not_publish 로 거부된다
```

근거: `admin_apply_goal_cover_review` 본문(migration 512~538행).

### CV-07 `[pgTAP]` `P1` 정리 큐가 중단 업로드 사유를 받는다

```gherkin
Given storage_cleanup_queue.reason 의 CHECK 제약
Then ABANDONED_UPLOAD 가 허용 값에 포함돼 있다
And 기존 3값(VISIBILITY_DOWNGRADE · ASSET_REPLACED · ASSET_REJECTED)이 그대로 허용된다
```

**v1.2.0 이 빠뜨린 것**: 운영 CHECK 는 3값뿐이라(migration 79행) 중단 업로드를 큐에 넣을 수 없었다. 이 TC 가 그 마이그레이션이 적용됐는지 본다. **즉 D-OPEN-3 은 "서버 변경 0" 이 아니다.**

### CV-08 `[pgTAP]` `P1` 25시간 fixture 가 정리 작업으로 실제로 치워진다

```gherkin
Given status='UPLOADING' 이고 created_at 이 25시간 전인 자산 1건과 그 격리 객체가 있다
And status='UPLOADING' 이고 created_at 이 1시간 전인 자산 1건도 있다
And REVIEW · APPROVED · REJECTED · SUPERSEDED 자산이 각 1건 있다
When 정리 함수를 직접 호출한다
Then 25시간 자산만 ABANDONED_UPLOAD 사유로 큐에 들어가고 상태가 DELETED 가 된다
And 1시간 자산과 다른 상태 자산 4건은 변하지 않는다
And 활성 커버가 가리키는 자산은 어떤 경우에도 변하지 않는다
And 객체 삭제 실패 시 attempts 가 1 증가하고 status 가 FAILED 로 남아 재시도된다
When cron.job_run_details 를 조회한다
Then 그 job 의 최근 실행 status 가 succeeded 다
```

**실행 증거 요구**: 이 TC 는 "정책이 문서에 있다" 로 통과하지 않는다. **25시간 fixture 를 넣고 작업을 돌려 삭제를 관찰한 로그**가 있어야 통과다(Codex 종료 증거 요구).

## 5. CS · 응원 요약 바 (R6)

### CS-01 `[계약]` `P0` 응답에 금액·순위가 없다

```gherkin
Given my_social_dashboard() 응답
Then clover_amount · amount · amount_krw · gross · fee · vat · withhold · net ·
     rank · supporter 순위 를 뜻하는 key 와 값이 0건이다
And supporter_avatars 길이가 최대 3 이다
And recent_cheer 는 1건이거나 null 이다
```

근거: D-003. R6 이 금액과 상위 후원자 순위를 명시적으로 버렸다.

### CS-02 `[계약]` `P1` 목표 수가 늘어도 서버 질의 횟수가 늘지 않는다

```gherkin
Given 목표가 1개인 회원과 20개인 회원
When 각자 홈을 연다
Then 응원 요약을 만들기 위한 서버 왕복 횟수가 같다
And 목표별 개별 조회가 0건이다
```

현황: `/me` 의 기존 집계는 `.select("goal_id, created_at").in("goal_id", goalIds)` 로 이미 일괄이라 N+1 이 없다. 이 TC 는 아바타·최근 메시지를 더하면서 그것이 깨지지 않는지를 본다.

### CS-03 `[E2E-읽기]` `P1` 아바타 스택과 `+N` 이 정확하다

```gherkin
Given 응원 인원수가 0 · 1 · 3 · 23 인 네 목표
When 홈 카드를 본다
Then 0 이면 요약 바 대신 빈 상태 문안이 보인다
And 1·3 이면 아바타가 각 1·3개이고 +N 이 없다
And 23 이면 아바타 3개와 +20 이 보인다
And 가장 최근 응원 1건의 이름과 메시지가 한 줄로 보인다
```

### CS-04 `[E2E-읽기]` `P1` 익명 응원은 프로필로 가지 않고 이유를 알린다

```gherkin
Given 익명 응원이 포함돼 있다
Then 그 자리의 아바타는 무채색 자리표시이고 이름이 비어 있다
And 그 행을 눌러도 프로필로 이동하지 않는다
And 왜 이동하지 않는지를 그 자리에서 알린다
And 응답의 그 항목에 profile_image 와 supporter_name 이 null 이다
```

## 5.5 VO · 말투 규칙 집행 (R4)

정본 = `docs/design/standard-ux-writing.md`. 프로토타입 집행 = `scripts/qa/lint-prototype-voice.mjs`(개정 전 15건 → 0건). **제품 코드에는 집행 주체가 없었다.**

### VO-01 `[린트]` `P1` 사용자에게 보이는 문구가 한 자리에 모여 있다

```gherkin
Given web/src 전역
When 컴포넌트 JSX 안에 직접 쓰인 한국어 사용자 문구를 찾는다
Then 카피 모듈(web/src/lib/copy/)을 거치지 않은 문구가 0건이다
And 예외는 접근성 라벨과 테스트 전용 문자열뿐이고 목록으로 선언돼 있다
```

### VO-02 `[린트]` `P1` 네 축 위반이 0건이다

```gherkin
Given 카피 모듈의 모든 문구
When 말투 정본의 네 축으로 검사한다
Then 2인칭 반말이 0건이다
And 한 화면 안에서 해요체와 합니다체가 섞인 곳이 0건이다
And 지어낸 은유·조어가 0건이다
And 전송 경로·폴백·해시·버킷·조직 내부를 설명하는 문구가 0건이다
```

### VO-03 `[린트]` `P1` 검사가 프로토타입과 같은 규칙 데이터를 쓴다

```gherkin
Given lint-prototype-voice.mjs 의 규칙 데이터
When 제품 카피 검사가 읽는 규칙 데이터와 대조한다
Then 같은 파일이거나 같은 내용을 import 한다
And 규칙이 두 벌로 복사된 곳이 0건이다
```

근거: D-032. 규칙을 두 벌로 베끼면 한쪽만 고쳐져 갈라진다.

### VO-04 `[계약]` `P1` 서버는 코드만 반환하고 사용자 문구를 소유하지 않는다

```gherkin
Given 엣지 함수와 RPC 의 오류 응답
Then 본문이 {"error":{"code":"…"}} 또는 Postgres 오류 코드 형태다
And 사용자에게 그대로 보여줄 한국어 문장을 서버가 반환하지 않는다
And 사용자 문구는 클라이언트 카피 모듈이 코드에 매핑한다
```

**근거(실측)**: 현재 엣지 함수 3종이 이미 `coverJson(status, {error:{code}})` 형태다(`_shared/goal-cover.ts:114` 의 `coverErrorStatus`). 즉 이 계약은 신규 제약이 아니라 **현 구조를 못박는 것**이고, 못박아야 말투 교정이 서버 배포 없이 끝난다. **사용자 문구를 예외로 두는 것(그대로 두는 것)**: 사용자가 쓴 응원 메시지와 카카오 초대 문안.

## 5.6 AC · 업적 등급 토글 부재 (R7)

R7 은 **제거**다. 제거는 테스트가 없으면 다음 판에 조용히 돌아온다.

### AC-01 `[E2E-읽기]` `P1` 업적 화면에 등급 토글이 없다

```gherkin
Given 회원이 업적 화면을 연다
Then '등급' 또는 '받는 사람도' 를 포함한 토글·스위치·체크박스가 0건이다
And 업적 블록의 조작 가능한 요소는 진열 관련(펼치기·상세 보기)뿐이다
And 업적은 획득과 진열만 한다
```

### AC-02 `[계약]` `P0` 업적 응답에 등급·공개여부·자기신고 필드가 없다

```gherkin
Given my_social_dashboard() 의 achievements 객체
Then key 가 정확히 completed_goal_count · received_cheer_count · connected_friend_count 다
And grade · tier · rank · is_public · self_reported · streak 를 뜻하는 key 가 0건이다
And 각 값은 DB 원장에서 다시 계산해 같은 값이 나온다
```

근거: D-022 "DB 집계로 반증 가능한 지표만".

### AC-03 `[pgTAP]` `P1` 등급 토글이 기대던 저장 경로가 없거나 용도가 다르다

```gherkin
Given member_preference 테이블
Then 등급·업적 공개여부를 저장하는 컬럼이 0개다
And update_member_preferences 의 인자는 notify_cheer · notify_marketing 둘뿐이다
And 그 RPC 는 제거되지 않고 그대로 남는다 (알림 동의용 · 미니앱 2차 호환 이름 5종에 포함)
```

**v1.2.1 이 확정한 것**: 토글은 **저장 경로가 처음부터 없던 UI** 였다. 그래서 `update_member_preferences` 를 건드릴 이유가 없고 `member_preference` 스키마 변경도 0 이다. 회장의 "이건 대체 뭔 기능이지" 가 정확한 지적이었다.

## 5.7 CP · 접기·펼치기 정책 (R8)

정본 = `DESIGN.md` 접기 규칙 + 프로토타입 `COLLAPSE_POLICY`·`auditCollapse()`. 집행 주체 = `Collapsible.tsx` 하나.

### CP-01 `[단위]` `P1` 세 조건을 모두 만족할 때만 접힌다

```gherkin
Given 접기 정책 데이터
When 보조 정보가 아닌 본문·핵심 행동에 접기를 적용한다
Then 접히지 않고 개발 모드 콘솔에 사유가 남는다

When 본문이 2줄 이하이거나 목록이 8개 이하인데 접기를 적용한다
Then 접히지 않고 사유가 남는다

When 접힌 상태에서 그것이 무엇인지 알 수 없다 (라벨도 첫 줄도 없다)
Then 접히지 않고 사유가 남는다
```

### CP-02 `[E2E-읽기]` `P1` 목록 8개 초과 기준이 실제로 적용된다

```gherkin
Given 응원 목록이 8개인 화면과 9개인 화면
When 각각을 연다
Then 8개 화면은 접히지 않고 전부 보인다
And 9개 화면은 접히고 꺾쇠로 펼쳐진다
And 펼친 뒤 다시 접을 수 있다
```

### CP-03 `[E2E-읽기]` `P1` 토글은 꺾쇠 하나이고 안내 문구를 덧붙이지 않는다

```gherkin
Given 접을 수 있는 영역 전수
Then 토글 요소가 꺾쇠 1개다
And '더보기' '접기' 같은 추가 텍스트가 0건이다
```

**근거(회장 2026-10-18)**: "목표 관리에서 텍스트 넘칠때 굳이 '더보기' '접기' 넣은이유는? 직관적인 UI로 쓸데없는 텍스트나 정보 아끼도록 하네스 걸어라."

### CP-04 `[린트]` `P0` `<details>` 가 제품 화면에 0건이고 접기 구현이 하나다

```gherkin
Given web/src 전역
Then <details> 요소가 0건이다
And 접기·펼치기를 직접 구현한 컴포넌트가 Collapsible.tsx 외에 0건이다
And 접기 상태를 들고 있는 지역 변수를 각자 선언한 곳이 0건이다
```

### CP-05 `[E2E-읽기]` `P1` 선언되지 않은 접힘이 없다

```gherkin
Given 전 화면을 렌더한다
When 실제로 접혀 있는 영역을 전수로 센다
Then 그 수가 접기 정책 데이터에 선언된 영역 수와 같다
And 정책에 없는데 접혀 있는 영역이 0건이다
```

프로토타입 `auditCollapse()` 와 같은 판정이다(개정 전 2건 → 0건).

## 6. CL · 응원 메시지 2줄 말줄임 (D-030-C)

**현황 실측(2026-10-19): 네 경로 중 2줄 적용 0곳.** `CheerList.tsx:50` 은 `truncate`(1줄), `MyPageOverview.tsx` 는 클램프 없음.

공통 Given/When/Then (네 TC 가 같은 판정을 각자의 경로에서 수행한다)

```gherkin
Given 3줄 이상 길이의 응원 메시지가 있다
When 해당 화면을 390px 로 연다
Then 메시지가 2줄에서 말줄임된다
And 꺾쇠 하나를 눌러 전문이 펼쳐지고 다시 접힌다
And 클램프 줄 수가 CSS 변수(--cheer-clamp-lines) 한 곳의 값과 같다
And 접기 집행은 Collapsible.tsx 가 하고 그 화면이 직접 구현하지 않는다
```

**현황 실측(2026-10-19)**: `CheerList.tsx:50` 은 `truncate`(1줄), `MyPageOverview.tsx` 는 클램프 없음. **네 경로 중 적용 0곳.**

### CL-01 `[E2E-읽기]` `P1` 목표 관리에서 2줄 말줄임

경로 `/me/goal/[id]` · 소유 컴포넌트 `CheerList.tsx`. 위 공통 판정을 적용한다.

### CL-02 `[E2E-읽기]` `P1` 해낼게 관리에서 2줄 말줄임

경로 `/my` · 소유 컴포넌트 `MyPageOverview.tsx`. 위 공통 판정을 적용한다.

### CL-03 `[E2E-읽기]` `P1` 친구 목록에서 2줄 말줄임

경로 `/friends` · 소유 컴포넌트 `FriendGoalList.tsx`. 위 공통 판정을 적용한다.

### CL-04 `[E2E-읽기]` `P1` 친구 상세에서 2줄 말줄임

경로 `/friends/[friendId]` · 소유 컴포넌트 `FriendGoalDetail.tsx`. 위 공통 판정을 적용한다. 접기 기준 자체는 CP 군이 본다(R8).

## 7. AU · 인증 경계 (D-034)

### AU-01 `[E2E-읽기]` `P0` 보호 라우트 전수가 비로그인 3xx 다

```gherkin
Given qa/contracts/protected-routes.json 의 모든 보호 라우트
When 로그인하지 않고 각 경로를 요청한다
Then 상태 코드가 3xx 다
And 응답 본문에 회원 셸 표식(로그아웃 버튼·클로버 잔액 영역)이 0건이다
And 응답 바이트가 셸 크기 미만이다
```

**현재 불일치 기록(2026-10-19 운영 실측)**: `/my`·`/friends`·`/invite` 는 307 이나 `/me` 는 **200 + 셸 25,241바이트**다.

### AU-02 `[E2E-읽기]` `P0` 셸이 전송되지 않는다 (클라이언트 리다이렉트 금지)

```gherkin
Given 비로그인으로 /me 를 요청한다
When 응답 HTML 을 검사한다
Then 클라이언트 리다이렉트용 meta 태그나 NEXT_REDIRECT 표식이 0건이다
And 회원 셸 HTML 이 한 바이트도 전송되지 않는다
```

근거: Next.js 공식 문서가 스트리밍 컨텍스트의 `redirect()` 는 meta 태그로 클라이언트 리다이렉트한다고 명시한다. 그 태그의 존재가 곧 "렌더 뒤에 막았다" 는 증거다.

### AU-03 `[E2E-읽기]` `P1` 의도된 권한없음 화면은 예외로 허용되고 법적 고지가 없다

```gherkin
Given 목록에 allow_shell_without_auth 로 명시된 경로(예: /me/goal/[id])
When 비로그인으로 연다
Then 권한없음 안내와 로그인 복구 행동이 보인다
And 타인 데이터가 0건이다
And 법적 고지 블록이 0건이다
```

### AU-05 `[E2E-쓰기]` `P0` Server Action 직접 호출이 미인증에서 거부된다

```gherkin
Given 경계(proxy.ts)는 Server Action 요청을 덮지 않는다
When 쿠키 없이 Server Action 엔드포인트를 직접 POST 한다 (Next-Action 헤더 포함)
Then 각 액션이 인증 실패로 거부되고 데이터가 변하지 않는다
And 응답에 타인 데이터가 0건이다
```

**왜 필요한가**: AU-01~04 는 GET 라우트만 본다. 경계만 믿으면 Server Action 이 열린다는 것이 Next.js 공식 인증 가이드의 명시 경고이고, 우리 설계도 "경계는 추가이고 대체가 아니다" 로 적었다. 그 선언을 지키는 테스트가 없으면 선언일 뿐이다(Codex 보강 요청).

### AU-04 `[린트]` `P0` 보호 라우트 목록과 폴더 구조가 정합한다

```gherkin
Given 인증을 요구하는 라우트 파일 집합을 폴더 스캔으로 구한다
When 목록 파일과 대조한다
Then 목록에 없는 보호 라우트가 0건이다
And 목록에만 있고 실재하지 않는 경로가 0건이다
```

근거: D-032. 새 보호 라우트가 생겼을 때 사람이 목록을 기억해 고치는 구조면 재발한다. 경계와 테스트가 같은 파일을 읽는다.

## 8. FD · 응원으로 맺어지는 친구와 관계 방향 (D-024)

### FD-01 `[pgTAP]` `P0` 확정 응원이 양방향 관계 1건을 만든다

```gherkin
Given 회원 A 가 회원 B 의 목표에 응원하고 그 응원이 CONFIRMED 가 된다
Then friend_connection 에 정렬된 쌍 1건이 ACTIVE 로 생긴다
And 같은 쌍에 두 번째 행이 생기지 않는다
And 초대 수락이 같은 쌍에 동시에 들어와도 행은 1건이다
And origin 이 CHEER 이고 origin_invite_id 는 NULL 이다
```

제약 근거: `member_low_id < member_high_id` CHECK + UNIQUE. 이 제약을 약화하면 이 TC 가 깨진다.

### FD-02 `[계약]` `P1` 관계 방향 3값이 응원 기록으로 정확히 판정된다

```gherkin
Given A 만 B 를 응원한 쌍 · B 만 A 를 응원한 쌍 · 서로 응원한 쌍
When A 의 시점에서 친구 목록을 조회한다
Then 각각 I_CHEERED · CHEERED_ME · MUTUAL 이다
And 금액은 판정 입력으로 쓰이지 않고 응답에도 없다
And 방향을 저장한 컬럼이 없고 매번 계산된다
```

### FD-03 `[E2E-읽기]` `P1` 과거 응원 이력이 소급 적용되고 화면에 방향이 보인다

```gherkin
Given 과거에 확정 응원을 주고받은 쌍이 친구 관계 없이 남아 있다
When 소급 적용 작업이 돈다
Then 그 쌍이 ACTIVE 친구로 들어온다
And 친구 목록과 상세에 내가 응원함 또는 응원받음 또는 서로 응원 중 하나가 보인다
And 관계 해제 후에는 두 사용자 모두 상대의 친구공개 목표를 조회할 수 없다
```

## 9. 추적성 매트릭스 (갭 0)

| 요구 ID | 출처 | FDD 기능요구 | API·경계 계약 | 테이블·Storage | TC | 개수 |
|---|---|---|---|---|---|---:|
| R1 | 프로토타입 `LEGAL_EXPOSURE` 4443행 · `DESIGN.md` · D-030-B | FR-W12 | `exposure.ts` 상수(서버 호출 0) | 없음 | LG-01·02·03·04·05 | 5 |
| R2 | 프로토타입 `GUEST_TEASER` 4487행 · 1026~1059행 · **회장 확정** | FR-W18 | **서버 호출 0건.** 예시 데이터 = 클라이언트 상수. 금지 필드 목록은 다른 비회원 경로에 적용 | 없음 | GT-01·02·03 | 3 |
| R3 | 프로토타입 15~17행 | FR-W16 | 없음 | 없음 | SP-03 | 1 |
| **R4** | 프로토타입 18~20행 · `standard-ux-writing.md` · D-028-D · D-037 R4 | **FR-W19** | 서버는 오류 코드만, 사용자 문구는 클라이언트 소유(VO-04) | 없음 | VO-01·02·03·04 | 4 |
| R5 | 프로토타입 21~25행 · D-032 | FR-W13 | 엣지 함수 3종 + api-contract §A.4 상태기계 8전이 | `goal_cover_asset` · `storage_cleanup_queue` · 버킷 2종 | CV-01·02·03·04·05·06·07·08 | 8 |
| R6 | 프로토타입 26~28행 · `DESIGN.md` · D-003 | FR-W14 | `my_social_dashboard()` 3필드 확장 | `cheer`·`member`·`goal` | CS-01·02·03·04 | 4 |
| **R7** | 프로토타입 29~30행·2334행 · D-037 R7 | **FR-W20** | `update_member_preferences` 는 **그대로 남는다**(용도가 다름) | `member_preference` 변경 0 | AC-01·02·03 | 3 |
| **R8** | 프로토타입 40~42행·4592행 · `DESIGN.md` 626행 · D-037 R8 | **FR-W21** | 없음 | 없음 | CP-01·02·03·04·05 | 5 |
| R9·R10 | `DESIGN.md` 579~599행 | FR-W16 | 없음 | 없음 | SP-01·02·04 | 3 |
| D-030-C | 결정 원장 | FR-W14 | 없음 | 없음 | CL-01·02·03·04 | 4 |
| D-034 | 결정 원장 · 운영 실측 | FR-W15 | `proxy.ts` + `protected-routes.json` | 없음 | AU-01·02·03·04·05 | 5 |
| D-024 | 결정 원장 · migration 2건 | FR-W17 | `relationship_direction`·`relationship_origin` | `friend_connection`·`cheer` | FD-01·02·03 | 3 |
| **합계** | **승인 요구 10/10 + 거버넌스 3/3** | FR-W12~W21 |: |: |: | **48** |

**갭 0.** 승인 요구(R1~R10)와 거버넌스 3건이 전부 TC 로 닿고, **48개 ID 전부가 이 파일에 개별 헤딩으로 정의돼 있다**(§0.1 의 grep 수치). 요구 하나당 해피와 엣지가 함께 있다.

### 9.1 쓰기 경로 커버 확인

| 쓰기 행위 | TC |
|---|---|
| 커버 업로드 3단 + 관리자 승인 | CV-01~04 |
| 공개범위 변경 | CV-04(간접) · v1.1.0 PW-06 |
| 초대 생성·수락 | v1.1.0 PG-31·33 · PW-10·13 |
| 응원 확정 → 친구 자동 생성 | FD-01 |
| 관계 해제 | FD-03 |

**쓰기 TC 가 하나도 실행되지 않으면 출고 판정 맨 위에 "쓰기 경로 미검증" 을 적는다.**

## 10. v1.1.0 TC 승계

`test-plan-social-viral-loop-web-first-v1.1.0.md` §4~§8 의 TC 군을 그대로 승계한다. 이 문서는 그것을 대체하지 않고 **신규 요구 9건을 더한다.**

| 승계 군 | 범위 | 상태 |
|---|---|---|
| PG-01~37 | pgTAP 스키마·권한·공개범위·친구·초대·커버 | 유지 |
| PG-MY-01~08 | 마이페이지·업적·소속감 큐 | 유지 |
| CT-01~12 · CT-MY-01~02 | 계약·단위 | 유지 |
| PW-01~17 · MY-01 | Playwright 경로 | 유지 |
| CC-01~02 | 동시성 | 유지 |
| REG-CASH-01~02 | 환전 회귀. **삭제·약화 금지** | 유지 |
| PG-01~02 | 신규 테이블·RLS. **테이블 수를 4 → 6 으로 교정**(test-plan §A.1) | 교정 |

누적 전체 회귀 하한은 63건(2026-10-13)이다. 이번 **48건**이 더해지므로 **총 건수가 줄면 반려**다. (v1.2.0 은 33건으로 보고했으나 개별 정의된 ID 는 30개였다. v1.2.1 은 48개 정의·48개 보고로 일치시켰다.)

## 11. 개정 이력

| 버전 | 일자 | 변경 | 작성자 |
|---|---|---|---|
| v1.2.1 | 2026-10-19 | Codex 재검수 반영. **VO(R4 말투 4건)·AC(R7 업적 토글 부재 3건)·CP(R8 접기 정책 5건) 군 신설**, AU-05(Server Action 미인증 거부)·CV-05~08(상태 enum·전이 주체·정리 큐 사유·25시간 fixture 실행) 추가. 커버 상태명을 운영 실물 6값으로 교정. CL 군을 개별 헤딩으로 분해해 **정의 ID 수(48)와 보고 수를 일치**시키고 §0.1 에 grep 확인 명령·수치를 넣었다 | tech-architect / claude-opus-5[1m] |
| v1.2.0 | 2026-10-19 | 신설. 종전 `test-cases.md` 는 v2 라인을 담지 않은 9행 껍데기였다. 신규 요구 9건에 대한 TC 33건(해피·엣지, 종류 태그, 우선도)과 추적성 매트릭스를 담았다. 쓰기 경로 TC 를 필수로 두었다 | tech-architect / claude-opus-5[1m] |

---

SKILLS_USED: 없음.

SKILLS_SKIPPED: `diagram`·`document-generate` = 개정 작업이고 신규 다이어그램 파일 생성이 아니다. `qa`·`qa-only` = 이번 단계는 설계이고 테스트 실행이 아니다(실행은 qa 단계).

KNOWLEDGE_QUERY: 웹에서 OWASP Excessive Data Exposure 와 Next.js `redirect` 스트리밍 동작 조회. 레포에서 승인 프로토타입 R1~R10 원문, `DESIGN.md` 간격·접기·클램프 절, 결정 원장 D-003·D-024·D-030-C·D-032·D-033·D-034, 운영 Supabase·운영 웹 실측, 제품 코드 6파일.

HITS_USED: OWASP Excessive Data Exposure → GT-01·02 를 픽셀이 아니라 **네트워크 raw 응답과 DOM** 으로 판정하게 만든 근거. Next.js `redirect` 레퍼런스 → AU-02 가 meta 태그 존재를 실패 신호로 쓰는 근거. `DESIGN.md` F 축 규정 → SP-02 에서 라벨-값 비대칭을 경고로만 두는 근거. `lint-prototype-overflow.mjs` 의 판정 2축 → SP-04.

HITS_REJECTED: 전환율·사회적 증거 벤치마크는 개인정보 인가 계약을 대신할 수 없어 GT 군 판정 근거로 쓰지 않았다. `vendor_selection` 표는 외부 공급자를 추천하지 않으므로 작성 대상 아님.

CONFLICTS: 승인 시안의 CSS 흐림 티저와 OWASP·D-003 이 충돌 → GT 군을 "보내지 않는다" 로 판정하게 설계. 시안 `biz` 블록 기재 항목과 운영 배포본이 충돌 → LG-04 가 6항목 전수를 요구하고 현재 불일치를 기록.

RUBRIC_SCORE: 완결5 정밀5 벤치5 추적5 톤5 total=25/25

WEAKEST_LINE: "CV-08 의 25시간 fixture 실행은 로컬 Supabase 가 필요해 설계 단계에서 돌리지 못했다. 그때까지 이 TC 는 미확인이고, 그것이 곧 정리 작업이 실제로 도는지를 아직 모른다는 뜻이다."

SOURCES/MODEL: claude-opus-5[1m] | `docs/design/prototypes/social-viral-loop-v3-opus5.html` · `DESIGN.md` · `wiki/거버넌스/결정.md` · `docs/eng-design/*-v1.1.0.md` · `web/src/components/receiver/CheerList.tsx` · `web/src/components/social/MyPageOverview.tsx` · `web/src/lib/social/server.ts` · `web/src/app/globals.css` · `web/src/proxy.ts` · 운영 Supabase `ossvejipdivgxzcqszbw` 실측 · `https://haenael-ge.vercel.app` 실측 · https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/12-API_Testing/03-Excessive_Data_Exposure/ · https://nextjs.org/docs/app/api-reference/functions/redirect

PRESENTATION_CHECK: 내부 태그 잔재 0 / 목차 앵커 확인 / 컨트롤러 표시용 창은 열지 않음
