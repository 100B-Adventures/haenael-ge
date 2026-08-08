# 해낼게 카카오 알림톡 운영 런북

> 상태 기준시각: 2026-08-08 21:06 KST  
> 모델: GPT-5 Codex  
> 근거: deploy 직접 실행 로그, 로컬 정합성 테스트(`deno test`/`deno check`), `.handoff-state.md`, 카카오/솔라피 공식문서, 현행 소스

## 한 줄 상태

**카카오 전화번호 선택 동의와 저장 코드는 운영 반영됐고, `notify`/`toss-confirm` 배포까지 완료했지만, 솔라피 채널 연동·템플릿 승인·`KAKAO_ALIMTALK_*` 시크릿 등록이 남아 실 알림톡 발송은 아직 대기 상태다.**

### 2026-08-08 재점검 보강

- 로컬 코드 정합성 재검증: `deno test supabase/functions/auth-kakao/index.test.ts supabase/functions/_shared/cheer-notification.test.ts supabase/functions/_shared/oauth-kakao.ts` 실행 결과 19개 통과(인증 토큰 처리, 휴대폰 정규화/동의철회 표기, notify 폴백 분기 모두 통과).
- 코드 레벨로 `toss-confirm`→`dispatchCheerReceivedNotification`→`notify` 호출 라인 정합성 재확인(전화번호 미보유/알림톡 미설정 시 INAPP 폴백 분기 유지).
- 운영 실수신/템플릿/비밀값 상태는 기존 문서 기준으로 **변화 없음**(`O-007` 유지).

## 전체 과정과 현재 상태

| 순서 | 필요한 일 | 2026-08-08 상태 | 종료 증거 |
|---|---|---|---|
| 1 | 카카오 비즈 앱 전환 | 완료 | 앱 1516450, 사업자 798-31-01774 기록 |
| 2 | 카카오톡 채널 생성·앱 연결 | 완료 | `@해낼게`, 공개 ID `_bHdBX`, 앱 연결 기록 |
| 3 | `phone_number` 제공 권한 심사 | 완료 | 2026-08-04 승인 기록 |
| 4 | 전화번호 동의 강도 설정 | **선택 동의는 완료 / 필수 동의 승격 심사는 2026-08-05 접수 후 최신 결과 미확인** | 카카오 콘솔 `[카카오 로그인] > [동의항목]` 실측 필요 |
| 5 | 웹 authorize scope | 완료·운영 반영 | 운영 리다이렉트에 `phone_number,age_range` 관찰 |
| 6 | `member.phone` 저장소·정규화 | 완료·운영 반영 | migration `20260805010000`, `auth-kakao` v15 |
| 7 | 솔라피에 비즈니스 채널 연동 | **미완** | 2026-08-05 마지막 기록: 연동 모달에서 카테고리/휴대폰 인증 단계 미종결 |
| 8 | 알림톡 템플릿 등록·검수 | **미접수** | 템플릿 ID·승인 상태가 저장소/운영 기록에 0개 |
| 9 | 솔라피 API 자격증명 등록 | **미완** | 운영 Supabase secrets에 `KAKAO_ALIMTALK_*` 5종이 0개 |
| 10 | 결제 성공 후 알림 호출 코드 배포 | **완료(배포됨)** | `supabase functions deploy auth-kakao notify toss-confirm` 응답에서 `notify`/`toss-confirm` 배포 성공, `auth-kakao` 변경 없음 |
| 11 | 실결제→실수신 E2E | **미검증** | 실제 수신 단말·notification 행·솔라피 메시지 ID 3종 증거 없음 |

## 전화번호 필수 동의와 선택 동의

- 현재 운영에서 확인된 값은 **선택 동의**다. 사용자가 거부해도 로그인은 성공하며 `member.phone`은 비어 있을 수 있다.
- 2026-08-05에 `phone_number`만 **필수 동의**로 승격하는 별도 심사를 접수했고, 2026-08-06 마지막 직접 관찰은 `심사 중`이었다. 최신 승인/반려는 카카오 콘솔 재확인이 필요하다.
- 카카오 공식 FAQ에 따르면 전화번호를 필수로 설정해도 카카오톡을 사용하지 않는 카카오계정은 값이 비어 있을 수 있다. 따라서 환전 화면의 직접 입력 폴백은 필수 동의 승인 후에도 삭제하면 안 된다.
- 선택→필수 전환은 가입 마찰을 높인다. 해낼게는 알림톡을 핵심 도달 경로로 정해 필수 승격을 신청했지만, 실제 확보율과 로그인 이탈률을 함께 측정해야 한다.

## 템플릿 계획

현재 문구 초안은 아래 3종이나, 코드가 실제 참조하는 것은 `CHEER_RECEIVED_V1` 하나뿐이다.

| 코드 | 용도 | 구현 | 심사 |
|---|---|---|---|
| `CHEER_RECEIVED_V1` | 응원 도착 즉시 알림 | 코드 있음 | 미접수 |
| `CHEER_DIGEST_V1` | 30분 응원 묶음 | 초안만 있음 | 미접수 |
| `CASHOUT_PAID_V1` | 환전 지급 완료 | 초안만 있음 | 미접수 |

등록 우선순위는 `CHEER_RECEIVED_V1` 한 건이다. 나머지 두 건은 호출 코드가 없어 먼저 심사받아도 실사용되지 않는다. 템플릿 본문은 금액·클로버 수를 넣지 않고 응원자 표시명과 목표 제목만 변수로 쓴다. 광고·혜택·긴급성 문구는 넣지 않는다.

## 호출 코드 & 비밀값 역할(운영 증빙 기준)

- 결제 후 알림 트리거는 `toss-confirm`에서 `confirm_cheer_payment` RPC 성공 뒤 실행됩니다.
  - `toss-confirm/index.ts:299`~`329`
  - `dispatchCheerReceivedNotification`는 `member.phone` 조회, `alimtalkConfigured`, `notify` EF 호출 여부를 결정
- `notify` EF는 `notify/index.ts`에서 service role 토큰으로 호출되어:
  - `memberId`, `type: "CHEER_RECEIVED"`, `phone`, `displayName`, `goalTitle`을 받아
  - `buildCheerReceivedMessage`로 템플릿 메시지 빌드 후 `sendAlimtalk`로 발송 시도
- 실제 템플릿 바인딩은 `_shared/alimtalk.ts`의 `TEMPLATE_CODES.CHEER_RECEIVED = "CHEER_RECEIVED_V1"` 하나뿐.
- 발송되지 못하면 `notification.channel = INAPP`으로 자동 강등되며 결제 자체는 영향 없음.

### KAKAO_ALIMTALK_* 키 역할

| 키 | 용도 |
|---|---|
| `KAKAO_ALIMTALK_API_URL` | Solapi/대행사 send API 엔드포인트 |
| `KAKAO_ALIMTALK_API_KEY` | API 호출용 키 |
| `KAKAO_ALIMTALK_API_SECRET` | HMAC-SHA256 서명(secret) |
| `KAKAO_ALIMTALK_SENDER_KEY` | 발신키(비즈채널 ↔ 템플릿 매핑) |
| `KAKAO_ALIMTALK_PFID` | 발신프로필 ID |

### 운영에서 키 관리 원칙

- 원문 값은 위키/채팅에 쓰지 않고, 회장 승인 환경(운영 계정) + 로컬 `~/.sj-agent-harness/secrets/*.env`에 분리 보관
- 로컬/운영은 동일한 키 세트를 보유하되, 용도별 접근 권한을 분리
- 정합성 점검은 `notify` 동작 시점에서 `KAKAO_ALIMTALK_*` 5개 모두 존재 여부로만 판별되며, 1개라도 비면 placeholder/INAPP 폴백
- 배포/검수 전에는 템플릿 본문·변수 수(현재 `#{응원자}`, `#{목표}`)와 코드 템플릿 코드를 O-007 미결 항목과 함께 고정

## 배포/실수신 현재 증빙

- `supabase functions deploy auth-kakao notify toss-confirm` 실행 결과: `auth-kakao` no change, `notify`/`toss-confirm` 배포 완료.
- 코드 자체 정합성은 테스트로 확인(27 passed, deno check pass)되었고, 알림 호출 경로도 로컬에서 검증됨.
- 실수신은 솔라피 채널 연동·템플릿 승인·`KAKAO_ALIMTALK_*` 시크릿 등록 후, 실결제 1건 E2E로만 검증 가능.
- 참고: 현재 환경은 `supabase functions list`/`secrets list` 실행 시 CLI Telemetry 파일 쓰기 EPERM 오류로 실패해 조회는 불가(배포 성공 자체는 deploy 출력으로 확인).

## 남은 실행 순서

1. 카카오 개발자 콘솔에서 필수 동의 승격 심사 결과를 확인한다. 승인 시 `phone_number=필수 동의`로 실제 전환됐는지도 별도 확인한다.
2. 솔라피에서 `@해낼게` 비즈니스 채널 연동을 끝낸다. 채널 관리자 휴대폰 인증이 요구되면 회장 OTP가 필요하다.
3. `CHEER_RECEIVED_V1`을 먼저 등록하고 검수를 요청한다. 솔라피 공식 안내상 통상 영업일 1~3일이나 카카오 심사라 확정 일정은 아니다.
4. 승인된 채널/템플릿 식별자와 API 키를 로컬 비밀 저장소와 운영 Supabase secrets에 이중 등록한다. 원문 값은 위키에 쓰지 않는다.
5. `toss-confirm`/`notify` 배포는 반영됨. 남은 과제는 솔라피 연동·템플릿 승인·시크릿 등록 후 실결제 E2E.
6. 소액 실결제 1건으로 카카오 실수신, 솔라피 메시지 ID, DB `notification.channel='ALIMTALK'`를 동시에 관찰한다. 실패 시 INAPP 폴백도 별도 재현한다.

## 공식 근거

- 카카오 로그인 FAQ: 전화번호 필수 동의여도 카카오톡 미사용 계정은 값이 없을 수 있으며 자체 수집 폴백이 필요하다. https://developers.kakao.com/docs/ko/kakaologin/faq
- 솔라피 알림톡 Q&A: 채널 연동 전 템플릿 등록 불가, 검수는 통상 영업일 1~3일. https://solapi.com/guides/kakao-faq
- 솔라피 알림톡 가이드: 비즈니스 채널 개설→연동→템플릿 등록·검수→발송 순서. https://solapi.com/guides/kakao-ata-guide
- 솔라피 정책 공지: 광고성·영리 목적 문구는 템플릿·채널 차단 위험. https://solapi.com/updates/notices-20250702/

## 변경 시 같이 갱신할 곳

- 최신 운영 상태: 이 문서
- 미결 인덱스: `wiki/ops/운영-미결-원장.md` O-007
- 세션 인계: `.handoff-state.md`
- 코드/테스트 증거: `docs/qa-tracker.md`
