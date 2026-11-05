// errors.ts — 결제 EF 공개 에러 매핑.
// Postgres RPC(RAISE EXCEPTION 라벨)·Toss 벤더 예외의 원문을 클라이언트 응답에
// 그대로 실어보내지 않는다. 원문은 호출부의 console.error(서버 로그)에만 남기고,
// 공개 HTTP 응답은 이 화이트리스트의 고정 code만 쓴다.
// 화이트리스트에 없는 라벨(예: 예상 못한 Postgres 제약조건 위반, 커넥션 오류)은
// 전부 제네릭 폴백으로 떨어진다 — "알려진 것만 노출, 모르는 건 숨긴다".

export interface PublicError {
  code: string;
}

const KNOWN_ERRORS: Record<string, PublicError> = {
  // cheer-order (create_cheer_order RPC)
  invalid_order_id: { code: "invalid_order_id" },
  invalid_amount: { code: "invalid_amount" },
  amount_mismatch: { code: "amount_mismatch" },
  message_too_long: { code: "invalid_message" },
  invalid_request_key: { code: "invalid_request_key" },
  request_key_conflict: { code: "request_key_conflict" },
  goal_not_found: { code: "goal_not_found" },
  rate_limited: { code: "rate_limited" },

  // toss-confirm (confirm_cheer_payment / record_payment_compensation RPC)
  payment_not_found: { code: "payment_not_found" },
  invalid_payment_status: { code: "invalid_payment_status" },
  invalid_payment_key: { code: "invalid_payment_key" },
  payment_key_mismatch: { code: "payment_key_mismatch" },
  payment_already_done: { code: "payment_already_done" },
  cheer_not_found: { code: "cheer_not_found" },

  // Toss 벤더 예외 (toss.ts가 throw하는 Error.message 라벨 — 벤더 원문은 절대 그대로 안 실음)
  toss_confirm_failed: { code: "toss_confirm_failed" },
  // cashout (create_cashout_request / admin transition RPC)
  invalid_member: { code: "invalid_member" },
  invalid_bank_code: { code: "invalid_bank_code" },
  invalid_account_number: { code: "invalid_account_number" },
  invalid_account_holder: { code: "invalid_account_holder" },
  invalid_cashout_amount: { code: "invalid_cashout_amount" },
  cashout_below_minimum: { code: "cashout_below_minimum" },
  cashout_insufficient_balance: { code: "cashout_insufficient_balance" },
  cashout_encryption_unavailable: { code: "cashout_unavailable" },
  cashout_kyc_required: { code: "cashout_kyc_required" },
  cashout_not_found: { code: "cashout_not_found" },
  cashout_already_paid: { code: "cashout_already_paid" },
  invalid_cashout_status: { code: "invalid_cashout_status" },
  processing_note_required: { code: "processing_note_required" },
  processing_note_too_long: { code: "processing_note_too_long" },
};

const GENERIC_ERROR: PublicError = {
  code: "internal_error",
};

/** RPC/vendor 원문을 안전한 공개 error code로 변환한다. */
export function toPublicError(
  rawMessage: string | null | undefined,
): PublicError {
  if (
    rawMessage && Object.prototype.hasOwnProperty.call(KNOWN_ERRORS, rawMessage)
  ) {
    return KNOWN_ERRORS[rawMessage];
  }
  return GENERIC_ERROR;
}

/** 화이트리스트에 있는 에러에 한해 의미있는 HTTP status를 매핑한다. 그 외 500. */
export function toPublicHttpStatus(
  rawMessage: string | null | undefined,
): number {
  switch (rawMessage) {
    case "goal_not_found":
    case "payment_not_found":
    case "cheer_not_found":
      return 404;
    case "rate_limited":
      return 429;
    case "request_key_conflict":
    case "invalid_payment_status":
    case "payment_already_done":
    case "payment_key_mismatch":
    case "cashout_insufficient_balance":
    case "cashout_already_paid":
    case "invalid_cashout_status":
      return 409;
    case "cashout_below_minimum":
      return 422;
    case "cashout_kyc_required":
      return 403;
    case "invalid_order_id":
    case "invalid_amount":
    case "amount_mismatch":
    case "message_too_long":
    case "invalid_request_key":
    case "invalid_payment_key":
    case "invalid_member":
    case "invalid_bank_code":
    case "invalid_account_number":
    case "invalid_account_holder":
    case "invalid_cashout_amount":
    case "processing_note_required":
    case "processing_note_too_long":
      return 400;
    case "cashout_encryption_unavailable":
      return 503;
    case "cashout_not_found":
      return 404;
    default:
      return 500;
  }
}
