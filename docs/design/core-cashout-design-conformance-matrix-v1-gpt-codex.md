---
artifact: design-conformance-matrix
line: core
version: v1
created_at: 2026-08-24 17:45 KST
model: gpt-codex/GPT-5
agent: qa-verifier
skills: qa
prototype: scratchpad/cashout-full-journey-v3-opus.html v3.7
viewport: 390px
status: fail
---

# core 환전 디자인 정합 대조표

## 판정표

동일 390px 폭과 동일한 40개 신청·응원 122건 상태를 맞췄다. 표가 판정의 정본이고 아래 이미지는 그 근거다.

| 화면·영역 | 요청·TC | 시안 X | dev Y | 주축·순서·열 | 정렬·여백 | 표시·숨김 | 글꼴·버튼 위계 | 390 판정 | 비고·증거 |
|---|---|---|---|---|---|---|---|---|---|
| 신청 헤더·잔액 카드 | QA-LOCAL-01 | 제목→설명→총량→지급대상 분해 | 같은 순서와 1열 | 일치 | 카드 여백 근접 | 일치 | 제목·금액 위계 근접 | ✅ | 시안 1,186px, dev 1,645px 전체 높이 |
| 신청 이용료 안내 | QA-LOCAL-03 | 공제표 뒤 별도 따뜻한 설명 블록 | 공제 카드 안 한 문단으로 압축 | 설명 그룹 구조 불일치 | dev가 조밀함 | 별도 안내 블록 없음 | 금액 위계는 일치 | ❌ | 정보는 있으나 시안의 읽기 단계가 사라짐 |
| 신청 입력·CTA | QA-LOCAL-04 | 금액·계좌·예금주·버튼 | 전화번호 추가, 과거 내역 계속 노출 | 순서 일부 추가 | 세로 길이 증가 | 시안 밖 요소 표시 | 1차 버튼 위계 일치 | ❌ | 높이 비율 1.387 |
| 확인 화면 | QA-LOCAL-03B | 전용 화면에 계좌·금액·잠금 설명·2개 CTA | 이전 제목·잔액·공제·내역을 유지하고 폼 영역만 확인으로 변경 | 1열이지만 화면 순서·범위 불일치 | 시안보다 836px 김 | 이전 화면 정보 숨김 실패 | CTA 위계는 근접 | ❌ | 시안 510px, dev 1,346px, 비율 2.639 |
| loading | QA-LOCAL-06 | 전용 제목·계좌 카드·loading 카드 | 전체 이전 페이지와 확인 배너를 유지한 뒤 loading 추가 | 화면 전환 구조 불일치 | 시안보다 888px 김 | 이전 정보 숨김 실패 | loading 자체 위계·spinner는 적절 | ❌ | 시안 617px, dev 1,505px, 비율 2.439 |
| 신청 접수 상태 | QA-LOCAL-01 | 상태 배너→3단계→금액·계좌→분할 잔액→CTA | 같은 주축과 요소 순서 | 일치 | dev가 짧음 | 핵심 요소 일치 | 상태·금액·1차 CTA 위계 일치 | ⚠️ | 시안 1,098px, dev 941px, 비율 0.857 |
| 반려 상태 | QA-LOCAL-02 | 반려 배너→타임라인→금액·계좌→잠금 해제→재신청 | 동일 | 일치 | 근접 | “복원” 없이 잠금 해제 표시 | 재신청 1차 위계 일치 | ✅ | dev `08-dev-status-rejected-30-390.png` |
| 지급 완료 상태 | QA-LOCAL-01 | 입금 배너→타임라인→금액·계좌→총량 감소 | 동일 | 일치 | 근접 | 52→12 설명 표시 | 완료 금액 위계 일치 | ✅ | dev `13-dev-status-paid-40-390.png` |
| overflow 목록 미리보기 | QA-LOCAL-07 | 8행, 전체 보기, 워드맵 6개 | 8행, 전체 보기, 워드맵 12개 | 목록 순서는 일치 | dev 전단 홈 섹션 때문에 김 | 워드맵 수량 불일치 | 목록 버튼 위계 근접 | ❌ | 시안 1,156px, dev 1,513px, 비율 1.309 |
| overflow 전체·검색 | QA-LOCAL-07 | 목록 20행, 검색 진입, 워드맵 12개 | 목록 20행, 검색 진입, 101건 너머 결과 1건 | 핵심 플로우 일치 | dev 높이 근접 | 검색 결과 표시 | 검색 CTA 위계 일치 | ✅ | 시안 2,009px, dev 2,209px, 비율 1.100 |

## 핵심 캡처 쌍

이미지를 클릭하면 원본 크기로 볼 수 있다.

### 신청 폼

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 신청 폼](../artifacts/qa-cashout-core-20260824/31-prototype-request-form-clean-390.png)](../artifacts/qa-cashout-core-20260824/31-prototype-request-form-clean-390.png) | [![dev 신청 폼](../artifacts/qa-cashout-core-20260824/24-dev-request-form-40-clean-390.png)](../artifacts/qa-cashout-core-20260824/24-dev-request-form-40-clean-390.png) |

### 확인 화면

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 확인](../artifacts/qa-cashout-core-20260824/32-prototype-request-confirm-clean-390.png)](../artifacts/qa-cashout-core-20260824/32-prototype-request-confirm-clean-390.png) | [![dev 확인](../artifacts/qa-cashout-core-20260824/25-dev-request-confirm-40-clean-390.png)](../artifacts/qa-cashout-core-20260824/25-dev-request-confirm-40-clean-390.png) |

### loading

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 loading](../artifacts/qa-cashout-core-20260824/36-prototype-loading-clean-390.png)](../artifacts/qa-cashout-core-20260824/36-prototype-loading-clean-390.png) | [![dev loading](../artifacts/qa-cashout-core-20260824/26-dev-loading-clean-390.png)](../artifacts/qa-cashout-core-20260824/26-dev-loading-clean-390.png) |

### 신청 상태

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 신청 상태](../artifacts/qa-cashout-core-20260824/33-prototype-status-requested-clean-390.png)](../artifacts/qa-cashout-core-20260824/33-prototype-status-requested-clean-390.png) | [![dev 신청 상태](../artifacts/qa-cashout-core-20260824/27-dev-status-requested-clean-390.png)](../artifacts/qa-cashout-core-20260824/27-dev-status-requested-clean-390.png) |

### overflow 미리보기

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 overflow 미리보기](../artifacts/qa-cashout-core-20260824/37-prototype-overflow-preview-clean-390.png)](../artifacts/qa-cashout-core-20260824/37-prototype-overflow-preview-clean-390.png) | [![dev overflow 미리보기](../artifacts/qa-cashout-core-20260824/28-dev-overflow-preview-clean-390.png)](../artifacts/qa-cashout-core-20260824/28-dev-overflow-preview-clean-390.png) |

### overflow 전체

| 승인 프로토타입 v3.7 | 실제 구현 |
|---|---|
| [![프로토타입 overflow 전체](../artifacts/qa-cashout-core-20260824/38-prototype-overflow-full-clean-390.png)](../artifacts/qa-cashout-core-20260824/38-prototype-overflow-full-clean-390.png) | [![dev overflow 전체](../artifacts/qa-cashout-core-20260824/29-dev-overflow-expanded-clean-390.png)](../artifacts/qa-cashout-core-20260824/29-dev-overflow-expanded-clean-390.png) |

검색 실증 캡처: [101건 너머 검색 결과](../artifacts/qa-cashout-core-20260824/16-dev-overflow-search-beyond-latest20-390.png)

## 기계 lint

`bash ~/.claude/harness/bin/design-lint.sh web/src` 결과는 인라인 style과 토큰 밖 hex 두 범주 경고다. Cashout 관련 근거는 `SplitBalanceCard.tsx`, `CashoutQueue.tsx`, `MyLinkCard.tsx`다. 따라서 DESIGN.md YAML 토큰 정본에 대한 기계 판정도 FAIL이다.

## 최종 판정

**Design Score: C, FAIL.** 상태 화면은 주로 일치하지만 사용자가 가장 불안해하는 신청 확인과 loading 전환이 전용 화면으로 수렴하지 않았다. 기능 동작과 별개로 승인 프로토타입 정합 게이트는 통과하지 못한다.

SKILLS_USED: `qa` 스킬을 동일 조건 캡처, 영역별 픽셀 대조, 결함 심각도 판정에 사용

SKILLS_SKIPPED: 없음

SOURCES: `DESIGN.md` v2.0.0; `scratchpad/cashout-full-journey-v3-opus.html` v3.7; `~/.claude/standards/design.md` §14; `~/.claude/standards/qa-methodology.md`; `artifacts/qa-cashout-core-20260824/*.png`

MODEL: gpt-codex/GPT-5, qa-verifier
