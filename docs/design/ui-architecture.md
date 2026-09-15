# 해낼게 UI architecture

status: baseline-incomplete
updated: 2026-09-12

## 현재 기준

현행 디자인 설명의 주 문서는 레포 루트 `DESIGN.md`이며, 구현 코드는 `web/` 아래에 있다. 이 문서는 다음 담당자가 공통 셸과 화면군을 찾는 정본 진입점이다. 기존 루트 문서를 복제하지 않고 경로만 연결한다.

## 화면군

| 화면군 | 기준 자료 | 현재 검증 |
|---|---|---|
| 공개 목표 페이지 | `DESIGN.md`, `docs/design/WIREFRAMES/goal-page.html` | 미검증 |
| 응원 수신자 홈·관리 | `DESIGN.md`, `docs/design/WIREFRAMES/receiver-home.html` | 미검증 |
| 출금 요청·확인·상태 | `DESIGN.md`, `docs/design/WIREFRAMES/cashout.html` | 실제 PNG는 `artifacts/`에 있으나 canonical manifest 미조인 |
| 인증·약관 | `web/` 라우트와 `DESIGN.md` | 미검증 |

## 보존 계약

새 화면은 `DESIGN.md`의 브랜드·토큰·프라이버시 규칙을 상속한다. 화면 ID·역할·상태·캡처 연결은 `screen-inventory.md`에서만 관리한다. 현재 문서의 미검증은 화면 부재가 아니라 관찰하지 못했다는 뜻이다.
