---
title: 해낼게 제품 현재 상태
type: reference
owner: "@sj"
policy: living
updated: 2026-08-28
author: Codex
change: "코드·승인 산출물·운영 DB 및 URL 직접 관찰로 최신화"
source: [../../pipeline-state.core.md, ../../session-state.core.md, ../../docs/제품현황.md, ../../RELEASE.md, ../../web/src, ../../supabase/migrations/20260825020000_cashout_total_threshold_contract.sql]
links: ["[[_index]]", "[[../3-operations/운영-미결-원장]]", "[[../3-operations/kakao-alimtalk-runbook]]"]
visibility: private
---

# 해낼게 제품 현재 상태

> 기준시각: 2026-08-28 22:43 KST. 코드·로컬 산출물과 운영 읽기 전용 실측을 함께 대조했다.

## 한 줄 결론

제품 구현과 상류 다섯 단계 승인은 끝났지만 배포 단계는 진행 중이다. 최신 main 배포 1.2.0과 운영 대표 주소 1.0.0이 갈려 있고, 총 30개 계정의 27개 환전 허용 마이그레이션이 운영 DB에 아직 없다.

## 제품 정의

해낼게는 목표 주인이 목표를 선언하고, 친구가 클로버로 조용히 응원하며, 목표 주인이 모인 클로버를 환전하는 양면 서비스다. One Thing은 “친구가 선언한 목표에, 달성을 걸고 조용히 돈으로 응원한다”다.

## 코드에 있는 주요 사용자 경로

| 경로 | 현재 역할 | 근거 |
|---|---|---|
| `/` | 공개 랜딩과 세션 라우팅 | `web/src/app/page.tsx` |
| `/g/[slug]` | 목표 공개 페이지와 응원 결제 진입 | `web/src/app/g/[slug]/page.tsx` |
| `/onboarding` | 목표 생성 | `web/src/app/(receiver)/onboarding/page.tsx` |
| `/me` | 목표 주인의 목표·응원·잔액·워드맵 허브 | `web/src/app/(receiver)/me/page.tsx` |
| `/wordmap/[goalId]` | 목표별 응원 메시지 워드맵 | `web/src/app/(receiver)/wordmap/[goalId]/page.tsx` |
| `/cashout` | 수동 환전 신청 | `web/src/app/(receiver)/cashout/page.tsx` |
| `/cashout/status` | 신청 진행·지급·반려 상태 | `web/src/app/(receiver)/cashout/status/page.tsx` |
| `/cashout/history` | 환전 이력 | `web/src/app/(receiver)/cashout/history/page.tsx` |
| `/admin` | 운영자 환전 큐와 지급·반려 처리 | `web/src/app/admin/page.tsx` |

카카오 로그인이 현재 공개 로그인 경로다. 구글·애플 OAuth 코드는 보존되어 있지만 `SHOW_SOCIAL_LOGIN=false`라 앱 출시 전까지 화면에서 숨긴다. 결제와 환전은 각각 환경변수 기능 스위치로 보호한다.

## 환전 계약

- 이용료 10%, 이용료 부가세 10%, 이용료 차감 후 금액 기준 원천징수 3.3%를 순서대로 계산한다.
- 기준값은 30,000원 신청 시 이용료·부가세 3,300원, 원천징수 881원, 실수령 25,819원이다.
- 신청 시 총 클로버는 유지하고 신청분만 잠근다. 지급 완료 시 총량에서 차감하고, 반려 시 잠금만 해제한다.
- 워드맵 미리보기는 6개다.

## 단계와 검증

| 단계 | 상태 | 근거 |
|---|---|---|
| 기획 | 승인 | PRD v0.4.0, 리스크·페르소나·One Thing 승인 핀 |
| 디자인 | 승인 | DESIGN.md v2.0.0, user-flow v0.3.0, 환전 프로토타입 v3.7 |
| 기술설계 | 승인 | 환전 잠금 FDD v1.0.0, API·아키텍처·테스트 계획 |
| 개발 | 승인 | 환전 구현, 마이그레이션, 빌드 로그 |
| QA | 승인 | 환전 QA·정합 대조·계약 검사 |
| 배포 | 진행 중 | 운영 DB와 대표 주소 정합이 남음 |

마지막 로컬 회귀 기록은 Next production build 성공, Vitest 269/269, Playwright 환전 12/12, QA 계약 고의 파손 8/8 검출, 공개 운영 경로 3/3이다. GitHub Actions 세 작업은 계정 결제 문제로 시작되지 않아 CI 성공 증거는 없다.

## 운영에서 직접 관찰한 상태

| 대상 | 관찰값 | 판정 |
|---|---|---|
| `https://haenael-ge.vercel.app/api/health` | HTTP 200, version 1.0.0, database ok | 운영 대표 주소가 최신 배포를 가리키지 않음 |
| `https://haenael-ge-git-main-100-b.vercel.app/api/health` | HTTP 200, version 1.2.0, database ok | 최신 main 배포는 살아 있음 |
| `https://haenaelge.vercel.app/api/health` | 대표 주소로 이동 후 HTTP 200, version 1.0.0 | 레거시 주소도 최신으로 승격되지 않음 |
| Supabase migration list | 42개 중 `20260825020000`의 remote만 비어 있음 | 총 30개·지급 가능 27개 버그 수정이 운영 미적용 |

`20260825020000_cashout_total_threshold_contract.sql`은 신청 금액 최소값을 1개로 완화한 뒤 총 보유량이 30개 이상인지, 신청량이 지급 가능량 안인지 따로 판정한다. 운영에 있는 직전 함수는 신청 금액 자체가 30개 미만이면 거부한다. 따라서 총 30개 중 시스템 클로버 3개를 제외하고 27개를 신청하는 사용자는 운영 대표 경로에서 여전히 막힌다.

## 현재 차단과 미검증

1. 운영 DB에 `20260825020000`을 적용하고 총 30개·지급 가능 27개 계정의 27개 신청 성공을 직접 봐야 한다.
2. DB 적용 뒤 최신 1.2.0 배포를 운영 대표 주소로 승격하고 대표 주소의 버전·핵심 경로를 다시 확인해야 한다.
3. GitHub 결제 상태를 풀고 main CI 세 작업이 실제로 시작되어 모두 성공하는지 봐야 한다.
4. 운영 인증 읽기 전용 E2E는 설계·로컬 실행 증거가 있으나 정식 계정과 GitHub 환경 설정은 아직 미완이다.
5. 원천징수 3.3%의 신고와 지급명세서·식별정보 수집 방식은 세무 자문 전까지 미확정이다.

운영 미결의 소유자와 종료증거는 [운영 미결 원장](../3-operations/운영-미결-원장.md)에 둔다.
