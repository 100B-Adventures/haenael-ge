🏷 STAMP | line: haenael-ge | 생성: 2026-07-20 23:45 KST | model: claude-sonnet-5 | agent: store-visual-producer
skills: design-html(HTML/CSS+gstack browse 헤드리스 렌더, 클로버 라인아이콘만 인라인 SVG 예외 §0-1) | 근거: DESIGN.md §3 토큰 상속 · wiki/brand/channel-identity-kit.md §4 v2 계획 · wiki/brand/design-benchmark-bank.md §1(R2 BMC supporter wall·R7 Linktree·R8 공스타 문법) · wiki/decisions.md D-009
고민: 카드4 "0원이었다" 초안이 D-009 안전선①(금액 절대 미노출) 위반 소지로 자체 반려 → "없었다"로 교정(상세는 채팅 보고 및 channel-identity-kit.md §4 정합 검증)
근거 URL: 인스타 4:5 그리드 전환 · 하이라이트 커버 트렌드 근거는 wiki/brand/visual-guidelines.md §5-1(2026-07-12 실조사, 본 배치는 그 결론을 상속해 4:5 채택)
파일명 규격 예외: docs/brand-assets/ 하위는 wiki 정본 자산 폴더로 취급(design-benchmark-bank.md 선례) — artifact-stamp.md §1의 <라인>-<이름>-v<N>-<모델> 규격은 prototypes/ 출고물 대상, 본 폴더 기존 10여 파일도 동일 예외 적용 중.

--- 갱신 2026-07-21 (design-benchmark-bank.md R10 대조 후 타깃 수정) ---
갱신: footer 워드마크를 "아이콘+텍스트"→"아이콘만"으로 축소(PIN 카드 1·5·9는 텍스트 유지). 근거: postquick.ai "로고 워터마크를 모든 게시물에 넣지 않기" 원칙(design-benchmark-bank.md R10). 헤드라인·레이아웃·카피는 변경 없음(스코프 좁게 지시 준수).
근거 URL: https://www.postquick.ai/blog/how-to-plan-your-instagram-grid-for-a-brand-templates-examples

--- 갱신 2026-07-21b (회장 지시: "핀은 상단에 3개만 걸 수 있어, 다시 생각해봐" — 전면 재설계) ---
갱신: 프리뷰를 **"의도한 배치"가 아니라 "인스타가 실제로 렌더링할 최종 그리드"**로 재정의해 재생성. 구 PIN(1·5·9, 좌상·정중앙·우하 대각선)은 인스타 핀 기능이 항상 핀 3개를 그리드 최상단 1행(위치 1·2·3)으로 강제 이동시키는 동작과 물리적으로 충돌 — 핀을 걸면 대각선 구도 자체가 성립 불가능함을 WebSearch 3회로 확인 후 폐기.
신규 PIN 3칸 = 01(매니페스토·후킹) · 02(캐러셀커버·개념설명) · 08(사용법3스텝·실행방법) — "Introduction→Connection→Action" 프레임(2026 벤치마크 표준, 하단 출처)과 정합. 05(클로버 정의)·09(시작선언)는 비핀으로 전환해 위치 6·9(2·3행)에서 각각 "브랜드 어휘 앵커"·"클로징 자기선언" 역할로 재배치.
그리드 재배열: 1행(PIN)=[01,02,08] · 2행=[03,06,05](사회적 증거 2종+어휘 앵커) · 3행=[04,07,09](정서 후킹 2종+클로징). 업로드 순서·핀 지정 순서는 프리뷰 하단 범례에 명시(운영 실행 가능하게).
소스: docs/brand-assets/feed/_src/feed-preview-template.html(신규, 상대경로 img src — gstack browse 샌드박스가 파일 루트 밖 상대 이미지 로드를 차단해 실제 렌더 시엔 base64 인라인판을 스크래치패드에서 1회성 생성해 렌더 후 폐기; 소스 html 자체는 유지보수용으로 상대경로 유지, 재렌더 시 base64 인라인 필요).
힉스필드 신규 생성 불요 판단: 9장 배경·카피·비주얼 내용은 100% 유지(회장 지시 "핀/배열만 고친다" 범위 준수), 재배치는 기존 PNG 재사용+footer 텍스트 위치만 4장 재렌더로 충분.
근거 URL(WebSearch 2026-07-21): https://techcrunch.com/2022/06/07/instagram-pin-posts-to-your-profile/ (핀 최대 3개, 그리드 최상단 고정, 최근 핀=최좌측) · https://minter.io/blog/6-of-the-greatest-posts-to-pin-on-instagram/ (Introduction/Connection/Action 프레임) · https://thisisco.com.au/podcast/3-must-have-pinned-posts/ (콜드 방문자는 프로필 방문 2~3초 내 핀 3개만 보고 이탈/팔로우 결정) · https://futuresocial.beehiiv.com/p/what-instagram-s-new-reorder-grid-feature-means-for-brands (Reorder Grid 공식화, 기존 R10 승계)
