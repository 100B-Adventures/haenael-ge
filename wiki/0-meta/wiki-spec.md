---
title: 해낼게 위키 적용 규약
type: principle
owner: "@sj"
policy: protected
updated: 2026-08-28
author: Codex
change: "D-EDU 위키 스펙의 A안 구조를 해낼게에 적용"
source: [../../../d-edu/wiki/0-meta/wiki-spec.md]
links: ["[[_index]]", "[[../index]]"]
visibility: private
---

# 해낼게 위키 적용 규약

이 위키는 D-EDU의 `wiki/0-meta/wiki-spec.md`를 구조 정본으로 사용한다. 해낼게에서는 아래 규칙을 고정한다.

## 구조

1. `0-meta`: 위키 자체의 정책과 지도
2. `1-team-brand`: 정체성, 포지셔닝, 스토리, 보이스
3. `2-product`: 고객과 제품의 현재 상태
4. `3-operations`: 결정, 실행 방식, 런북, 사고, 미결
5. `4-reference`: 공통 참고자료와 벤치마크
6. `5-hubs`: PM, 개발, 디자인, 마케팅, 온보딩의 역할별 입구

모든 카테고리는 `_index.md`를 갖는다. `_index.md`는 목적과 경계, 하위 지도, 시작 문서, 오너·갱신일, 관련 카테고리를 30초 안에 파악하게 한다. 직무 허브에는 R&R과 사고방식을 추가한다.

## 정본과 갱신

- 코드·웹 동작은 `web/src/`와 `supabase/`가 정본이다.
- 승인 상태와 산출물 핀은 `pipeline-state.core.md`가 정본이다.
- 최근 작업 상태는 `session-state.core.md` 최상단이 정본이다.
- 장기 해석과 운영 지식은 wiki가 맡는다.
- 직접 관찰하지 않은 운영 상태는 `미검증` 또는 `마지막 관찰`로 쓴다.
- 과거 사고·결정 기록은 삭제하지 않는다. 현재와 다르면 대체 안내를 상단에 둔다.

## 링크와 중복

- 한 사실은 한 문서에 두고 다른 문서는 링크한다.
- 이동할 때 모든 상대 링크를 새 위치 기준으로 바꾼다.
- 존재하지 않는 문서를 가리키는 링크를 남기지 않는다.
- 제품 문서를 wiki로 복제하지 않고, [제품 현재 상태](../2-product/current-state.md)에서 최신 사실과 원문 경로를 함께 연결한다.
