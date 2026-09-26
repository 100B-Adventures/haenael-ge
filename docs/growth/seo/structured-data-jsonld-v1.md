# 구조화 데이터 JSON-LD 초안 v1

칸 판정: 검색 담당 혼자(사람이 안 읽는 기계용 표기, brand 톤 판단 없음).
**코드에 직접 심지 않았다.** 아래는 개발이 각 페이지 `<head>`에 `<script type="application/ld+json">`로 삽입할 초안이다.

## 1. Organization (전 페이지 공통, 루트 layout에 1회)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "해낼게",
  "alternateName": "haenael-ge",
  "url": "https://haenael-ge.vercel.app",
  "logo": "https://haenael-ge.vercel.app/docs/brand-assets/profile-icon.png",
  "sameAs": [
    "https://www.instagram.com/haenaelge",
    "https://www.threads.net/@haenaelge",
    "https://www.youtube.com/@haenaelge"
  ],
  "slogan": "응원은 돈으로 하는 겁니다",
  "description": "친구가 선언한 목표를 지인들이 클로버로 조용히 응원하고, 목표를 이어가면 그 응원이 실제 돈으로 환전되는 대한민국의 소셜 응원 서비스."
}
```

주의: `sameAs`의 유튜브·스레드 URL은 실제 개설 핸들과 대조해 정확한 URL로 교체할 것(이번 세션에서 확인한 핸들 `@haenaelge` 기준으로 작성했으나 실링크 재확인 필요).

## 2. SoftwareApplication (서비스 소개 페이지)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "해낼게",
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "Web",
  "url": "https://haenael-ge.vercel.app",
  "description": "목표를 선언하면 친구들이 클로버로 응원하고, 누적된 클로버를 실제 원화로 환전할 수 있는 소셜 응원 서비스.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "KRW",
    "description": "이용자 가입과 목표 선언은 무료. 응원 클로버는 응원자가 결제로 적립한다."
  }
}
```

주의: `offers.price`는 가입 기준이다. 클로버 응원은 결제형이므로 과장 없이 "0원 가입 + 별도 응원 결제"로 명시했다. 실제 가격 정책이 바뀌면 이 값도 갱신한다.

## 3. FAQPage (신설 FAQ 페이지 전용)

질문 10개 이상 요건(search-visibility.md §7.1-5) 충족을 위한 초안. 문안은 브랜드 정본(voice-copy-bank.md 금지어·톤 규칙) 준수해 작성했으며, 사실 항목만 넣고 성과 수치는 넣지 않았다(사용자 수·매출 등 미보유 데이터를 지어내지 않음).

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "해낼게는 어떤 서비스인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "해낼게는 친구가 선언한 목표를 지인들이 클로버로 조용히 응원하고, 목표를 이어가면 그 응원이 실제 돈으로 환전되는 서비스입니다."
      }
    },
    {
      "@type": "Question",
      "name": "클로버란 무엇인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "클로버는 응원자가 결제해 적립하는 응원 단위입니다. 선언자는 누적된 클로버를 일정 기준 이상 모으면 환전을 신청할 수 있습니다."
      }
    },
    {
      "@type": "Question",
      "name": "해낼게는 방송 후원(별풍선 등)과 어떻게 다른가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "방송 후원은 불특정 다수 시청자가 스트리머에게 보내는 공개적 후원입니다. 해낼게는 지인(친구) 사이에서 이루어지는 사적이고 조용한 응원으로, 대상과 관계의 성격이 다릅니다."
      }
    },
    {
      "@type": "Question",
      "name": "목표 선언은 누가 볼 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "선언은 선언자가 초대하거나 공개 범위를 설정한 대상에게 노출됩니다. 응원 금액은 공개하지 않고 조용히 처리됩니다."
      }
    },
    {
      "@type": "Question",
      "name": "받은 클로버는 언제 환전할 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "누적 클로버가 서비스가 정한 최소 기준(현재 30클로버)에 도달하면 지급 가능 범위 내에서 환전을 신청할 수 있습니다."
      }
    },
    {
      "@type": "Question",
      "name": "환전 시 세금이 공제되나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "환전액에서 서비스 이용료와 부가가치세를 먼저 차감하고, 남은 금액을 기준으로 사업소득 원천징수를 공제합니다. 정확한 세무 처리 방식은 서비스 이용약관을 따릅니다."
      }
    },
    {
      "@type": "Question",
      "name": "목표를 달성하지 못하면 응원금을 돌려줘야 하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "아닙니다. 해낼게는 달성 결과에 대한 조건부 보상이 아니라, 목표를 향해 가는 과정 자체를 응원하는 즉시 적립형 서비스입니다."
      }
    },
    {
      "@type": "Question",
      "name": "해낼게는 누구나 이용할 수 있나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "대한민국 내 이용자를 대상으로 하며, 가입과 목표 선언 자체는 무료입니다."
      }
    },
    {
      "@type": "Question",
      "name": "응원은 어떻게 결제하나요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "응원자는 원하는 만큼 결제해 클로버를 적립하고, 이를 선언자의 목표에 응원으로 보냅니다."
      }
    },
    {
      "@type": "Question",
      "name": "해낼게라는 이름은 무슨 뜻인가요?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "\"나 ○○ 해낼게\"라는 선언 문장에서 따온 이름입니다. 목표를 소리 내어 선언하는 행위 자체를 서비스의 출발점으로 삼았습니다."
      }
    }
  ]
}
```

## 4. 마감 체크

- [x] Organization·SoftwareApplication·FAQPage 3종 초안 완성
- [x] 수치 항목은 실제 계약(30클로버 기준·10%+부가세+원천징수)만 사용, 지어낸 성과 수치 없음
- [x] sameAs 링크는 확인 필요 항목으로 명시(미검증)
- [ ] 실제 페이지 HTML 삽입은 개발 담당. 이 파일은 초안이며 삽입 여부는 별도 확인 필요(미검증)

---

## 문서 스탬프

생성: 2026-09-27 01:24 KST | model: claude-sonnet-5 | agent: search-visibility-specialist | skills: 없음
근거: schema.org Organization/SoftwareApplication/FAQPage 표준 스펙(모델 지식) · docs/plan/one-thing.md(30클로버 기준) · wiki/거버넌스/결정.md D-014(수수료 구조) · wiki/1-team-brand/voice-copy-bank.md(금지어·톤)
고민: FAQ 답변에 사용자 수·성과 수치를 넣지 않았다. 헌법 §1 "없는 실적·수치를 만들지 않는다"를 지키기 위해 사실 계약(약관·정책)만 답변 재료로 썼다.
