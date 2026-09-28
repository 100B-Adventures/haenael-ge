export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://haenael-ge.vercel.app";

export const VERIFIED_SOCIAL_PROFILES = [
  "https://instagram.com/haenaelge",
  "https://threads.com/@haenaelge",
  "https://youtube.com/@haenaelge",
  "https://x.com/haenaelge",
  "https://tiktok.com/@haenaelge",
] as const;

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: "해낼게는 어떤 서비스인가요?",
    answer:
      "이루고 싶은 목표를 선언하고 링크를 친구에게 나누는 소셜 응원 서비스예요. 친구가 남긴 응원은 워드맵에 쌓이고, 선언한 사람의 기록으로 남아요.",
  },
  {
    question: "클로버는 무엇인가요?",
    answer:
      "친구가 목표에 남기는 응원의 단위예요. 현재 공개 운영에서는 유료 결제 수단이 아니라, 목표를 응원하는 마음을 표현하는 서비스 단위로 사용해요.",
  },
  {
    question: "라이브 방송 후원과 무엇이 다른가요?",
    answer:
      "불특정 다수를 대상으로 방송하는 방식이 아니라, 공유받은 목표 링크에서 가까운 사람이 조용히 응원하는 관계 중심 서비스예요.",
  },
  {
    question: "내 목표는 누가 볼 수 있나요?",
    answer:
      "목표 링크를 아는 사람이 볼 수 있어요. 링크로 공유되는 내용을 확인한 뒤 믿을 수 있는 사람에게 전달해 주세요.",
  },
  {
    question: "클로버는 언제 환전할 수 있나요?",
    answer:
      "현재 공개 운영에서는 환전 기능을 제공하지 않아요. 기능을 열게 되면 이용 조건과 수수료, 필요한 안내를 먼저 공지할게요.",
  },
  {
    question: "환전할 때 세금이 붙나요?",
    answer:
      "현재 환전 기능을 운영하지 않아 적용되는 세금이나 원천징수 절차가 없어요. 향후 기능을 열기 전 관련 기준을 확인해 별도로 안내할게요.",
  },
  {
    question: "목표를 달성하지 못하면 응원금을 돌려줘야 하나요?",
    answer:
      "현재 공개 운영에서는 유료 응원 결제와 환전을 제공하지 않아 돌려줘야 할 응원금이 없어요. 목표를 달성하지 못해도 친구가 남긴 응원과 워드맵은 과정의 기록으로 남아요.",
  },
  {
    question: "누가 이용할 수 있나요?",
    answer:
      "한국어로 목표를 선언하고 링크를 공유하려는 사람이라면 시작할 수 있어요. 가입과 일부 기능 이용에는 카카오 로그인이 필요해요.",
  },
  {
    question: "친구는 어떻게 응원하나요?",
    answer:
      "공유받은 목표 링크에서 목표와 워드맵을 확인할 수 있어요. 현재 공개 운영에서는 유료 응원 결제를 열지 않았으므로, 서비스 화면에 표시되는 안내를 기준으로 이용해 주세요.",
  },
  {
    question: "'해낼게'라는 이름은 무슨 뜻인가요?",
    answer:
      "목표를 마음속에만 두지 않고 '해낼게'라고 말하는 순간부터 시작된다는 뜻을 담았어요.",
  },
] as const;

type JsonLdValue = Record<string, unknown>;

export function createOrganizationJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "해낼게",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    description:
      "목표를 선언하고 친구들과 링크를 나누면 응원이 워드맵에 쌓여 선언한 사람의 기록으로 남는 한국의 소셜 응원 서비스입니다.",
    sameAs: [...VERIFIED_SOCIAL_PROFILES],
  };
}

export function createSoftwareApplicationJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "해낼게",
    applicationCategory: "SocialNetworkingApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/how`,
    description:
      "목표를 선언하고 친구들과 공유하면 응원이 워드맵에 쌓여 선언한 사람의 기록으로 남는 소셜 응원 웹 서비스입니다.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      description: "목표 선언과 공유 기능은 무료로 이용할 수 있습니다.",
    },
  };
}

export function createFaqPageJsonLd(): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
