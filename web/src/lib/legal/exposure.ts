export type LegalExposureMode = "none" | "link" | "biz" | "page";

export const LEGAL_EXPOSURE = {
  landing: "none",
  how: "none",
  my: "link",
  myLegal: "biz",
  terms: "page",
  privacy: "page",
} as const satisfies Record<string, LegalExposureMode>;

export const BUSINESS_INFORMATION = {
  businessName: "정성컴퍼니",
  representative: "조성진",
  registrationNumber: "798-31-01774",
  address: "서울시 강남구 역삼동 620-17 203호",
  email: "haenaelge.official@gmail.com",
  privacyOfficer: "윤동주",
} as const;

export function legalExposureForPath(pathname: string): LegalExposureMode {
  if (pathname === "/my") return LEGAL_EXPOSURE.my;
  if (pathname === "/my/legal") return LEGAL_EXPOSURE.myLegal;
  if (pathname === "/terms") return LEGAL_EXPOSURE.terms;
  if (pathname === "/privacy") return LEGAL_EXPOSURE.privacy;
  if (pathname === "/how") return LEGAL_EXPOSURE.how;
  return LEGAL_EXPOSURE.landing;
}
