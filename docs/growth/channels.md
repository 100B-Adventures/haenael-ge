# 해낼게 운영 채널 정의서 v1.0.0

> 인지도 관문의 정의 계열이다. 계정 식별자와 상태는 BRAIN 인벤토리와 이 저장소에서 확인된 값만 적었다.
> 비밀값은 기록하지 않는다.

## 채널 표

| 채널 | 계정 | 상태 |
|---|---|---|
| Instagram | @haenaelge | 운영(피드 9·하이라이트 6. 바이오 링크 utm_source=instagram&utm_medium=bio, campaign 은 앱에서만 수정 가능) |
| Threads | @haenaelge | 운영(2026-09-21 소개·링크 세팅 관찰됨. 게시물 0) |
| YouTube | @haenaelge | 운영(2026-09-25 채널 개설·배너·아이콘·설명·링크 2종 관찰됨. 영상 0) |

## 미개설 채널

| 채널 | 상태 |
|---|---|
| TikTok | 미개설. 가입은 회장 몫(런북 `docs/growth/channels/플랫폼-개설-런북-v1.md`) |
| X | 미개설. 같음 |
| Facebook | 미개설. 같음. 광고 집행 계획이 설 때 우선순위가 오른다 |

## 소유와 실행

- 계정과 브랜드 정의는 해낼게가 소유한다.
- 플랫폼 발행 성과는 외주에게 받아 인지도 관문에 기록한다.
- 외주에게 GA4 권한이나 제품 DB 권한을 주지 않는다.

## 확인 근거

- `wiki/brand/channel-identity-kit.md`: 3플랫폼 역할, 핸들, Instagram 실개설 상태.
- `docs/growth/instagram-launch-runbook-2026-07-29.md`: Instagram과 Threads 실행 순서.
- BRAIN `ops/inventory/서드파티-계정-인벤토리.md`: 해낼게 SNS 계정 식별자는 미기재 상태.

---
STAMP
- 작성: 2026-08-13
- 모델: gpt-5.6
- 에이전트: code-builder
- 스킬: 없음
- 고민: 제안 핸들을 실제 개설 상태로 오인하지 않도록 플랫폼별 상태를 분리했다.

SKILLS_USED: 없음
SKILLS_SKIPPED: 매칭 스킬 없음
SOURCES/MODEL: gpt-5.6 / `zero-one/docs/growth/channels.md`, `haenael-ge/wiki/brand/channel-identity-kit.md`, `haenael-ge/docs/growth/instagram-launch-runbook-2026-07-29.md`, BRAIN 서드파티 계정 인벤토리

---

## 유입 채널 전수 표 v1.1.0 (카탈로그 46개, 2026-11-12 growth-analyst)

> 기반 포맷: `/Users/sj/.claude/pipeline/catalogs/growth-channels.yaml`(46개) · 규칙 `/Users/sj/.claude/standards/growth-measurement.md` §5. 위쪽 기존 표·기록은 그대로 두고, 이 절이 카탈로그 전수 판정의 정본이다. 두 곳이 어긋나면 이 절을 먼저 고치고 위쪽을 맞춘다.
> 우선순위 = primary / secondary / later / rejected(이유 필수). 상태 = 측정됨 / 개설됨 / 개설됨(미검증) / 미개설 / 해당없음(rejected). `verified` 는 done_evidence 를 실제로 관찰한 것만 쓰며, 이 절의 어떤 줄도 아직 verified 가 아니다.
> 근거 열의 `2026-11-12 curl 관찰`는 growth-analyst 가 운영 주소에 직접 요청한 결과(서버가 돌려준 첫 HTML 기준)이고, 클라이언트에서 나중에 주입되는 태그는 못 본다. 못 본 것은 `미확인`.
> 앱인토스·Google Play·App Store 는 제품 배포 채널 카탈로그(distribution-channels)가 정본이다. 이 표에서는 스토어 검색 유입 관점으로 `aso` 줄에 병기했다.

### 경로: 검색(SEO·스토어 검색) (`search`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `google-search-console` | owned | primary | 개설됨 | https://haenael-ge.vercel.app/ 속성, 2026-11-04 메타 태그 소유 확인, growth-collector 소유. 사람 계정 rosemallow95 미추가 |
| `naver-search-advisor` | owned | primary | 개설됨 | 2026-11-12 등록(소유확인 대기, 세션맥락). 사이트맵 제출·수집 요청 미확인 |
| `bing-webmaster` | owned | primary | 미개설 | 미등록 |
| `robots-sitemap` | owned | primary | 미개설 | haenael-ge.vercel.app /robots.txt 404, /sitemap.xml 404. 2026-11-12 curl 관찰(서버 응답 기준). 사이트맵·robots 가 없는 상태가 이번 점검 최대 결손 |
| `structured-data-meta` | owned | primary | 미개설 | 홈 og 1 만 있음, canonical·JSON-LD 없음. 2026-11-12 curl 관찰(서버 응답 기준) |
| `aso` | owned | primary | 미개설 | 앱인토스 유입채널(결정 D-SOCIAL-V6, 2026-10-03). 콘솔 상태 미확인. Play·App Store 계획 미확인 |
| `blog-owned` | owned | secondary | 미개설 | 미확인 |
| `naver-blog` | owned | secondary | 미개설 | 2026-09 전략 01-전략.md 에서 언급. 계정 미확인 |
| `tistory-brunch` | owned | later | 미개설 | 계정 미확인 |
| `owned-press` | owned | later | 미개설 | 자체 매체 개통 전(OSMU 쪽 결정 OD-2026-10-27-1) |

### 경로: AI 답변(AEO·GEO) (`ai-answer`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `llms-txt` | owned | primary | 미개설 | /llms.txt 404. 2026-11-12 curl 관찰(서버 응답 기준) |
| `wiki-listing` | earned | later | 미개설 | 제3자 언급(근거)이 쌓이기 전 서두르지 않는다(카탈로그 note) |

### 경로: 소셜 피드 (`social-feed`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `instagram` | owned | primary | 개설됨 | @haenaelge 운영(피드 9·하이라이트 6, 바이오 링크 utm 부착, 기존 channels.md) |
| `threads` | owned | primary | 개설됨 | @haenaelge, 2026-09-21 소개·링크 세팅 관찰. 게시물 0 |
| `x-twitter` | owned | secondary | 미개설 | 미개설. 같은 런북 |
| `linkedin` | owned | rejected | 해당없음 | B2C 라 직장인 B2B 타깃 아님 |
| `youtube` | owned | primary | 개설됨 | @haenaelge, 2026-09-25 채널 개설·배너·아이콘·설명·링크 2종 관찰. 영상 0 |
| `tiktok-shorts` | owned | secondary | 미개설 | 미개설. 가입은 회장 몫(channels/플랫폼-개설-런북-v1.md) |
| `facebook` | owned | secondary | 미개설 | 미개설. Meta 광고 집행 계획이 서므로 우선순위가 오름(기존 channels.md) |

### 경로: 커뮤니티·런칭·디렉터리 (`community`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `product-hunt` | earned | rejected | 해당없음 | 한국어 국내 서비스라 해외 런칭 사이트 타깃 불일치 |
| `hacker-news-show` | earned | rejected | 해당없음 | 개발자 대상 서비스 아님 |
| `reddit` | earned | rejected | 해당없음 | 영어권 커뮤니티 규칙과 타깃 불일치 |
| `indie-hackers` | earned | rejected | 해당없음 | 영어권 메이커 커뮤니티, 타깃 불일치 |
| `disquiet` | earned | secondary | 미개설 | 앱 공개 시 메이커 로그 |
| `geeknews` | earned | rejected | 해당없음 | 개발자 대상 서비스 아님 |
| `kr-communities` | earned | secondary | 미개설 | 목표·습관 커뮤니티 구체 이름 미확인 |
| `ai-saas-directories` | earned | rejected | 해당없음 | AI 도구 디렉터리 타깃(해외 도구 탐색자)과 불일치 |

### 경로: 먼저 연락 (`outreach`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `dm-outbound` | owned | secondary | 미개설 | 2026-09 우선순위 탈락 B(DM): C Threads 판독 뒤. 인바운드 DM 전략 문서 있음(wiki/5-hubs/hub-mkt/haenael-ge-post-dm-inflow-strategy-v1-opus5.md) |

### 경로: 유료 광고 (`paid`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `google-ads` | paid | later | 미개설 | 정본 §5 Google 검색 후보. 사이트 검색 기반 결손 해소 뒤 |
| `meta-ads` | paid | primary | 개설됨 | 광고 계정 1349336810403186, 카드 있음(정본 §3). 픽셀 1678305073814051. 정본 §4: 해낼게는 Meta 만 |
| `naver-search-ads` | paid | later | 미개설 | 사업체 전용 계정 없음. 정본 §3 빈칸 |
| `kakao-moment` | paid | rejected | 해당없음 | 정본 §4 근거 약함 |
| `tiktok-ads` | paid | later | 미개설 | 정본 §5 추가안(경제링고·해낼게 TikTok 2일) 후보 |
| `reddit-ads` | paid | rejected | 해당없음 | 영어권 타깃 아님 |
| `apple-search-ads` | paid | later | 미개설 | iOS 앱 출시 뒤 |
| `daangn-ads` | paid | rejected | 해당없음 | 지역 기반 서비스 아님(카탈로그 applies_to: kr, local) |
| `toss-ads` | paid | rejected | 해당없음 | 정본 광고운영 §4: 금융 앱 이용 목적과 다름 |

### 경로: 소개·제휴·행사 (`referral`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `referral` | owned | primary | 미개설 | 소셜 바이럴 루프(친구·초대 탭) 설계 승인(D-SOCIAL-V6). 구현·초대 링크 태그 도착 미확인 |
| `pr-press` | earned | later | 미개설 | 출시·수치가 생긴 뒤 |
| `influencer` | paid | later | 미개설 | 전용 태그 도착을 잴 수 있는 뒤 |
| `partner-bizdev` | earned | rejected | 해당없음 | B2C 라 제휴 BD 대상 없음 |
| `offline-events` | owned | rejected | 해당없음 | 오프라인 모임 근거 없음 |

### 경로: 재방문(뉴스레터·알림) (`retention`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `newsletter` | owned | later | 미개설 | 발송 이력 없음. 제품 리드 모은 뒤 |
| `email-crm` | owned | later | 미개설 | 리드·고객 목록이 쌓인 뒤 |
| `kakao-alimtalk` | owned | secondary | 미개설 | 카카오 로그인 알림 도달(PRD v0.4.0: 알림에 전화번호 필요, 카카오 비즈앱 scope). 발신 프로필 미확인 |

### 경로: 측정 장치 (`measure`)

| 채널 id | 매체 | 우선순위 | 상태 | 근거(URL·계정·광고 계정 ID) / rejected 이유 |
|---|---|---|---|---|
| `analytics-utm` | owned | primary | 측정됨 | GA4 G-3QR2FB5BGC · Clarity z7rlqfvdmm · Meta 픽셀 1678305073814051. UTM 규칙은 광고운영-정본 UTM 절. 키 이벤트 수신은 2026-11-12 curl 관찰(서버 응답 기준) 범위 밖, 측정 점검(ops-measurement-health) 결과로 본다. 바이오 링크 utm_source=instagram&utm_medium=bio |

집계: primary 13 · secondary 9 · later 11 · rejected 13 (합 46/46)

### 필요한 세팅 (primary·secondary 중 미개설·미검증·검증 대기)

| 채널 id | 우선순위 | 지금 | 해야 할 일 | 누가 |
|---|---|---|---|---|
| `google-search-console` | primary | 개설됨 | 사이트맵 제출 결과와 대표 URL 색인 상태 확인(live → verified), 사람 소유자로 rosemallow95 추가(도메인은 DNS TXT, vercel.app 은 HTML 메타) | 그로스 리드 (rosemallow95 는 메인 크롬 로그인 사용) |
| `naver-search-advisor` | primary | 개설됨 | 소유확인 완료, 사이트맵·RSS 제출, 웹 페이지 수집 요청, site: 검색 노출 확인 | 그로스 리드 (네이버 로그인은 회장 계정 구간) |
| `bing-webmaster` | primary | 미개설 | Search Console 가져오기 또는 소유 확인, 사이트맵 제출 | 그로스 리드 (rosemallow95 소유) |
| `robots-sitemap` | primary | 미개설 | /robots.txt 와 /sitemap.xml 생성(운영 URL 200), 전역 noindex 없음 확인, 학습 크롤러 허용 여부 결정 | 프로덕트 리드 (구현) · 학습 크롤러 허용 여부는 회장 결정 |
| `structured-data-meta` | primary | 미개설 | 서버 렌더 HTML 에 title·description·OG·canonical·JSON-LD(Organization·Product·FAQPage), 카톡·슬랙 미리보기 실측 | 프로덕트 리드 |
| `llms-txt` | primary | 미개설 | /llms.txt 요약과 정본 경로 게시 | 프로덕트 리드 |
| `aso` | primary | 미개설 | 스토어 제목·부제·키워드·스크린샷, 리뷰 요청 흐름, 핵심 키워드 3개 순위 기록 | 그로스 리드 · 프로덕트 리드 · 개발자 계정 등록·심사 제출·비용은 회장 |
| `blog-owned` | secondary | 미개설 | 자사 도메인 /blog 구조와 글 템플릿(질문 하나·숫자·출처·갱신일) 구현, 첫 글 발행 | 프로덕트 리드 (구현) · 그로스 리드 (글 발주) |
| `naver-blog` | secondary | 미개설 | 블로그 개설(이름·주소·소개·카테고리) 후 첫 글 발행, 유입분석 확인 | 이름·주소는 회장 결정, 개설은 회장 네이버 계정 구간, 글은 그로스 리드 |
| `x-twitter` | secondary | 미개설 | 계정 개설(표시명·핸들·소개·프로필 링크 UTM), 2단계 인증과 복구 이메일 기록, 3개 이상 시드 게시물 준비 | 표시명·핸들은 회장 결정(정체성), 가입은 회장 로그인 구간, 키트 준비는 그로스 리드 |
| `tiktok-shorts` | secondary | 미개설 | 계정 개설(표시명·핸들·소개·프로필 링크 UTM), 2단계 인증과 복구 이메일 기록, 3개 이상 시드 게시물 준비 | 표시명·핸들은 회장 결정(정체성), 가입은 회장 로그인 구간, 키트 준비는 그로스 리드 |
| `facebook` | secondary | 미개설 | 계정 개설(표시명·핸들·소개·프로필 링크 UTM), 2단계 인증과 복구 이메일 기록, 3개 이상 시드 게시물 준비 | 표시명·핸들은 회장 결정(정체성), 가입은 회장 로그인 구간, 키트 준비는 그로스 리드 |
| `disquiet` | secondary | 미개설 | 메이커 로그 작성, 런칭 URL | 그로스 리드 |
| `kr-communities` | secondary | 미개설 | 대상 커뮤니티 구체 이름 확정, 각 자기홍보 규칙 기록, 계정 활동 이력 만들기 | 그로스 리드 |
| `dm-outbound` | secondary | 미개설 | 대상자 목록, 하루 발송 상한, 문안 승인 | 그로스 리드 (계정 제한 위험, 상한은 회장 확인) |
| `kakao-alimtalk` | secondary | 미개설 | 발신 프로필 승인, 템플릿 심사 | 그로스 리드 · 승인 신청은 회장 카카오 계정 |
| `referral` | primary | 미개설 | 초대 링크 UTM 태그 도착·가입 수 측정 | 프로덕트 리드 (기능) · 그로스 리드 (측정) |

실제 외부 계정 개설·광고비 집행은 이 문서가 하지 않는다. 새 계정 개설, 돈이 나가는 집행, 회장 실명·얼굴 노출, 이름·핸들 같은 정체성은 회장 확인(카탈로그 chairman_gate).

STAMP 2026-11-12 · claude-sonnet-5-5 / growth-analyst · 기반 포맷: 기존 `docs/growth/channels.md`(위 절) + growth-channels.yaml 카탈로그 전수 · 점검기 `harness/bin/growth-venture-structure-check.sh`
