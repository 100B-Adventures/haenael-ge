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

export const COMMERCE_REGISTRATION = {
  label: "통신판매업 신고번호",
  status: "확인 중",
  note: "확인된 신고번호를 받은 뒤 이 자리에 반영해요. 확인 전 값은 표시하지 않아요.",
} as const;

export function legalExposureForPath(pathname: string): LegalExposureMode {
  if (pathname === "/my") return LEGAL_EXPOSURE.my;
  if (pathname === "/my/legal") return LEGAL_EXPOSURE.myLegal;
  if (pathname === "/terms") return LEGAL_EXPOSURE.terms;
  if (pathname === "/privacy") return LEGAL_EXPOSURE.privacy;
  if (pathname === "/how") return LEGAL_EXPOSURE.how;
  return LEGAL_EXPOSURE.landing;
}
