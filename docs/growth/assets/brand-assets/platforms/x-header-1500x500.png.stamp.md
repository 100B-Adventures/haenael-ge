🏷 STAMP | line: core | 생성: 2026-09-25 16:12 KST (v2, 안전영역 결함 수정) | model: claude-sonnet-5 | agent: store-visual-producer
skills: design-html(HTML/CSS 합성)
근거: D-006 프로필 아이콘 실경로 상속 · photo-bank/bg-golden-hour.png 합성 · DESIGN.md/globals.css 토큰 실측 대조(platform-spec.md §토큰 대조 참조)
소스 URL: https://influencermarketinghub.com/twitter-image-size/ (X 프로필 원 ~200px 지름, 좌하단 걸침 실측)
v2 수정: 컨트롤러 반려(2026-09-25) — 좌하단 프로필 원(~200px 지름) + 좌하단 20% 가이드 영역과 텍스트가 겹칠 위험 지적. 콘텐츠 블록을 상단(top:32px, 마크 44px·슬로건 26px·워드마크 46px·설명 19px로 축소)으로 이동해 텍스트 하단이 y≈225에서 끝나도록 재배치. 프로필 원 상단(y≈265부터 겹침 시작)과 100px 이상 여유 확보. 검증용 오버레이 = x-header-safearea-check.png.
고민: 슬로건 노출 여부는 기존 [실험] 판정 유지(회장 지시로 확정 유지).
