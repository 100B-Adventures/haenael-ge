---
title: DM 아웃바운드 로그
type: log
owner: "@sj"
policy: append-only
updated: 2026-08-28
author: Codex
change: "기존 플레이북이 요구한 누락 로그를 A안 마케팅 허브에 생성"
source: [dm-outbound-playbook.md, dm-pretest-batch.md]
links: ["[[dm-outbound-playbook]]", "[[dm-pretest-batch]]", "[[kpi-runbook]]"]
visibility: private
---

# DM 아웃바운드 로그

새 기록은 최신순으로 위에 추가한다. 본배치와 프리테스트는 첫 줄에 `[MAIN]` 또는 `[PT]`를 표시하고 수치를 합산하지 않는다.

!!! warning "기록 추가 필요"
    아직 확인된 발송 로그가 없다. 실제 발송을 시작하면 [DM 아웃바운드 플레이북](dm-outbound-playbook.md)의 주간 포맷으로 기록한다.
