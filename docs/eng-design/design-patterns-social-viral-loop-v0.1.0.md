# 소셜 바이럴 루프 설계 패턴 (쓸 것·안 쓸 것)

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-10-04 KST |
| 작성자/모델 | tech-architect / claude-opus-4-8 |
| 상류 핀 | FDD v0.1.0 §4·§5·§11, 실배포 `supabase/`·`web/src/` 관습 |

> STAMP: 생성 2026-10-04 KST. claude-opus-4-8. tech-architect. 근거는 실배포 코드의 기존 관습(service_role EF가 금액 write, RLS 소유자 격리, soft-delete, 멱등 order_id). 고민 지점은 새 패턴 발명이 아니라 기존 관습을 소셜·멀티채널로 연장하는 것.

## 목차
- [1. 쓸 패턴](#1-쓸-패턴)
- [2. 안 쓸 패턴 (명시)](#2-안-쓸-패턴-명시)
- [3. DTO·경계 규칙](#3-dto경계-규칙)
- [4. 레이어링](#4-레이어링)

## 1. 쓸 패턴

### 1.1 금액 3층 격리 (계승, 최우선)
- a층 공개(view, ₩·clover 없음) / b층 본인(잔액) / c층 환전(cashout_request만 ₩). 소셜은 전부 a층 또는 사람수·횟수만.
- 소셜 RPC·view는 금액 컬럼을 물리적으로 만들지 않는다. "숨김"이 아니라 "부재"다.

### 1.2 service_role worker 경계
- 금액 write, 공개 버킷 복사, 모더레이션 전환은 service_role EF만. 클라이언트는 service_role 키를 절대 안 가진다.
- 커버 공개 전환은 finalize EF가 유일 통로. 클라이언트가 public 버킷에 직접 write 불가.

### 1.3 RLS + SECURITY DEFINER 조회
- 친구 상세는 `SECURITY DEFINER` RPC로 열되 `search_path=''`, 함수 내부 active 관계 검사, 최소 grant, pgTAP 권한 테스트. 일반 goal RLS를 느슨하게 열지 않는다.

### 1.4 멱등 변이
- 기존 `payment.order_id` UNIQUE 멱등 관습을 `request_key`로 일반화. 초대 수락·커버 finalize·선호·신원 교환 전부 재시도 안전.

### 1.5 해시 전용 민감값
- 토큰·공급자 subject는 원문 미저장, sha256만. 원문은 링크·전송 중에만 존재.

### 1.6 soft-delete + 승인본만 공개
- goal·cheer soft-delete(`deleted_at`) 계승. 커버는 수명주기 상태머신(PENDING→APPROVED/REVIEW/REJECTED→SUPERSEDED→DELETED), 공개는 APPROVED만.

### 1.7 채널 격리 (web vs miniapp)
- 공통 백엔드(Supabase), 분리 클라이언트. 순수 도메인 타입·토큰만 공유(`packages/domain`, `packages/design-tokens`). UI 런타임·SSR·결제는 공유 안 함.
- 미니앱은 토스 로그인·네비·공유만. 카카오·결제·환전·외부 URL import 0(정적 가드).

### 1.8 상태 관리
- 서버 상태 진실원 = Supabase. 클라이언트는 조회 캐시(기존 web의 패턴 계승). 낙관적 업데이트는 커버·초대처럼 되돌릴 수 있는 것만, 결제·금액은 서버 확정 후에만 반영.

## 2. 안 쓸 패턴 (명시)

| 안 쓸 것 | 이유 |
|---|---|
| iframe·외부 WebView로 Next.js 임베드 | 앱인토스 정책 위반 |
| Next.js 전체 CSR 전환 | 서버 기능 전면 재구축·회귀 위험. 별도 미니앱이 안전 |
| 금액·순위 랭킹·리더보드 | D-003 위반. 프로토 `rankSw` 제거 |
| 응원=자동 친구 | 결제가 관계 동의로 둔갑. 프라이버시 기대 위반 |
| 연락처 스크래핑 자동추천 | 개인정보·플랫폼 검수 부담. 초기 제외 |
| 전화번호 자동 계정 병합 | 번호 재사용·탈취 위험 |
| 커버 즉시공개 후 신고만 | 비회원 공개·심사 부적합 |
| 업적·타임라인 샘플 상태 하드코딩 | 진실원 없이 가짜 상태 = 위조. 이벤트 정의 선행 |
| client service_role 키 | 치명적 권한 유출 |
| moderation 원문 라벨 사용자 노출 | 민감·오탐 노출. 안정 reason_code만 |

## 3. DTO·경계 규칙
- `packages/domain`: 순수 타입·검증·이벤트 이름만. Next·Toss·Supabase 런타임 import 금지.
- EF 응답은 DTO로 좁혀 금지 필드가 구조적으로 못 새게 한다(금액 필드가 타입에 없음).
- 에러는 공통 코드 사전(api-contract §6)으로 통일. 자유 문자열 에러 금지.

## 4. 레이어링
```
Client(web SSR / miniapp CSR)
  → DTO(packages/domain)
    → Supabase RPC(RLS, SECURITY DEFINER) / Edge Function(service_role)
      → Postgres(진실원) / Storage(quarantine|public)
        → 외부(Toss SDK, moderation provider)
```
클라이언트는 service_role·외부 토큰 교환을 절대 직접 하지 않는다. 모두 EF 뒤로.
