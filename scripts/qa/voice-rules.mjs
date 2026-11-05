// Shared rule data for prototype and product copy checks.
// Keep detection data here so the two surfaces cannot drift.
export const VOICE_RULES = Object.freeze({
  ordinalPattern: String.raw`(^|[\s"“'(])네\s*번`,
  secondPersonPatterns: [
    String.raw`(^|[\s"“'(])네\s`,
    String.raw`(^|[\s"“'(])너(는|를|의|랑|한테|에게|라면)`,
    String.raw`(^|[\s"“'(])당신`,
  ],
  formalPattern: String.raw`(습니다|입니다|됩니다|합니다|십시오)`,
  banned: [
    ["얹혀", "쌓여요: 얹히다는 쌓임을 뜻하지 않는다"],
    ["밀어줘", "응원해요: 밀어주다는 우리가 만든 말이다"],
    ["밀어준", "응원한: 같은 이유"],
    ["이 자리에", "이 목록에 또는 삭제: D-028 금지 표현"],
    ["푸시로", "삭제: 내부 전송 수단 노출"],
    ["운영팀이", "삭제: 내부 조직 노출"],
    ["미니 목록", "목록: 내부 용어"],
    ["할 수 있는 것", "구체 명사: 모호한 명사화"],
    ["열리는 것", "구체 명사: D-028 금지"],
    ["마음 구름", "응원 워드맵: 용어 정본 위반"],
    ["금액도 순위도", "삭제: 없는 것을 설명하지 않는다"],
  ],
});

export const VOICE_EXCEPTIONS = Object.freeze({
  prototype: {
    formalScreens: ["terms", "privacy", "admin"],
    formalBlocks: ".sheet .legal, .legal-doc",
    userContentSelectors:
      ".wm-word, .news, .msg-more, .kprev, .cheer-msg, .nmsg, .wm-goalword, .wc-goal, .cov-cap",
  },
  product: {
    // VO-01 permits only accessibility attributes and test-only source strings.
    accessibilityAttributes: [
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "alt",
    ],
    testPathMarkers: [
      "/__tests__/",
      ".test.tsx",
      ".spec.tsx",
      ".stories.tsx",
    ],
    formalSourceMarkers: [
      "/app/admin/",
      "/app/terms/",
      "/app/privacy/",
      "/app/child-safety/",
      "/app/(receiver)/my/legal/",
      "/components/admin/",
      "/components/legal/",
      "/components/BusinessRegistrationStatus",
    ],
    formalCopy: [
      "에 동의하게 됩니다.",
    ],
    // User-authored cheer messages and Kakao invitation wording keep the writer's voice.
    userAuthoredCopy: [
      "네 목표도 내가 조용히 응원할게. 같이 해낼래?",
      "“네 목표도 내가 조용히 응원할게. 같이 해낼래?”",
    ],
  },
});
