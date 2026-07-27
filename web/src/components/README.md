# UI 컴포넌트

`goal/` = 목표 관련, `auth/` = 로그인, `common/` = 공통 재사용, `receiver/` = 목표 주인공(받는 사람) 화면, `ui/` = shadcn 공통 primitives.

## 폴더 구조

```
components/
├── goal/          # 목표·응원 관련 컴포넌트
│   ├── GoalCard.tsx          # 목표 카드 (친구 페이지 핵심)
│   ├── CheerCount.tsx        # 응원 금액·건수 표시
│   ├── DdayChip.tsx          # D-day·상태 칩
│   ├── ShareLinkCard.tsx     # 공유 링크 카드
│   ├── Wordmap.tsx           # 응원 메시지 워드맵 (read-model)
│   └── WordmapShareIcons.tsx # 워드맵 공유 버튼 (카카오/링크)
├── auth/          # 인증 관련
│   └── LoginSheet.tsx        # write-first 온보딩: 저장 시점 로그인 바텀시트
├── common/        # 도메인 무관 공통 컴포넌트
│   ├── NotificationBadge.tsx # 인앱 알림 배지
│   └── ReportButton.tsx      # 신고 버튼 + 신고 사유 시트
├── receiver/      # 목표 주인공(받는 사람) 전용 화면 컴포넌트
│   └── OnboardingGoalForm.tsx # write-first 목표 작성 폼
└── ui/            # shadcn 기반 공통 primitives
    └── button.tsx
```

## 컨벤션

- DESIGN.md 토큰(색상·간격·타이포)을 인라인 style로 직접 참조 (Tailwind 커스텀 토큰 병행).
- 금액은 어떤 컴포넌트에도 직접 노출하지 않는다 (DESIGN.md 정책).
- 서버 컴포넌트 우선 — `"use client"` 는 상태/이벤트가 필요한 경우만.
