import { describe, expect, it } from "vitest";
import {
  createFaqPageJsonLd,
  createOrganizationJsonLd,
  createSoftwareApplicationJsonLd,
  FAQ_ITEMS,
  serializeJsonLd,
  VERIFIED_SOCIAL_PROFILES,
} from "./structured-data";

describe("SEO-JSONLD-01 구조화 데이터 계약", () => {
  it("SEO-JSONLD-01-정상 세 스키마가 JSON으로 파싱되고 FAQ 10개가 화면 데이터와 일치한다", () => {
    const schemas = [
      createOrganizationJsonLd(),
      createSoftwareApplicationJsonLd(),
      createFaqPageJsonLd(),
    ];

    schemas.forEach((schema) => {
      expect(JSON.parse(serializeJsonLd(schema))).toEqual(schema);
    });

    const faqSchema = createFaqPageJsonLd();
    expect(faqSchema.mainEntity).toHaveLength(10);
    expect(faqSchema.mainEntity).toEqual(
      FAQ_ITEMS.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    );
  });

  it("SEO-JSONLD-01-거절 확인되지 않은 소셜 계정과 환전 제공 주장을 노출하지 않는다", () => {
    const organization = createOrganizationJsonLd();
    const software = createSoftwareApplicationJsonLd();
    const publicDescriptions = JSON.stringify([organization, software]);

    expect(organization.sameAs).toEqual([...VERIFIED_SOCIAL_PROFILES]);
    expect(publicDescriptions).not.toMatch(/facebook/i);
    expect(publicDescriptions).not.toMatch(/환전|현금|실제 돈/);
  });

  it("SEO-JSONLD-01-경계 script 종료 문자가 될 수 있는 꺾쇠를 이스케이프한다", () => {
    const serialized = serializeJsonLd({ value: "</script>" });

    expect(serialized).toBe('{"value":"\\u003c/script>"}');
    expect(JSON.parse(serialized)).toEqual({ value: "</script>" });
  });
});
