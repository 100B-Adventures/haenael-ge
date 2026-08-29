# Core Cashout 30/27 Design Spec v1.0.0

> STAMP: line=core · 생성=2026-08-29 04:34 KST · model=gpt-codex · agent=product-designer · skills=pipeline · 기반=`docs/prd-haenael-ge-v0.4.0.md` v0.4.0 + `DESIGN.md` v2.0.1 + 운영 1.2.0 `CashoutPageView`/`CashoutRequestForm` + `docs/prototype/core-cashout-30-27-v1-gpt-codex.html` · 고민=30개를 신청 하한으로 오독하지 않도록 자격, 지급가능, 신청량을 수치와 위계 모두에서 분리했다.

## 계약 요약

- 환전 자격: 웰컴을 포함한 총보유 클로버 30개 이상.
- 신청량: 1개 이상, 지급가능 클로버 이하. 웰컴과 잠김은 지급가능에서 제외한다.
- 기준 경계: 총보유 30, 웰컴 3, 지급가능 27, 신청 27.
- 27개 신청 계산: 환산 27,000원, 이용료 2,700원, 이용료 부가세 270원, 원천징수 792원, 실입금 23,238원.
- 사용 금지 카피: “최소 신청 30개”, “친구 응원분 30개부터”.

## 수치 규격표

| 화면 | 항목 | 규격(수치) | 프로토타입 근거(줄번호) | 비고 |
|---|---|---:|---|---|
| 공통 | 모바일 프레임 | 390 × 최소 844px | HTML 39 | clean frame도 동일 폭 |
| 공통 | 데스크톱 프레임 | 1024 × 최소 768px | HTML 40 | clean frame도 동일 폭 |
| 공통 | 페이지 안쪽 여백 | 상하 40px, 좌우 22px | HTML 39 | 운영 1.2.0 `--space-page-y`, `--space-mobile-gutter` 계승. 22px은 기존 셸 호환 예외이며 신규 간격 토큰이 아님 |
| 신청 | 모바일 단 배치 | 1열, 카드 너비 가용영역 100% | HTML 50 | 주축은 column |
| 신청 | 데스크톱 단 배치 | 2열, 좌우 `1.08fr : .92fr` | HTML 51 | 주축은 row 성격의 grid, 각 열 `minmax(0, …)` |
| 신청 | 데스크톱 폼 고정 | 상단 24px sticky | HTML 52 | 긴 왼쪽 설명을 읽어도 신청 폼 유지 |
| 신청 | 단 간격 | 24px | HTML 50 | 운영 `gap-6` 계승 |
| 공통 | 카드 사이 간격 | 16px | HTML 53 | `.stack` 공통 |
| 공통 | 카드 안쪽 여백 | 모바일 16px, 데스크톱 24px | HTML 54-55 | 카드 폭은 각 격자 칸 100% |
| 신청 | 폼 필드 간격 | 16px | HTML 68 | 금액, 은행, 계좌, 예금주, 미리보기, CTA |
| 신청 | 라벨과 입력 간격 | 8px | HTML 69 | 필드 내부 세로 간격 |
| 신청 | 금액 입력 2칸 | 입력 `minmax(0,1fr)` + 단위 auto, 간격 8px | HTML 72 | 숫자가 커져도 입력이 단위를 밀어내지 않음 |
| 공통 | 행 높이 예산 | 세로 padding 8px, 행 gap 16px | HTML 59 | 고정 높이 금지, 긴 한국어는 자연 증가 |
| 신청 | 입력 최소 높이 | 44px | HTML 71 | 터치 목표 하한 |
| 공통 | 주 CTA 최소 높이 | 52px | HTML 76 | 한 화면의 주 행동 1개 |
| 공통 | 보조 CTA 최소 높이 | 44px | HTML 77 | 확인 화면의 “계좌 다시 입력” |
| 공통 | 모서리 체계 | 입력 12px, 카드·버튼 14px | HTML 21-22, 54, 71, 76 | 신규 radius 없음 |
| 검수 셸 | 외곽 모서리·그림자 | 모바일 26px, 데스크톱 14px, `0 18px 60px / 35%` | HTML 39-40 | 제품 카드에는 그림자 없음 |
| clean export | 장식 제거 | radius 0, shadow none, console display none | HTML 89-92 | QA 1:1 비교용 |
| 공통 | 워드마크 | 12.5px, 800, tracking -0.2px | HTML 44 | 운영 `ReceiverBrandMark` 계승 |
| 공통 | 페이지 제목 | 모바일 22px, 데스크톱 30px, line-height 1.32, 900 | HTML 46-47 | 긴 제목 `overflow-wrap:anywhere` |
| 공통 | 금액 행 | 13px, 숫자 tabular, 값 최대 58% | HTML 59, 62 | 긴 금액 대량 상태 방어 |
| 신청·확인 | 실입금 강조 | 19px | HTML 64-65 | 가장 중요한 금액만 한 단계 크게 |
| 신청 | 기준 helper | 11px, line-height 1.5 | HTML 74 | “총보유 30”과 “지급가능 N”을 한 문장에 병렬 표기 |
| 공통 | 주 CTA 글자 | 15px, 800 | HTML 76 | 운영 `CashoutRequestForm` 계승 |
| 공통 | 데이터 0건 | total 0, welcome 0, payable 0 | HTML 196-200 | CTA disabled, 남은 30개 안내는 HTML 223-229 |
| 공통 | 데이터 소량·경계 | total 30, welcome 3, payable 27 | HTML 196-200 | 신청 가능, 기본 신청량 27 |
| 공통 | 데이터 대량 | total 999,999, welcome 3, payable 999,996 | HTML 196-200 | 숫자 줄바꿈·최대 폭은 HTML 61-62 |
| 신청 | 수수료 계산 | 이용료 10% + 이용료 부가세 10%, 이후 금액에 원천징수 3.3% | HTML 201-207 | 27개 실입금 23,238원 |
| 확인 | 잠금 설명 | 총량 30 유지, 신청 27 잠금, 입금 완료 때 27 차감 | HTML 158-160 | 반려 시 “복원”이 아니라 “잠금 해제” |
| 플로우 | 화면 수와 순서 | 신청 → 확인 → 제출 중 → 접수, 4화면 | HTML 103-106, 118-185 | 이전·다음 행동이 있어 dead-end 0 |

7개 필수 cover 확인: 간격 6행, 높이 예산·접힘선 5행, 격자 칸수·타일 크기 4행, 단 배치 비율 2행, 모서리·그림자 3행, 타이포 스케일 5행, 데이터 0건·소량·대량 3행. 총 규격 31행이다.

## 벤치마크 적용

- Stripe Connect는 잔액을 pending과 available로 분리한다. 이를 그대로 금융 용어로 복사하지 않고, 해낼게에서는 “모인 클로버”와 “지금 지급 가능”으로 바꿨다. 자격과 실제 사용 가능액을 한 숫자로 합치지 않는 정보 구조만 차용했다.
- Apple HIG의 진행 표시 원칙을 따라 제출 중 화면에서 사용자가 기다리는 이유와 중복 제출 방지를 함께 설명한다. 로딩 장식만 보이고 현재 작업을 숨기는 패턴은 쓰지 않는다.
- Material Design의 터치 목표와 오류 방지 원칙을 따라 입력·보조 행동은 44px 이상, 주 CTA는 52px으로 고정했다.

## 레드팀과 셀프심문

**까다로운 고객 공격:** “30개부터라면서 왜 27개를 신청할 수 있나?” 이 화면이 틀리면 30을 신청 하한처럼 읽게 만드는 카피가 남아 있을 가능성이 가장 크다. 그래서 제목보다 가까운 금액 입력 바로 아래에 “환전 기준: 모인 클로버 30개 이상 · 지금 지급 가능 27개”를 붙이고, 분해 카드에서 30, 3, 27을 동시에 보여준다.

**회의적 개발자 공격:** “390 시안만 맞고 긴 숫자에서 터질 수 있다.” 값 열에 최대 58%, `overflow-wrap:anywhere`, `minmax(0, …)`를 적용했고 999,999/999,996 대량 상태를 같은 허브에서 직접 토글하도록 수정했다.

**셀프심문. 이 결론이 틀렸다면 가장 그럴듯한 이유는?** 가장 load-bearing한 가정은 현재 운영 계약이 “총보유 30 이상”과 “신청량 1 이상”을 별도로 판정한다는 점이다. `20260825020000_cashout_total_threshold_contract.sql`과 현재 `CashoutRequestForm`의 min=1, max=payable을 다시 대조해 이 가정을 유지했다. 운영 DB에 실제 30/27 회원이 없으면 실사용 관찰은 여전히 불가능하므로, 이 산출물은 계약·렌더 정합 증거이지 운영 실계정 성공 증거라고 주장하지 않는다.

**Design Score: B+.** 기존 1.2.0 토큰·셸·컴포넌트를 계승했고, 7개 수치 cover, 4화면 연결, 0건·경계·대량, 390·1024를 모두 렌더했다. 감점은 모바일 신청 화면이 844px 접힘선 아래로 세로 스크롤되는 점이다. 이는 계좌 3필드와 돈 차감 설명을 숨기지 않기 위한 의도이며 수평 넘침이나 행동 손실은 없다.

SKILLS_USED: pipeline, design 단계 필수 산출물·수치 규격·clean frame 계약 적용

SKILLS_SKIPPED: design-consultation·design-shotgun·design-html·design-review는 현재 Codex 세션에 제공되지 않았다. 기존 승인 UI를 계승한 계약 보정이라 제공된 도구와 디자인 품질헌법으로 수동 대조했다.

SOURCES/MODEL: gpt-codex · https://docs.stripe.com/connect/account-balances · https://developer.apple.com/design/human-interface-guidelines/progress-indicators · https://m3.material.io/foundations/interaction/states/overview · `docs/prd-haenael-ge-v0.4.0.md` v0.4.0 · `DESIGN.md` v2.0.1 · `web/src/components/cashout/CashoutPageView.tsx` · `web/src/components/cashout/CashoutRequestForm.tsx` · `supabase/migrations/20260825020000_cashout_total_threshold_contract.sql`
