# 해낼게 social-viral-loop v3 — 스크린 인벤토리 (배포 실존 전수 + 신규 소셜)

status: ideation-prototype-inventory
생성: 2026-10-01 KST · model: claude-opus-4-8 · agent: product-designer
대상 프로토타입: `docs/design/prototypes/social-viral-loop-v2-opus48.html` (v3 in-place 재설계)
정본 대조: 실배포 라우트 전수 = `find web/src/app -name page.tsx` 15개 + 공유 셸/컴포넌트.
배포 버전: `web/package.json` 1.2.1 · `RELEASE.md` 1.2.1 (canonical `https://haenael-ge.vercel.app`, 실배포 버전 미육안확인 = 소스 기준).

이 문서는 "배포에 실제로 있는 화면/컴포넌트"를 먼저 전수로 세우고, 그 위에 v2 소셜 루프가 얹은 신규 화면을 더한 완결 인벤토리다. 지난 판(v2.2)이 배포 셸(ReceiverShell·NotificationBadge)과 환전내역 실화면을 안 읽어 구조를 틀리게 지어낸 것을 시정했다.

## v4 반영 (2026-10-02 · 회장 9342 실사용 5라운드 지적)

1. **모션 깜빡임 근본수정**: 표시(display)와 애니 재장착(`[data-anim="run"]`)을 분리. `.active` 는 전환 내내 display:flex 유지, 자식/부모 애니는 data-anim 게이트로만 재생. 헤드리스 증명 = 전환 중(0/40/120/300ms) computed display 전 구간 'flex'(none 프레임 0), opacity 단조증가.
2. **`mywordmap` (owner 워드맵 읽기뷰) 신설**: 홈/관리 "워드맵 보기"의 목적지를 dopamine(응원 적립 연출, 응원하는 사람 맥락)에서 분리. 같은 배포 라우트 `(receiver)/wordmap/[goalId]` 의 owner 읽기 상태 — 응원 CTA·로그인 유도 없음. 비회원 랜딩(goalpublic) 아님.
3. **goaldetail 관리 화면 세부**: 편집은 하단 details 토글 제거 → 제목·이유·마감 인라인 인플레이스 수정. 응원 명단은 전 행 일관 인라인 아코디언(실제 잘린 메시지에만 chevron). 총 인원수는 헤더 1곳, 행 배지 "🍀 N번"으로 간결화. 사족 safenote 삭제 → "금액도 순위도 없어요" 한 줄.
4. **절제된 생동 모션**: D-003 "조용히" 1선 준수, 컨페티 폭죽 금지, 워드맵 단어 부드러운 착지·countBump 만.

## v5 반영 (2026-10-02 · 회장 9342 6라운드 · 목표 커버 사진)

회장 결정: "기본 커버 제공하되 유저가 커스텀할 수 있어야 한다. 어쨌든 자기 해낼게를 꾸며서 응원받는 것이니."

**★배포 미존재·프로토 신규** — 현 배포 앱에는 목표 사진/커버 필드가 없다(goal 테이블·OnboardingGoalForm·GoalEditSheet 모두 제목·이유·마감만). 커버는 이 프로토타입이 제안하는 신규 기능이며, 구현 시 goal 테이블 cover 컬럼(프리셋 id 또는 업로드 이미지 경로)·Storage 버킷·업로드 RLS 가 신설돼야 한다(plan 승격 대상).

| 항목 | 설계 |
|---|---|
| 기본 커버 | 브랜드 톤 잔잔한 프리셋 6종(c1 클로버그린·c2 새벽크림·c3 포레스트·c4 세이지·c5 샌드·c6 더스크). CSS 그라데이션(실사 에셋이 인물 초상뿐이라 그라데이션 채택; 커스텀 업로드는 실사). 목표마다 기본값 자동 배정 |
| 커스텀 | ①프리셋에서 선택 ②내 사진 업로드(프로토는 FileReader 로 실미리보기, 서버 없음) |
| 선택성 | **선택이지 필수 아님** — 온보딩에서 스킵하면 기본 프리셋 유지 |
| 반영 화면 | 온보딩(커버 선택 단계) · goaldetail(상단 커버 히어로, 탭→선택기 토글) · 홈 목표 카드(썸네일 배너) · goalpublic(공개뷰 커버 배너+선언자 캡션) · belong(친구 해낼게 커버 배너) |
| 목적 | 응원하는 사람에게 목표 맥락·분위기 제공 + 선언자가 자기 해낼게를 꾸미는 요소 |
| 제약 | D-003 무관(금액·순위 아님). prefers-reduced-motion 유지. em dash 0 |

---

## 0. 배포 공유 셸 (전 회원 화면이 상속하는 구조 — 개별 화면보다 먼저)

| 셸 요소 | 배포 컴포넌트 | 구조 | 프로토 반영 |
|---|---|---|---|
| 상단바(home 변형) | `ReceiverShell.tsx` `ReceiverTopBar variant="home"` | 브랜드(해낼게.) + 🔔 NotificationBadge + 로그아웃 | 홈·마이페이지 head 에 계승 (브랜드 + 🔔 배지/드롭다운 + 로그아웃) |
| 상단바(detail 변형) | `ReceiverShell.tsx` `ReceiverTopBar variant="detail"` | 브랜드만 | 목표관리·환전·환전상태·환전내역·정적문서 head = 뒤로 + 브랜드 |
| 인앱 알림 | `NotificationBadge.tsx` | 🔔 + 안읽음 배지 + 드롭다운(CHEER_RECEIVED "조용한 응원이 도착했어요 🍀"·열면 markAllRead·알림톡✓/앱알림 채널배지·"아직 알림이 없어요" 빈상태) | `.notif-pop` 드롭다운으로 계승. **알림 전용 탭 신설 안 함**(브리프 준수) |
| 하단 탭바 | **배포엔 없음** (v2 가 신규 도입) | — | v3: 홈·친구·초대·마이페이지 4탭 (앱 관계 레이어). 비회원은 회원 전용 탭 = 잠금 뱃지 → 온보딩 |

> 핵심 정정: 배포 셸은 **상단바 + 🔔**(하단탭 없음)이다. 프로토의 4-탭 하단바는 소셜 관계 레이어로 새로 도입한 것이며, 그 위에 배포 🔔 상단바를 그대로 계승해 얹었다.

---

## 1. 화면 전수 인벤토리

범례: 상태 = [배포] 실배포 라우트 계승 / [신규] v2·v3 소셜 신규. 역할축 = 비회원/회원/관리자.

| # | 화면 | 배포 라우트 / 컴포넌트 | 상태 | 프로토 프레임 id | 핵심 요소 · 상태분기 | 계승 근거 (파일:줄) |
|---|---|---|---|---|---|---|
| 1 | 랜딩 | `/` | 배포 | `landing` | 히어로·워드맵 프리뷰·3스텝·시작하기·재로그인 / 비회원 하단탭 잠금 뱃지 → 온보딩 | `app/page.tsx:149-235` |
| 2 | 이용안내 | `/how` | 배포 | `how` | 정적 3스텝(선언·응원·쌓임) | `app/how/page.tsx:24-105` |
| 3 | 온보딩(목표작성) | `/onboarding` + `OnboardingGoalForm.tsx` | 배포 | `onboarding` | write-first 폼(제목·이유·마감)·진행바·저장 시 로그인 승격 / draft 보존·goal_limit 3개 | `(receiver)/onboarding/page.tsx` · `OnboardingGoalForm.tsx:278-432` |
| 4 | 공개목표(친구페이지) | `/g/[slug]` + `GoalCard/CheerCount/Wordmap/OwnerBar/ReportButton/CheerPaymentButton` | 배포 | `goalpublic` | 비로그인 SSR·**인원수만(D-003)**·owner바 비노출(RLS)·게스트 응원/신고·로그인 유도 / owner↔비회원 배타 | `g/[slug]/page.tsx:48-226` (owner바 107-143·CheerCount 105·ReportButton 201-204·CheerPaymentButton 209) |
| 5 | 결제 성공 | `/payment/success` | 배포 | `paysuccess` | Clover 아이콘·"응원이 전달됐어요"·목표 복귀 / success·error(confirm 실패) | `payment/success/page.tsx:78-119` |
| 6 | 결제 실패 | `/payment/fail` | 배포 | `payfail` | CircleAlert·"결제가 멈췄어요"·재시도(환불성) | `payment/fail/page.tsx:18-44` |
| 7 | 홈(내 목표) | `/me` + `MyGoalListCard/GoalEditSheet/MyLinkCard/SplitBalanceCard/CheerList/CheerCount/DdayChip` | 배포 | `home` | 다중목표(진행 3+지난)·클로버 잔액·목표카드 관리/친구뷰/링크·워드맵 CTA·환전 진입 / 잔액 로드실패·목표 0→온보딩 | `(receiver)/me/page.tsx:233-464` |
| 8 | 워드맵 풀뷰 | `/wordmap/[goalId]` + `Wordmap/WordmapShareIcons` | 배포(연결) | `dopamine`(응원하는 사람=적립 오버레이) · **`mywordmap`(owner 읽기뷰, v4 신설)** | get_wordmap 빈도 tier·상위12 / dopamine=비회원·응원자 적립 연출(응원 CTA 有) · mywordmap=owner 읽기(응원 CTA·로그인 유도 無) / empty(응원0)·과다 | `(receiver)/wordmap/[goalId]/page.tsx:15-134` · `Wordmap.tsx:103-178` |
| 9 | 환전 신청 | `/cashout` + `CashoutPageView/CashoutRequestForm` | 배포 | `cashout` | 공제 명세(이용료10%+VAT·원천징수3.3%·실수령)·계좌 폼·게이트(미달/자격/pending) / form·confirm·submitting·done | `(receiver)/cashout/page.tsx` · `CashoutPageView.tsx:49-198` |
| 10 | 환전 진행 상태 | `/cashout/status` + `SplitBalanceCard` | 배포 | `cashstatus` | REQUESTED 3단계/PAID/REJECTED·접수카드·분할잔액 / empty·error·반려(환불성) | `cashout/status/page.tsx:46-371` |
| 11 | **환전 내역** | `/cashout/history` | 배포 | **`cashhistory` (v3 신설)** | 3타일(받은금액·입금완료·진행중)·건별 상태(PAID/REQUESTED/REJECTED+사유)·원천징수 고지 / 빈·오류·반려 | `cashout/history/page.tsx:17-139` |
| 12 | 이용약관 | `/terms` | 배포 | `terms` | 핵심 조문(제7조 이용료10%·환불·환전30개·제7조의3 유효기간5년·제10조 계산식) | `terms/page.tsx` (293줄) |
| 13 | 개인정보처리방침 | `/privacy` | 배포 | `privacy` | 수집항목·결제/환전 암호화·보유기간·위탁6사·안전조치 | `privacy/page.tsx` (318줄) |
| 14 | 아동안전 | `/child-safety` | 배포 | — (누락+사유) | 실배포가 "내용 준비 중" 1줄(감사 P1 미구현) — 계승할 실화면 없음 | `child-safety/page.tsx:1-9` |
| 15 | 관리자 | `/admin` + `CashoutQueue.tsx` | 배포 | `admin` | 회원/클로버 원장(조회)·환전 큐(지급완료/반려) / is_admin 게이트·데스크톱 1440 테이블(프레임=카드형) | `admin/page.tsx:145-265` |
| S1 | 목표 관리 | (receiver)/me/goal/[id] (부여 예정) + `CheerList/SplitBalanceCard/GoalEditSheet` | 신규 | `goaldetail` | **1급=응원자 명단(🍀 N번 응원·시점, D-003 금액·순위 0, 8미리보기→20펼침→검색, 메시지 전문 펼침) + 환전(분할잔액)**, 편집=하단 접힘 / 빈·정상·과다 3상태 | 명단 `me/page.tsx:161-209`·`CheerList.tsx:15-238` / 잔액 `SplitBalanceCard.tsx` / 편집 `GoalEditSheet.tsx` |
| S2 | 마이페이지 | (receiver)/me 셸 통합 (부여 예정) | 신규 | `mypage` | 프로필 요약 + 나의 활동(업적·환전내역 진입) + 환경설정(알림/마케팅 토글·법적 링크) + 계정(로그아웃/탈퇴) · 상단 🔔 | 🔔 `NotificationBadge.tsx` / 환전내역 `me/page.tsx:337-348` / 로그아웃 `ReceiverShell.tsx` / 법적·사업자 `Footer.tsx` |
| S3 | 초대·연결 | (receiver)/invite (부여 예정) | 신규 | `connect` | 카톡 말풍선 미리보기·공유 버튼·초대 성사 카드 / 바이럴 시작점 | friends-invite-v1 계승 (스크래핑 폐기=idea #13) |
| S4 | 친구목록 | (receiver)/friends (부여 예정) | 신규 | `friends` | 친구별 목표·진행바·N번 함께·N주 연속(두 사람만, D-003) / 정상·콜드(0명)·과다 3상태. 내 응원 역할 흡수 | blueprint #18 · D-009(콜드 정직) · D-003 |
| S5 | 소속감 큐 | (receiver)/friends/[friendId] (부여 예정) | 신규 | `belong` | 응원자 전용 근황·타임라인·함께응원 아바타(13명, 금액 0)·부스트 클로버(환전 불가)·재초대 pull | idea 2026-09-15 · 결정 C 대기 |
| S6 | 업적 | (receiver)/me/achievements (부여 예정) | 신규 | `status` | 누적 성취·연속·마일스톤·업적 그리드·다음 업적 진행바·금액랭킹 토글(기본 OFF+경고) / 마이페이지 하위 | idea 2026-09-21 · D-003 · 결정 A/B 대기 |
| S7 | 도파민 순간 | `/wordmap/[goalId]` 응원 오버레이 | 신규(위) | `dopamine` | 응원 클릭 → 워드맵 단어 +1 tier 실시간 성장·비회원 피드백(손실회피) | `Wordmap.tsx` normalizeWords/getSizeTier 계승 |
| X1 | 카카오 로그인 시트 | `/auth/kakao/start` + `LoginSheet.tsx` | 배포(경계) | `login` | 카카오 단일(구글/애플 숨김 보존)·draft 안심 카피·약관/개인정보 링크 | `LoginSheet.tsx:84-256` |

커버리지 요약: 배포 15라우트 = 계승 실프레임 13 · 연결 1(wordmap=도파민 오버레이) · 누락 사유명시 1(child-safety) · 누락 무사유 0. 신규 소셜 7화면 + 경계 1. 권한축 비회원 7·회원 6·관리자 1 전부 커버. 돈축 결제 2·환전 3 전부 커버.

---

## 2. 반응형 메모

이 흐름은 앱 관계 레이어(친구·초대·소속감·업적)라 390×844 네이티브 프레임으로 표현한다(실배포는 Next.js web, globals.css 가 390/1024/1440 반응형 토큰 보유). 데이터-상태 토글(정상/콜드/과다)이 이 기능의 핵심 검증 축이라 viewport 토글 대신 상태 토글을 전면에 둔다. 배포 웹 라우트(홈·공개목표·환전·관리자)의 반응형은 실배포 globals.css·각 page.tsx 의 sm:/lg: 분기가 소유한다(관리자는 1440 테이블 병행).

---

## 3. 엣지/상태 완전성 (브리프 1-a 4축)

- 빈 상태: 친구 0명(friends cold)·응원 0명(goaldetail cold)·환전 내역 0건·알림 0건("아직 알림이 없어요").
- 로딩: 환전 상태 조회 스피너·저장 스피너.
- 에러: 결제 실패·환전 반려(사유+재신청)·잔액 로드 실패(실배포 침묵 금지 계승).
- 과다(오버플로): 친구 과다(긴 이름·긴 목표 2줄 clamp)·응원자 과다(8→20→검색)·워드맵 13+(details)·응원 메시지 전문 펼침.

---

## 4. D-003 준수 (금액·순위 노출 금지)

- 소셜/명단 화면(goaldetail·friends·belong·status 히어로)에 **원화 금액 문자열 0**(헤드리스 실측). 횟수(N번 응원·N번 함께)·시점·연속(N주)만.
- owner 본인 잔액(SplitBalanceCard: 🍀 개수·분할 막대)은 D-003 허용 범위라 goaldetail·cashout·cashstatus 에 표시.
- 금액 순 랭킹은 status 의 기본 OFF 토글 + 켜면 경고 미리보기로만 표면화(제품 기본 노출 아님, 회장 판단용).
</content>
