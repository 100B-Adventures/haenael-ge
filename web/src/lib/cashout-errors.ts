export const PUBLIC_ERRORS: Readonly<Record<string, string>> = {
  cashout_disabled: "환전 기능을 준비하고 있어요.",
  cashout_below_minimum:
    "모인 클로버가 30개 이상이면 지급 가능한 클로버를 1개 이상 신청할 수 있어요.",
  cashout_insufficient_balance: "지급 가능한 친구 응원분을 다시 확인해주세요.",
  cashout_already_requested: "이미 처리 중인 환전 신청이 있어요.",
  cashout_kyc_required: "환전 신청 기준을 반영하고 있어요. 잠시 후 다시 시도해주세요.",
  cashout_minor_not_allowed: "미성년으로 확인된 계정은 환전을 신청할 수 없어요.",
  request_key_conflict: "입력값이 바뀌었어요. 다시 확인한 뒤 신청해주세요.",
  invalid_member: "회원 정보를 확인할 수 없어요. 다시 로그인해주세요.",
  invalid_bank_code: "은행을 다시 선택해주세요.",
  invalid_account_number: "계좌번호를 숫자로 정확히 입력해주세요.",
  invalid_account_holder: "예금주명을 정확히 입력해주세요.",
  invalid_phone: "전화번호를 숫자로 정확히 입력해주세요.",
  phone_save_failed: "전화번호를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
  invalid_request_key: "신청 정보를 새로고침한 뒤 다시 시도해주세요.",
  cashout_key_version_unavailable: "환전 신청 서버를 점검하고 있어요.",
  cashout_encryption_unavailable: "환전 신청 서버를 점검하고 있어요.",
  cashout_fingerprint_unavailable: "환전 신청 서버를 점검하고 있어요.",
  unauthorized: "로그인 후 다시 시도해주세요.",
  cashout_request_failed: "환전 신청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.",
};

const PUBLIC_ERROR_CODE_PATTERN = /^[a-z][a-z0-9_]{2,79}$/;
const CASHOUT_PUBLIC_SQLSTATES = new Set(["22023", "42501", "55000"]);
export const CASHOUT_FALLBACK_ERROR_CODE = "cashout_request_failed";

/**
 * Postgres RAISE 라벨처럼 안전한 ASCII 코드만 클라이언트에 전달한다.
 * SQL 본문, 제약조건명, 계좌 정보가 섞인 원문은 고정 코드로 닫는다.
 */
export function normalizeCashoutErrorCode(
  rawCode: string | null | undefined,
): string {
  const code = rawCode?.trim();
  return code && PUBLIC_ERROR_CODE_PATTERN.test(code)
    ? code
    : CASHOUT_FALLBACK_ERROR_CODE;
}

/** 환전 RPC가 계약한 SQLSTATE에서 발생한 ASCII 라벨만 공개한다. */
export function normalizeCashoutRpcErrorCode(
  rawCode: string | null | undefined,
  sqlstate: string | null | undefined,
): string {
  if (!sqlstate || !CASHOUT_PUBLIC_SQLSTATES.has(sqlstate)) {
    return CASHOUT_FALLBACK_ERROR_CODE;
  }
  return normalizeCashoutErrorCode(rawCode);
}

/** Server Action은 ASCII 코드만 보내고, 한글은 브라우저 번들에서 조립한다. */
export function getCashoutErrorMessage(code: string): string {
  return PUBLIC_ERRORS[code] ??
    `${PUBLIC_ERRORS[CASHOUT_FALLBACK_ERROR_CODE]} (오류 코드: ${normalizeCashoutErrorCode(code)})`;
}
