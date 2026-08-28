---
title: 포스트모템 — 카카오 로그인 invalid_state (2026-07-19)
type: log
owner: "@sj"
policy: protected
updated: '2026-08-28'
author: Codex
change: A안 구조로 이동하고 상대 링크를 갱신. 기존 본문 보존
source:
- wiki/learnings/kakao-invalid-state-postmortem.md
visibility: private
---

# 포스트모템 — 카카오 로그인 invalid_state (2026-07-19)

> **역사적 스냅샷**: 이 문서는 2026-07-19 사고 원인과 당시 미해결 항목을 보존한다. 현재 배포·환전·로그인 상태는 [제품 현재 상태](../2-product/current-state.md)를 따른다. 특히 문서 하단의 결제·환전 판정은 현재 정본이 아니다.

## 무슨 일이 있었나 (증상)
회장이 prod에서 카카오 로그인 시 `auth_error=invalid_state`로 로그인 실패. 추가로 "로그인 안 했는데 링크 생성", "결제 안 뜸"을 함께 겪음. 그런데 담당(Claude)은 "카카오 로그인 작동"이라 보고했음 → 신뢰 붕괴.

## 근본원인 (Vercel 서버로그로 확정)
- **도메인 불일치**: `/auth/kakao/start`가 `web-two-theta-bmil2ljwdg.vercel.app`(Vercel 자동 도메인)에서 실행돼 nonce 쿠키를 그 호스트에 세팅했는데, 콜백은 `NEXT_PUBLIC_APP_URL` 고정값(haenaelge.vercel.app)으로 감 → 콜백 도메인엔 쿠키가 없어 nonce 대조 100% 실패 → invalid_state.
- 구조적 원인: 프로젝트에 여러 도메인(자동 도메인 + alias 여러 개)이 살아있는데 canonical 강제가 없었음. 사용자가 어느 도메인으로 들어오느냐에 따라 로그인이 깨짐.

## 왜 못 잡았나
1. **검증 방식 결함(가장 큰 잘못)**: 담당이 "기존 세션이 남은 /home 화면"을 보고 "로그인 작동"이라 판정. **로그아웃 상태에서 신규 로그인 왕복을 한 번도 안 해봄.** 산출물/화면 존재를 동작으로 등치(§3 대리지표 위반).
2. **QA E2E 갭**: E2E가 "저장→로그인시트 노출"까지만 검증하고, `start→kakao→callback`의 nonce 왕복·쿠키 도메인·SameSite를 **전혀 안 돌림**. invalid_state를 유발하는 모든 조건이 테스트 사각지대.
3. **다도메인 리스크 미인지**: Vercel 자동 도메인이 살아있는 채로 canonical 강제가 없다는 걸 설계에서 놓침.

## 조치 (개선)
1. **canonical 도메인 통일**: `web/src/proxy.ts`(Next 16.2.10 규약) — 레거시 vercel.app 호스트를 `haenael-ge.vercel.app`으로 308. start/callback이 항상 같은 도메인 → 쿠키 일치. curl로 308 작동 + 회장 시나리오(web-two-theta 시작) 재현해 로그인 성공 확인.
2. `NEXT_PUBLIC_APP_URL` → `https://haenael-ge.vercel.app` 통일.
3. 원래 도메인 `haenael-ge.vercel.app` 회수(code0to1 프로젝트 삭제 후).
4. proxy 회귀 테스트 8케이스 추가.

## 재발방지 (하네스 반영)
- **로그인 등 외부연동 "완료" 선언 전, 로그아웃 상태에서 신규 왕복을 prod에서 직접 관찰**한다. 기존 세션 화면은 증거 아님.
- **QA E2E에 실제 OAuth 왕복(start Set-Cookie·state·callback nonce 매칭/불일치) 케이스를 추가**한다. (미완 — 다음 작업)
- 다도메인 프로젝트는 canonical 강제를 기본 체크리스트에 포함.

## 아직 남은 것
- QA E2E에 OAuth 왕복 케이스 추가(위 재발방지 2).
- 모바일 카카오톡 인앱브라우저 쿠키 유실(후보 B) — canonical로 상당 완화되나, nonce 저장을 쿠키→서버측으로 옮기는 강화는 별도 검토.
- 로그아웃 직후 첫 요청 503(콜드스타트 1회성) 안정화.
- 결제: kill switch off + legal 4건·토스 지급대행 선결(의도적 비활성, 별개 트랙).
