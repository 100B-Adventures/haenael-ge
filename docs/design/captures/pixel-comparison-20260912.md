# 해낼게 환전 신청 화면 픽셀 대조

date: 2026-09-12
status: FAIL
viewport: 390px 기준

## 대조 대상

- 시안: [core-cashout-30-27-form-390-v1-gpt-codex.png](../clean-frames/core-cashout-30-27-form-390-v1-gpt-codex.png)
- 개발 화면: [cashout-form-390x844.png](baseline-20260912/cashout-form-390x844.png)

## 직접 관찰 결과

- 시안은 27클로버, 고정된 카카오뱅크 값, 계좌번호·예금주 입력을 표시한다.
- 개발 화면은 40클로버, 은행 선택 상자, 전화번호 입력, 개인정보 안내 문구를 표시한다.
- 금액·수수료·원천징수·입금액과 입력 필드 구성이 서로 다르다.

판정: 디자인과 개발 화면이 일치하지 않는다. 이 대조는 디자인 QA 통과 증거가 아니라 FAIL 증거다. 구현 또는 최신 시안의 정본을 확정한 뒤 같은 viewport로 재대조해야 한다.
