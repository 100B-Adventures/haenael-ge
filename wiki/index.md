---
title: 해낼게 위키
type: overview
owner: "@sj"
policy: living
updated: 2026-08-28
author: Codex
change: "A안 6축 구조로 통일하고 코드·산출물·운영 실측을 반영"
source: [../pipeline-state.core.md, ../session-state.core.md, ../docs/제품현황.md, ../RELEASE.md]
links: ["[[0-meta/_index]]", "[[1-team-brand/_index]]", "[[2-product/_index]]", "[[3-operations/_index]]", "[[4-reference/_index]]", "[[5-hubs/_index]]"]
visibility: private
---

# 해낼게 위키

친구가 선언한 목표에 클로버로 조용히 응원하고, 목표 주인이 모인 클로버를 환전하는 서비스의 팀 위키다.

## 현재 한 줄 상태

기획·디자인·기술설계·개발·QA는 승인됐고 배포 단계가 진행 중이다. 최신 main 배포는 1.2.0이지만 운영 대표 주소는 1.0.0을 가리킨다. 총 30개 중 지급 가능 27개를 신청하게 하는 마이그레이션도 운영 DB에 아직 적용되지 않았다. 자세한 근거는 [제품 현재 상태](2-product/current-state.md)에서 본다.

## 6축 지도

| 축 | 무엇을 찾는 곳 | 시작 |
|---|---|---|
| 0 · 메타 | 위키 구조, 정책, 이동 원칙 | [메타 목차](0-meta/_index.md) |
| 1 · 팀·브랜드 | 포지셔닝, 스토리, 보이스, 채널 정체성 | [팀·브랜드 목차](1-team-brand/_index.md) |
| 2 · 제품 | 현재 기능, 승인 산출물, 출시 상태 | [제품 목차](2-product/_index.md) |
| 3 · 운영 | 결정, 런북, 미결, 사고와 교훈 | [운영 목차](3-operations/_index.md) |
| 4 · 레퍼런스 | 공통 벤치마크와 참고자료 | [레퍼런스 목차](4-reference/_index.md) |
| 5 · 직무 허브 | PM·개발·디자인·마케팅·온보딩 입구 | [직무 허브 목차](5-hubs/_index.md) |

## 정본 경계

- 제품 코드와 실제 기능: `web/src/`, `supabase/`
- 단계와 승인 산출물: `pipeline-state.core.md`
- 가장 최근 인계 상태: `session-state.core.md` 최상단
- 기획·설계·QA 증거: `docs/`, `DESIGN.md`, `RELEASE.md`, `CHANGELOG.md`
- 장기 사업 지식과 운영 맥락: 이 `wiki/`

위키와 코드가 어긋나면 코드·승인 산출물·직접 관찰 증거를 먼저 확인하고, 위키를 최신화한다. 과거 사고 기록은 지우지 않고 현재 상태 문서에서 대체 여부를 명시한다.
