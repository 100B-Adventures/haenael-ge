해낼게 V2 모바일 클라이언트는 `apps/mobile`에 Expo 57·React Native 0.86으로 구현됐다. Supabase 이메일·Apple 로그인, 목표·응원·친구·초대, iOS StoreKit과 Android Google Play·토스페이먼츠 선택, 서버 영수증 검증, 푸시·딥링크·오프라인·강제 업데이트·앱 안 탈퇴 흐름을 연결했고, 임시 식별자 `app.haenael`은 `app.config.ts` 한 곳에만 뒀다. TypeScript, 계약 시험 16/16, Expo Doctor 21/21, Web·Android export, 인트로→홈→목표→결제 헤드리스 스모크와 9폭 모바일 사용성 검사가 통과했다. Apple·Google·Toss sandbox 실결제와 실제 기기 푸시는 미검증이며, 현재 서버 트리에 없는 `confirm-alternative-payment`·`register-push-token`·`account-delete` Edge Function은 후속 서버 통합이 필요하다. 운영 배포·스토어 콘솔 앱 생성·제출·실결제는 실행하지 않았다.

KNOWLEDGE_QUERY: 해낼게 앱 채널 결정·요청·실수, BRAIN 앱 배포와 소모품 누적 원칙, Expo 57·Supabase Auth·EAS·Expo IAP 공식 계약.
HITS_USED: D-049·D-054·D-055·D-056, 앱 채널 PRD v0.2.0·FDD/API v0.1.0, 승인 앱 프로토타입과 웹 결제 프로토타입, haejo-danta Expo 57 선례. 범위·계약·폴더 구조의 정본으로 사용했다.
HITS_REJECTED: 시험 스킬 ponytail은 두 파일 이하 소규모 편집용이고 설치가 필요해 이번 다중 화면 Expo 구현에는 적용하지 않았다. A6·T2·T4의 결제 없음 표현은 D-055·D-056과 충돌해 폐기했다.
CONFLICTS: 프로토타입의 결제 없음 표현과 최신 결정의 스토어·대체결제 요구가 충돌해 최신 결정과 웹 결제 프로토타입을 우선했다.

SKILLS_USED: haenael-supabase-build, Supabase 앱 수직 슬라이스와 안전 경계를 적용. verify, 타입·시험·export·실렌더 반복 검증에 적용.
SKILLS_SKIPPED: 없음.
SOURCES/MODEL: GPT-5 Codex | `wiki/거버넌스/결정.md` | `docs/plan/prd-app-channels-v0.2.0-claude-opus-20261116-2140.md` | `docs/eng-design/*app-channels-v0.1.0-gpt-codex-20261118*` | Expo·Supabase·Expo IAP 공식 문서
