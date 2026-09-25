🏷 STAMP | line: core | 생성: 2026-09-25 16:04 KST | model: claude-sonnet-5 | agent: store-visual-producer
skills: design-html(HTML/CSS 합성)
근거: 기존 youtube-banner.png(D-005 정본, 슬로건 노출 확정) 텍스트 레이아웃·안전영역 좌표를 그대로 계승(좌측 정렬, 안전박스 507..2053 x 509..931), photo-bank/bg-dawn-desk.png 추가로 사진 통합감 보강
안전영역 계산: YouTube 표준 1546x423 중앙 박스 = x(1280±773)=507~2053, y(720±211)=509~931. 콘텐츠(.safe div)가 정확히 이 좌표에 위치 — 좌표 실측(devtools 스타일 계산), 모바일 크롭 시각 확인은 미검증(회장 업로드 후 studio.youtube.com 미리보기 확인 권장)
고민: 기존 배너를 완전 대체할지 v2로 병행할지 — 기존은 플랫(사진 없음), v2는 사진 추가로 질감 개선. 기존 슬로건·문구·배치 유지해 회장이 A/B 비교 가능하도록 v2로 명명.
