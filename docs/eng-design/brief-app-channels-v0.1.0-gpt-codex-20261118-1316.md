# 해낼게 앱 3채널 착수 브리프

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-11-18 13:16 KST |
| 작성자/모델 | code-builder / GPT-5 Codex |
| 상류 산출물 | `docs/plan/prd-app-channels-v0.2.0-claude-opus-20261116-2140.md`, `docs/design/prototypes/v2-social-viral-loop-v3.1.1-claude-opus-20261116-1855.html`, `docs/design/prototypes/v2-app-channels-v0.1.0-claude-opus-20261116-1930.html`, `DESIGN.md`, D-056 |
| 대상 기준 커밋 | `e56ca46` |

## 착수 네 줄

1. **목적:** 해낼게의 웹 전용 수익 루프를 iOS, Android, 앱인토스까지 확장해 응원자는 채널 안에서 결제하고, 받는 사람은 현금 또는 기프티콘이라는 실질 보상을 선택하게 한다. 지키는 가치는 결제 수단보다 받는 사람의 실질 이득과 신뢰 가능한 원장이다.
2. **달성 기준:** 앱 채널용 FDD·API·ERD·테스트 계약이 기계 검사와 다른 모델 교차 리뷰를 통과하고, staging DB와 Apple·Google 테스트 결제에서 채널별 구매→서버 검증→중복 방지→30일 보류→받는 사람 적립이 관찰되며, 웹의 로그인 전 동의 배너가 사라지고 가입 뒤 동의 흐름이 실제 렌더된다. 앱인토스 SDK 3.x는 샌드박스가 없으므로 로컬 devtools mock과 서버 계약까지만 검증하고, 실결제 금지 동안 공급자 왕복은 `미검증`으로 남긴다. 스토어 제출 직전에는 `.goal/questions-app-channels.md`에 준비 완료와 남은 비가역 항목을 기록한다.
3. **제약·리스크:** 운영 DB 마이그레이션, 실결제, 외부 발신, 스토어 제출, 콘솔 앱·번들 생성은 승인 전 금지다. 앱인토스의 환가성 상품 금지와 D-056-3은 정면 충돌한다. Google Play 대체 결제는 프로그램 등록과 24시간 내 외부 거래 보고가 필요하다. 기프티콘 공급사는 사업자 계약, 선입금, 상용 키가 필요하고 공급사 정책상 유상 재판매로 분류될 위험이 있다. 가장 어려운 지점은 세 스토어 영수증을 한 번만 원장에 반영하면서 환불과 30일 보류를 일관되게 처리하는 일이다.
4. **필요한 것과 현재 상태:** 기존 Supabase 원장·환전 코드와 V2 웹은 있음. Expo 57 선례는 `/Users/sj/sj_code_master/haejo-danta/apps/mobile`에 있음. 앱인토스 CSR 미니앱은 `miniapp/`에 있음. Apple·Google 콘솔 앱과 테스트 상품, 앱인토스 콘솔 앱과 실제 결제 상품 존재는 아직 확인 중이다. 기프티콘 공급사 계약·키·비즈머니는 없음으로 단정하지 않았고 `before-asking.sh`와 계정·시크릿 인벤토리로 확인할 예정이다.

## 현재 지도

| 칸 | 현재 실물 | 이번 판 |
|---|---|---|
| 웹 분석 동의 | 루트 레이아웃이 비회원에게도 `AnalyticsConsentBanner`를 렌더한다. GA4·Clarity·Meta는 동의 전 미적재다 | 루트 배너 제거, 인증 뒤 선택 UI, GA4 Consent Mode v2 거부 기본값, Clarity·Meta 동의 전 미적재 유지 |
| 웹 보상 | 현금 환전만 있고 `clover_eligibility`가 잠금·가용 잔액을 서버에서 계산한다 | 현금 환전과 나란히 기프티콘 교환 요청. 공급사 계약 전 외부 발행은 차단 |
| iOS·Android | `apps/mobile` 없음 | Expo 57 + React Native 0.86 앱, Apple 로그인·딥링크·푸시·결제·오프라인·업데이트·탈퇴 |
| 앱인토스 | Vite CSR, 토스 로그인·공유 골격, 결제 없음 | 토스 IAP 구매와 서버 검증, 받은 사람 적립. 환전·기프티콘 화면은 제외. 광고는 기능 플래그만 |
| 서버 | TossPayments 주문·승인, 원장, 30일 이내 환전 보호 기반 있음 | 스토어 거래 수신·검증·멱등 원장·환불/보류, 기프티콘 교환 상태기계 추가 |

## 기준 산출물 유지·개선·교체 판정

| 항목 | 판정 | 이유 |
|---|---|---|
| 웹 소셜 화면·토큰 | 유지 | D-049와 v3.1.1이 최신 UI 정본이다 |
| 앱 v0.1.0 정보 구조 | 개선 | 홈·친구·워드맵·마이 구조는 유지하지만 A6·T2·T4의 무결제 계약은 D-055·D-056으로 폐기됐다 |
| 웹 TossPayments 원장 경계 | 확장 | 서버 승인, 멱등, 보상 기록 패턴을 스토어 영수증 검증에도 재사용한다 |
| 앱인토스 무료 응원 | 교체 | D-055·D-056이 유료 IAP와 실질 이득으로 대체했다 |
| Capacitor | 기각 유지 | 공식 문서가 `server.url`을 production 용도로 권하지 않고, 결제·푸시·딥링크가 네이티브라 Expo 선례 재사용이 낫다 |

## 이웃 영향 후보

- `payment`, `cheer`, `clover_ledger`, `clover_eligibility`, `cashout_request` 무결성과 기존 웹 결제 회귀.
- 환불 뒤 이미 지급한 잔액의 음수화·회수 정책, 30일 보류 만료 계산, 중복 영수증 경쟁 조건.
- Google Play 대체 결제 보고 누락, Apple 서버 알림 재전송, 앱인토스 환가성 심사 반려.
- 회원가입 직후 동의 UI가 온보딩 저장 흐름을 가리거나, 동의 거부가 서비스 사용을 막는 회귀.
- 기프티콘 발송을 위한 휴대전화 번호·처리위탁·국외 이전 고지와 개인정보 최소 수집.
- `/g/*` 링크가 앱을 열지 않고 웹을 유지해야 하는 기존 공유 전환율.

## 확인한 근거와 아직 안 본 것

**읽음:** D-056·D-055·D-054·D-049·D-047·D-021, 요청 원문, 앱 채널 PRD v0.2.0 전량, 두 프로토타입의 매니페스트와 관련 화면, `DESIGN.md`, 제품 레인 계약, 코드·QA·설계 표준, 기존 웹 분석 코드, 앱인토스 골격, Expo 선례 구조, BRAIN 앱인토스 유통 채널·소모품 적립화 정본, Apple·Google·Expo·앱인토스·기프티쇼·카카오 공식 문서.

**아직 안 봄:** Apple·Google·앱인토스 콘솔의 이 앱 실재 여부, Apple·Google 테스트 상품, 앱인토스 실제 결제 상품, 회사 계정 프로그램 가입 상태, 기프티콘 공급사 계약 상태, staging DB의 실제 신규 마이그레이션 적용 가능 여부. 이 항목을 확인하기 전에는 테스트 결제와 외부 발행 가능 판정을 내리지 않는다. 앱인토스 콘솔 QR 결제는 실제 과금이므로 이번 판에서는 실행하지 않는다.

## 외부 벤치마크 적용

- [Apple StoreKit·App Store Server API](https://developer.apple.com/documentation/appstoreserverapi): 클라이언트 성공만 믿지 않고 JWS 거래를 서버가 검증하며, 소모품도 거래 ID 기준으로 관리한다.
- [Google Play 대체 결제 API](https://developer.android.com/google/play/billing/alternative): Play가 제공하는 사용자 선택 화면과 외부 거래 토큰을 사용하고, 대체 결제 완료를 백엔드가 24시간 안에 보고한다.
- [Expo IAP 가이드](https://docs.expo.dev/guides/in-app-purchases/): Expo Go가 아니라 development build를 사용하고, `expo-iap` 또는 RevenueCat 계열 중 서버 검증 요구에 맞는 라이브러리를 기술설계에서 확정한다.
- [앱인토스 인앱결제](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment.md): 토스 IAP 소모품과 서버 상태 조회 흐름을 차용한다. 환가성 상품 금지는 숨기지 않고 심사 리스크와 광고 폴백으로 기록한다.
- [기프티쇼 비즈 API](https://biz.giftishow.com/faqview?faqSeq=144)와 [카카오 선물하기 for Biz](https://business.kakao.com/info/giftbiz): 자동 발송·미사용 처리·상품 조회 구조를 비교했다. 둘 다 사업자 가입·승인·선입금 또는 계약이 필요하므로 승인 전 외부 발송은 구현 경계 밖에 둔다.

## 시험 입력 판정

`~/.sj-agent-state/registry/skills.yaml`의 code-builder 후보 `ponytail`은 설치되지 않은 candidate이고, 코드를 읽지 않은 외부 도구를 이번 고위험 결제 경로에 시험하면 비교 가능성이 없다. 본 산출물 비교안에는 쓰지 않는다.

---

STAMP: created=2026-11-18T13:16+09:00 | model=GPT-5 Codex | agent=code-builder | skills=haenael-supabase-build | sources=D-056, PRD v0.2.0, app prototypes, Apple, Google, Expo, Apps in Toss, Giftishow, Kakao, BRAIN | 고민=플랫폼 심사와 실질 보상 결정을 동시에 숨기지 않고, 되돌릴 수 있는 코드와 승인 필요한 외부 계약을 분리했다.

KNOWLEDGE_QUERY: BRAIN에서 앱인토스 유통 채널, 소모품의 적립화, 사업 수익 목표를 조회했다.
HITS_USED: `wiki/business/영업/idea-유통채널-후보-앱인토스.md`는 채널 제약을 기획 입력으로 쓰는 근거로, `wiki/business/마케팅/concept-소모품의-적립화-뱃지-등급.md`는 결제 직후 누적 가치를 보여주는 근거로 채택했다.
HITS_REJECTED: BRAIN의 다른 사업체별 등급·배지 예시는 해낼게 결제 원장과 직접 관계가 없어 채택하지 않았다. candidate `ponytail`은 미설치·고위험 코드 미독해라 시험하지 않았다.
CONFLICTS: D-056-3의 앱인토스 실질 보상과 앱인토스 공식 환가성 상품 금지가 충돌한다. 회장 결정대로 구조를 투명하게 심사하되, 반려 시 광고 기능 플래그로 전환한다.

SOURCES/MODEL: GPT-5 Codex | repo governance·PRD·prototype·DESIGN·current code | BRAIN pages above | official Apple, Google, Expo, Apps in Toss, Giftishow, Kakao URLs above
SKILLS_USED: haenael-supabase-build, Supabase 마이그레이션→타입→코드→테스트 순서와 staging-only 경계를 적용
SKILLS_SKIPPED: ponytail, 미설치 candidate이며 결제·원장 고위험 구현에 코드 미독해 도구를 시험하지 않음
