# session-state.growth.md — 해낼게 그로스 레인 핸드오프 (최신순)
## 2026-09-22 00:56 KST — GA4 우리 계정 개설 완료, DM 30명 명단 수집·문안 v2 진행 중, 하이재킹 원인 수정
- 회장: ①GA4 알아서 가입(계정 우리 것) ②30명 DM? 최근 DM 문안 참고 ③왜 타 사업체가 우리 포트 크롬에 산출물 띄우나 ④"크롬 포커스 두어서 작업 방해" 질책.
- ④ 원인 = cdp.mjs 가 /json/activate 호출. 제거하고 창 자체를 없앰: 9334 를 실제 크롬 **headless** 로 재기동(scratchpad/serve-headless.mjs, 세션 쿠키 유지 확인). 피드백 나쁨·실수원장 [focus-steal].
- ③ 원인 = show-artifact.sh 격리 포트 목록 하드코딩(9222·9333·9444·9555)에 9334 없음 → AppleScript 가 우리 인스턴스에 탭 생성. 실행 중 --remote-debugging-port + ports.tsv 실측으로 수정(~/.claude ab98558). 부수: 타 세션 탭이 우리 탭을 백그라운드로 밀어 JS 동결 → cdp.mjs 가 file://·localhost 탭을 닫고 hijack.log 기록.
- ① GA4: haenaelge.official 로 계정 haenael-ge / 속성 haenael-ge web(KST·KRW·온라인커뮤니티·소규모) / 웹 스트림 15818608034 / 측정 ID G-VMNWLHHE32 생성(약관 대한민국 동의). 운영 env 교체+재배포는 open-decisions 등록(회장 승인).
- ② DM: 문안 v2 content-growth-marketer 위임 중(자기비하 삭제, 컨시어지 C안). 후보 명단: ig-scrape.mjs 가 해시태그 5개(공시생·편입·공스타그램·수능디데이·자격증공부) 게시물 작성자·댓글수 수집 중 → scratchpad/ig-candidates.json (38+ 계정).
- 다음에 칠 명령: 스크레이프 DONE 후 댓글수·최근성으로 30명 추려 `docs/growth/campaigns/2026-09/03-개통.md` 부속 명단으로 저장(핸들만, 개인정보 최소) → DM v2 verify → 렌더 1개 띄움 → 통합 보고.
- 검증: GA4 화면 캡처 관찰됨(/tmp/gh17.png), 9334 headless /json/version 관찰됨, show-artifact 포트 실측 출력에 9334 포함 관찰됨. 미검증: 운영 GA 전환(승인 전), 명단 품질(수집 중).

## 2026-09-21 21:16 KST — SNS 세팅 실행: Threads 프로필 완료, 인스타 링크는 앱 전용
- 회장 "할거진행해". 9334 크롬에 인스타·스레드 sessionid 확인(회장 로그인 완료).
- 검증: 스레드 프로필 캡처 관찰됨, 인스타 링크 실값 관찰됨, 커밋 31e51de main CI success 관찰됨. GA4 수신은 미검증. 다음에 칠 명령: 회장 "바꿔" 시 01 카드 F 추가 위임 → 02 재작성 → 03-개통.md 에 이 턴 실측값 옮김.
- Playwright connectOverCDP 가 omnibox browser_ui 타깃에 걸려 attach 타임아웃 → 얇은 CDP 클라이언트(scratchpad/cdp.mjs: /json/list → 탭 ws 직결, 백그라운드 탭은 /json/activate 후 evaluate)로 우회. element.click() 은 React 무시라 Input.dispatchMouseEvent 로 실클릭.
- Threads @haenaelge: 소개 3줄(bio-ready.md 스레드 바이오, em dash → 마침표), 링크 `https://haenael-ge.vercel.app/?utm_source=threads&utm_medium=bio&utm_campaign=haenael-profile` 제목 "해낼게. 선언은 여기서". 프로필 페이지 실측 캡처 docs/growth/assets/threads-profile-2026-09-21.png. 남은 것: 게시물 0.
- 인스타 @haenaelge: 바이오 링크는 이미 `?utm_source=instagram&utm_medium=bio`(IG 가 utm_content=link_in_bio 자동 부가). utm_campaign 추가는 웹 편집 화면이 "링크 수정은 모바일에서만 가능" → 회장 앱에서만 가능(선택 사항, source/medium 만으로 GA4 분리됨).
- GA4 Realtime 확인 실패: 9334 프로필의 구글 계정이 속성 p545972102 소유자가 아님(환영 화면). 회장 계정에서 확인하거나 haenalge.official 에 뷰어 권한 부여 필요. 태그 방문 1회는 제가 발생시킴(threads/bio).
- 하이재킹 재발: haejo-danta 세션 산출물 file:// 탭이 9334 에 열림(show-artifact AppleScript). 닫았음. 하네스 백로그 유지.
- growth.declaration.yaml threads live·태그 기록, channels.md 갱신. 커밋 예정(main 직행).
- 다음: 02 지목 교체 승인 시 03-개통.md 작성(이 턴 실측값을 그대로 옮기면 됨) → 30명 명단.

## 2026-09-21 17:20 KST — CfT 철회, 실제 크롬 포트 격리로 재기동(9334). 회장 질책 3건 답변
- 회장: 왜 CfT 고집? (09-18 OSMU 에서 CfT 구글 로그인 안 돼 실제 크롬 포트 격리로 결정한 기록 있음) / 탭1개 = 프로세스1개 리소스? / 켰다 껐다 하면 매번 로그인?
- 수습: 하네스에 복사한 중복 런처 sns-browser.mjs 삭제(6cbff67). 정문 = social-browser.mjs(SOCIAL_PROFILE+CDP_PORT+BROWSER_EXE, 다른 pane 이 07:29 serve·유휴종료 추가). CfT 로 만든 haenael-ge 프로필 삭제 후 실제 크롬 153 으로 `SOCIAL_PROFILE=haenael-ge CDP_PORT=9334 BROWSER_EXE=/Applications/Google Chrome.app/... serve` 기동, /json/version Chrome/153 관찰됨. ports.tsv haenael-ge 9334.
- 실측: 인스턴스 1탭 743MB, 2탭 932, 3탭 1094 → 인스턴스 기본 ≈ 550~600MB, 탭 1개 ≈ 160~190MB. OSMU admin 26탭 2.77GB. 실수원장 [adr-unread], 피드백 나쁨 적립.
- 로그인 지속: 인스타 sessionid 쿠키·구글 SID 계열은 디스크 프로필에 남아 재기동해도 유지. 재로그인 조건 = 장기 미사용(수십 일)·비번 변경·계정 보안 경고·프로필을 다른 메이저 버전(CfT 151) 으로 열기. 실크롬 153 고정으로 간다.
- 남은 리스크: show-artifact.sh AppleScript 가 같은 번들의 자동화 크롬을 잡을 수 있음(09-18 사고). 하네스 백로그.
- 다음: 회장 로그인 → attach 로 sessionid 확인 → Threads 연동 → 바이오 utm 링크.

## 2026-09-21 07:32 KST — 해낼게 전용 격리 크롬(CDP 9334) 상주 시작, 회장 로그인 대기
- 회장 질문: 해낼게도 크롬 포트 하나 격리해 SNS 로그인 저장·자동화 관리? 포트 여러 개 띄우면 리소스 걱정, 더 좋은 방법?
- 실물: 이미 OSMU 가 9555(admin, 26탭)·9444(member, 20탭) 상주, haejo-danta 는 9333(지금 DOWN). 정본 런처 = haejo-danta/scripts/sns-browser.mjs → `~/.claude/harness/bin/sns-browser.mjs` 로 승격(커밋 2aa4d9c, SNS_VENTURE 필수). 예전 `social-browser.mjs`(~/.claude/.social-profile) 로 띄운 로그인 창은 종료(프로필 비어 있었음, 회장 로그인 안 한 상태).
- 지금: `SNS_VENTURE=haenael-ge … serve https://www.instagram.com/accounts/login/` 상주 중. 포트 9334, 프로필 ~/.sj-agent-harness/browser-profiles/haenael-ge. status ALIVE 1탭 관찰됨.
- 리소스 답: 프로세스 수가 아니라 탭 수가 메모리다(OSMU 46탭). 해낼게는 상주 대신 필요할 때 serve→작업→닫기(세션은 디스크 프로필에 남음), 자동화만 할 때는 SNS_HEADLESS=1.
- 다음에 칠 명령: 회장 로그인 후 `SNS_VENTURE=haenael-ge node ~/.claude/harness/bin/sns-browser.mjs attach` 로 세션 확인 → threads.com 탭 열어 IG 연동 → 바이오 utm 링크 교체.

## 2026-09-17 02:30 KST — SNS 세팅 착수: Playwright 영구 프로필 로그인 창 띄움
- 회장 질문: 뭐부터? SNS 세팅부터? Claude in Chrome 말고 Playwright 프로필에 계정 저장해 쓸 수 없나(안 되면 aside 브라우저).
- 답: 된다. 하네스에 이미 `~/.claude/harness/bin/social-browser.mjs`(launchPersistentContext, 프로필 `~/.claude/.social-profile`, 실제 크롬 채널)가 있었다(미추적 상태 → 커밋 23d6d5e, 프로필 gitignore, 로그인 판정 sessionid 쿠키 기준으로 수정). check 실측: 인스타·스레드 모두 loggedIn=false(프로필 비어 있음).
- 현재: `login https://www.instagram.com/accounts/login/` 헤디드 창 열어둠(백그라운드). 회장이 로그인 후 창 닫으면 세션 저장. Threads 는 같은 Meta 로그인이라 인스타 세션으로 threads.com 진입 시 "Instagram 으로 계속" 1클릭.
- 순서 확정(제안): ①프로필 로그인 1회(회장) → ②check 로 loggedIn=true 실측 → ③SNS 세팅: 인스타 바이오 링크 utm 교체, Threads 개설(IG 연동), 회장 본인 선언 페이지 링크 → ④30명 명단·DM(지목 교체 승인 대기 중).
- 다음에 칠 명령: `node ~/.claude/harness/bin/social-browser.mjs check https://www.instagram.com/` → loggedIn:true 면 `open https://www.threads.com/` 로 Threads 연동 → 이후 Playwright 스크립트로 바이오 링크 교체(회장 캡처로 확인).
- 검증: check 출력 JSON 관찰됨. 로그인 창 프로세스 살아 있음(pgrep).

## 2026-09-16 07:55 KST — 회장 질책(제로원 혼입) 수습 + 지목 교체 제안(손 초대 30명)
- 무엇을 어디까지: 회장 "웬 제로원이야… 어떻게 유저들 모을지나 고민해". 원인 ①md-to-web.sh 가 /tmp/zeroone-web-* 하드코딩 → 레포명 기반으로 수정·커밋(~/.claude cd63876) ②보고에 제로원 사고 인용 → 금지. 피드백 나쁨 적립, 실수원장 기록. 채팅에 추천안 제시: 회장 본인 선언 + 공스타그램 댓글 활발 계정 30명 손 초대(선언 페이지 대신 만들어 DM) + Threads F3 댓글 선참여자 명단화 + 응원자 카피 "기프티콘 대신" + 수능 D-60 캘린더. 반증: DM 30통에 활성 2명 미만.
- 남은 이슈·블로커: 회장의 지목 교체 승인("바꿔") 대기. 02-우선순위는 아직 "계측 개통" 지목 초안 상태(draft). 미검증: 타인 계정용 선언 페이지 대리 생성 가능 여부(코드 확인 필요), 수능 날짜.
- 다음에 칠 명령: 승인 오면 ①01-전략에 가설 F(손 초대 30명) 카드 추가(growth-analyst 위임) ②02 재작성, 지목=F, A(계측)는 개통 칸 준비항목으로 ③03 개통: 30명 후보 명단·DM 문안(content-growth-marketer)·utm 링크 실문자열 ④main 직행 커밋. 승인 전이라도 할 수 있는 것: `web/src` 에서 목표 생성 API 가 관리자 대리 생성을 허용하는지 확인.
- 검증: 렌더 파일명 /tmp/md-web-haenael-ge-02-우선순위.html 관찰됨. 추천안은 아이데이션(문서 미박제).

## 2026-09-16 03:50 KST — 02-우선순위 초안 완료, 회장 확인 대기. main 커밋 0612ce4 푸시·CI success
- 무엇을 어디까지: 01 fixed / 02 draft(지목 = 가설 A 계측 개통 단독, verify PASS, gate-stamp 박제). decisions.md 1줄. open-decisions.md 맨 위에 결정 2건 등록(지목 확인 · member 표 유입 3칸). 렌더본 /tmp/zeroone-web-02-우선순위.html 회장께 열어둠.
- 남은 이슈·블로커: 회장 확인 1회(결정 1). member 스키마(결정 2, 비가역). 제품 PR #2 OPEN.
- 다음에 칠 명령: 회장 확인 오면 02 frontmatter `status: chairman-confirmed`·`chairman_confirmed_at` 기입 → growth-state.2026-09.md chairman_confirms.priority·approved_cells 갱신 → `cp ~/.claude/standards/templates/doc-template-growth-03-개통.md docs/growth/campaigns/2026-09/` → growth-analyst 위임(tag-spec 실문자열·GA4 내부트래픽 규칙·인스타 프로필 링크 실값 실측) → main 직행 커밋.
- 검증: 커밋 0612ce4 origin/main 관찰됨, CI 35009625784 success 관찰됨. 02 내용 §2 직접 읽음.

## 2026-09-16 03:12 KST — 01-전략 닫음(fixed), 02-우선순위 위임 중
- 무엇을 어디까지: 01-전략 verify PASS·가설 5장 반증 조건 확인·gate-stamp 박제·status fixed. growth-state.2026-09.md current_cell=priority, approved_cells=[strategy]. 02-우선순위 growth-analyst 위임 발주(회수 전).
- 부수 보정: growth.declaration.yaml ga4 not_adopted→live(2026-07-17 Realtime 실수신 근거), 디스커버리 v1.1.0 에 마케팅 시점 post 한 줄 추가.
- 남은 이슈: member 표 첫 유입 3칸(비가역, 회장 결정) · 인스타 프로필 링크 실값 미확인(03 개통에서 실측) · 제품 PR #2 OPEN(회장 머지).
- 다음에 칠 명령: 위임 회수 후 `verify-agent-quality.sh <output> growth-analyst` → 01·02 를 `open-md-web.sh` 로 렌더 → `show-artifact.sh` 로 띄움 → 회장 지목 확인 1회 → 확인되면 02 status chairman-confirmed, decisions.md 1줄, growth 커밋(main 직행) → 03 개통.
- 검증: 01 내용 grep 관찰됨. 02 는 미검증(회수 전).

## 2026-09-16 02:52 KST — 01-전략 위임 중, 하네스 드리프트 1건 수정
- 무엇을 어디까지: 사전 점검 8종 실행. 해낼게 고유 결함(campaigns 폴더·decisions·growth-state·session-state.growth 없음) 골격 생성. `01-전략.md` growth-analyst 위임 발주(진행 중, 회수 전).
- 하네스 수정: `growth-agency-wiring-check.sh` 가 개명 전 서식명(growth-campaign-04)을 봐서 거짓 ✗. `doc-template-growth-04-발주.md` 로 고치고 consumers.tsv 등록, ~/.claude 커밋 2055261 + 후속 1건. 검사 통과 관찰됨.
- 블로커: 없음. 참고로 제품 PR #2(링크 공유 카드 이미지) 아직 OPEN, 운영 title 구제목. 회장 머지 대기(§2.1).
- main CI 런 35003030027(다른 pane 푸시) success 관찰됨.
- 다음에 칠 명령: 위임 회수 후 `bash ~/.claude/harness/bin/verify-agent-quality.sh <output> growth-analyst` → 통과면 `01-전략.md` status 검토 → 02-우선순위 위임 → 회장 확인 1회.
- 검증: 골격 파일 ls 관찰됨. 전략 내용은 미검증(회수 전).


## 2026-09-16 — 2026-09 스프린트 첫 바퀴 착수
- 회장 지시: "해낼게 마케팅레인 시작".
- 사전 점검 8종 실행. 해낼게 고유 결함: `docs/growth/campaigns/` 없음, `decisions.md`·`growth-state`·`session-state.growth` 없음 → 이 턴에 골격 생성.
- 계측 실태: growth.declaration.yaml stage=prelaunch, 수집기 없음, GA4 미도입, 프로필 링크 출처 표시 없음. 따라서 첫 바퀴 가설은 계측 개통을 겨냥한다(§7.7).
- 앞선 마케팅 준비물: 인스타 @haenaelge 세팅 완료(피드 9장·하이라이트 6개), DM 콜드오픈 문안(wiki/5-hubs/hub-mkt/haenael-ge-dm-coldopen-retake-v1-opus5.md), 유입 전략(…post-dm-inflow-strategy-v1-opus5.md: Threads 1순위 주4편·Reels 2순위 주1편, 4주 게이트).
- 01-전략: growth-analyst 위임.
