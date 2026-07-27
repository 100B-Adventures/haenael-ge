# 클라이언트 유틸리티

`supabase/` = DB 클라이언트·타입, `toss/` = 토스페이먼츠 클라이언트, `analytics/` = GA4, `utils/` = 순수 함수.

## 폴더 구조

```
lib/
├── supabase/
│   ├── client.ts          # 브라우저용 Supabase anon 클라이언트 (RLS 적용)
│   ├── server.ts          # 서버 컴포넌트(RSC)/Route Handler용 클라이언트
│   ├── route-handler.ts   # Route Handler 전용 Supabase 클라이언트
│   └── database.types.ts  # supabase gen types 로 자동 생성된 DB 타입
├── toss/
│   └── index.ts           # 토스페이먼츠 결제위젯 초기화 유틸
├── analytics/
│   └── index.ts           # GA4 이벤트 트래킹 헬퍼
├── utils/
│   ├── draft.ts           # localStorage 목표 초안 저장·불러오기
│   ├── format.ts          # 날짜·금액 포맷 유틸
│   └── slug.ts            # 목표 공유 slug 생성
└── utils.ts               # cn() 유틸 (clsx + tailwind-merge)
```

## DB 타입 재생성

```bash
# 로컬 Supabase 실행 중일 때
supabase gen types typescript --local > src/lib/supabase/database.types.ts

# 클라우드 프로젝트 연결 후
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```
