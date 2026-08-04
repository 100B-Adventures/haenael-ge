const KOREAN_MOBILE_PHONE_PATTERN = /^01[016789]\d{7,8}$/;
const PHONE_INPUT_CHARACTERS_PATTERN = /^[+\d\s()-]+$/;

/** 국내 휴대전화 번호를 숫자 전용 01X 표기로 정규화한다. */
export function normalizeKoreanMobilePhone(phone: unknown): string | null {
  if (
    typeof phone !== "string" ||
    !phone.trim() ||
    !PHONE_INPUT_CHARACTERS_PATTERN.test(phone)
  ) {
    return null;
  }

  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0082")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("82")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("10")) digits = `0${digits}`;

  return KOREAN_MOBILE_PHONE_PATTERN.test(digits) ? digits : null;
}
