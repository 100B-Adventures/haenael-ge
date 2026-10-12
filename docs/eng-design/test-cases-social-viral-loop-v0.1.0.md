# 소셜 바이럴 루프 테스트 케이스 마스터 (TC)

| 항목 | 값 |
|---|---|
| 버전 | v0.1.0 |
| 작성일 | 2026-10-04 KST |
| 작성자/모델 | tech-architect / claude-opus-4-8 |
| 상류 핀 | test-plan v0.1.0, api-contract v0.1.0, erd v0.1.0, FDD §12 |

> STAMP: 생성 2026-10-04 KST. claude-opus-4-8. tech-architect. 각 TC는 Given/When/Then(Gherkin). 종류 태그: [계약][단위][통합][동시성][정적][실기기][회귀]. qa 단계가 dev 배포본에서 실행하고 통과분을 리그레션에 누적.

## 목차
- [커버 이미지](#커버-이미지) (TC-COVER-01~05)
- [친구·초대](#친구초대) (TC-FRIEND-01~03)
- [D-003 (최우선)](#d-003-최우선) (TC-D003)
- [신원·인증 (고위험)](#신원인증-고위험-크로스모델-리뷰-후) (TC-AUTH-01~03)
- [선호](#선호) (TC-PREF-01)
- [앱인토스 채널](#앱인토스-채널) (TC-AIT-*)
- [회귀 (이웃 안 깨짐)](#회귀-이웃-안-깨짐) (TC-REG-01~02)

## 커버 이미지

### TC-COVER-01 [통합][계약] 승인 전 비노출
- Given: 목표에 승인된 기존 커버가 있다.
- When: 소유자가 새 사진 업로드 후 finalize 결과가 REVIEW다.
- Then: `goal_public`·친구 응답·공유 OG가 모두 기존 승인 커버를 반환하고, 새 이미지의 public URL은 어디에도 없다. `active_cover_asset_id` 불변.

### TC-COVER-02 [통합] 거부 복구
- Given: 새 커버가 REJECTED.
- When: 사용자가 목표 화면 복귀.
- Then: 기존 승인 커버 또는 프리셋 유지, 재선택 경로 존재, dead-end 0. reason_code는 안정 코드.

### TC-COVER-03 [pgTAP][통합] 소유권
- Given: 사용자 B가 A 목표 asset path를 안다.
- When: B가 finalize 또는 delete 호출.
- Then: `owner_mismatch` 403, DB·Storage 상태 불변.

### TC-COVER-04 [단위][통합] 위장·크기·해상도
- Given: png 확장자로 위장한 실행파일 / 5MB 초과 / 과대 해상도.
- When: finalize 검증.
- Then: 각각 `mime_spoof` / `file_too_large` / 해상도 거부. quarantine object는 정리 대상 플래그.

### TC-COVER-05 [통합] 모더레이션 장애
- Given: 모더레이션 공급자 503.
- When: finalize.
- Then: status REVIEW, upload 유지, 기존 커버 유지, 재시도 가능. `moderation_unavailable` 내부 로깅.

## 친구·초대

### TC-FRIEND-01 [pgTAP][동시성] 초대 수락 유일성
- Given: A의 유효 토큰.
- When: B가 로그인 후 수락.
- Then: A-B ACTIVE 관계 정확히 1건(정렬쌍), 재시도는 `is_replay:true` 동일 관계.

### TC-FRIEND-02 [pgTAP] 거부 분기
- 만료 토큰 → `invite_expired` 410.
- 타 계정 수락된 토큰 → `invite_already_used` 409.
- 자기 초대 → `self_invite` 409.
- 차단 관계 → `blocked_relationship` 409.
- 각 케이스에서 관계 생성 0.

### TC-FRIEND-03 [동시성] 동시 수락 경합
- Given: 같은 토큰으로 B가 10개 동시 요청.
- When: 병렬 실행.
- Then: ACTIVE 관계 1건, 나머지는 replay 또는 already_used. UNIQUE(low,high) 위반 0.

## D-003 (최우선)

### TC-D003 [계약][단위] 금액·순위 비노출
- Given: 금액·순위 금지 필드 목록.
- When: 소셜 view·RPC 반환 컬럼(information_schema) + 응답 JSON 키 + 렌더 DOM 검사.
- Then: `amount_krw·clover_amount·clover_count·total·rank·ranking·leaderboard` 0건. 프로토 `rankSw` 토글 DOM 0. 허용 필드(`cheer_count` 등)만.
- 리그레션 영구 등록.

## 신원·인증 (고위험, 크로스모델 리뷰 후)

### TC-AUTH-01 [통합] 토스 code 1회성
- Given: 앱인토스 authorization code.
- When: auth-toss 1회 교환 후 같은 code 재사용.
- Then: 첫 회 세션 발급, 재사용은 `code_reused` 409. access·refresh 토큰이 브라우저 로컬·DB 일반 컬럼에 저장 0.

### TC-AUTH-02 [통합] 자동병합 금지·명시병합
- Given: 토스 subject가 기존 카카오 member와 동일인(but 미연결).
- When: auth-toss 단독 호출.
- Then: 자동 병합 안 함(신규 member 또는 기존 TOSS identity만). link-identity + consent=true 로만 병합. consent 없으면 `consent_required`.

### TC-AUTH-03 [통합] 만19세 제한
- Given: 만19세 미만 토스 사용자.
- When: auth-toss.
- Then: `age_restricted` 403, 미니앱은 안내 상태, 웹 카카오 경로는 영향 0.

## 선호

### TC-PREF-01 [단위] 마케팅 opt-in
- Given: row 없는 신규 회원.
- When: update_member_preferences 미호출 상태 조회.
- Then: notify_marketing 기본 false, notify_cheer 기본 true. 명시 true 설정 후에만 마케팅 발송 대상.

## 앱인토스 채널

### TC-AIT-GUARD [정적] 채널 격리
- Given: 미니앱 production 번들.
- When: 정적 분석.
- Then: SSR 호출·카카오 로그인·외부 웹 렌더·Toss Payments PG·cashout·cheer-order·toss-confirm import·호출 0건.

### TC-AIT-ALBUM [실기기] 앨범 권한 거부
- Given: 사용자가 앨범 권한 거부.
- When: 커버 단계.
- Then: 프리셋 6종으로 목표 생성 가능, dead-end 0.

### TC-AIT-SHARE [통합] intoss 공유
- Given: 미니앱 공유.
- When: getTossShareLink.
- Then: `intoss://` path·query 정상, OG image는 승인 커버만. 웹 URL fallback 0.

### TC-AIT-NAV [실기기] 네비·백
- Given: Toss Sandbox 실기기.
- When: 딥링크 진입·뒤로가기·exit·safe area.
- Then: 자체 back과 토스 back 중복 0, 주요기능 딥링크 정상 route.

## 회귀 (이웃 안 깨짐)

### TC-REG-01 [회귀] goal 컬럼 추가 영향
- Given: cover 컬럼 추가·active_cover FK 적용.
- When: 기존 결제·환전·워드맵·멀티골 생성·cashout 잠금 스위트 실행.
- Then: 전건 green. `goal_public`·`cheer_public` 반환 불변(+cover_preset_key만 추가).

### TC-REG-02 [회귀] 커버 미설정 기존 목표
- Given: 커버 없는 기존 운영 목표.
- When: 홈·공개·친구 렌더.
- Then: 기본 프리셋 렌더, 에러 0.
