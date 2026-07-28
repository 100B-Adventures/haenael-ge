// errors.ts — 결제 EF 공개 에러 매핑.
// Postgres RPC(RAISE EXCEPTION 라벨)·Toss 벤더 예외의 원문을 클라이언트 응답에
// 그대로 실어보내지 않는다. 원문은 호출부의 console.error(서버 로그)에만 남기고,
// 공개 HTTP 응답은 이 화이트리스트의 고정 코드+한국어 메시지만 쓴다.
// 화이트리스트에 없는 라벨(예: 예상 못한 Postgres 제약조건 위반, 커넥션 오류)은
// 전부 제네릭 폴백으로 떨어진다 — "알려진 것만 노출, 모르는 건 숨긴다".

export interface PublicError {
  code: string;
  message: string;
}

const KNOWN_ERRORS: Record<string, PublicError> = {
  // cheer-order (create_cheer_order RPC)
  invalid_order_id: { code: "invalid_order_id", message: "주문 정보가 올바르지 않습니다." },
  invalid_amount: { code: "invalid_amount", message: "결제 금액이 올바르지 않습니다." },
  amount_mismatch: { code: "amount_mismatch", message: "결제 금액이 일치하지 않습니다." },
  message_too_long: { code: "invalid_message", message: "응원 메시지가 너무 깁니다." },
  invalid_request_key: { code: "invalid_request_key", message: "요청 정보가 올바르지 않습니다." },
  request_key_conflict: {
    code: "request_key_conflict",
    message: "이미 다른 주문에 사용된 요청입니다.",
  },
  goal_not_found: { code: "goal_not_found", message: "목표를 찾을 수 없습니다." },
  rate_limited: { code: "rate_limited", message: "잠시 후 다시 시도해주세요." },

  // toss-confirm (confirm_cheer_payment / record_payment_compensation RPC)
  payment_not_found: { code: "payment_not_found", message: "결제 주문을 찾을 수 없습니다." },
  invalid_payment_status: {
    code: "invalid_payment_status",
    message: "이미 처리되었거나 만료된 결제입니다.",
  },
  invalid_payment_key: { code: "invalid_payment_key", message: "결제 정보가 올바르지 않습니다." },
  payment_key_mismatch: {
    code: "payment_key_mismatch",
    message: "결제 정보가 일치하지 않습니다.",
  },
  payment_already_done: { code: "payment_already_done", message: "이미 완료된 결제입니다." },
  cheer_not_found: { code: "cheer_not_found", message: "응원 정보를 찾을 수 없습니다." },

  // Toss 벤더 예외 (toss.ts가 throw하는 Error.message 라벨 — 벤더 원문은 절대 그대로 안 실음)
  toss_confirm_failed: {
    code: "toss_confirm_failed",
    message: "결제 승인 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
  },

  // cashout (create_cashout_request / admin transition RPC)
  invalid_member: { code: "invalid_member", message: "회원 정보를 확인할 수 없습니다." },
  invalid_bank_code: { code: "invalid_bank_code", message: "은행을 다시 선택해주세요." },
  invalid_account_number: {
    code: "invalid_account_number",
    message: "계좌번호를 숫자로 정확히 입력해주세요.",
  },
  invalid_account_holder: {
    code: "invalid_account_holder",
    message: "예금주명을 정확히 입력해주세요.",
  },
  invalid_cashout_amount: {
    code: "invalid_cashout_amount",
    message: "환전 금액을 다시 확인해주세요.",
  },
  cashout_below_minimum: {
    code: "cashout_below_minimum",
    message: "환전은 30클로버부터 신청할 수 있어요.",
  },
  cashout_insufficient_balance: {
    code: "cashout_insufficient_balance",
    message: "환전 가능한 클로버가 부족해요.",
  },
  cashout_encryption_unavailable: {
    code: "cashout_unavailable",
    message: "지금은 환전을 신청할 수 없어요. 잠시 후 다시 시도해주세요.",
  },
  cashout_not_found: {
    code: "cashout_not_found",
    message: "환전 요청을 찾을 수 없습니다.",
  },
  cashout_already_paid: {
    code: "cashout_already_paid",
    message: "이미 지급 완료된 요청입니다.",
  },
  invalid_cashout_status: {
    code: "invalid_cashout_status",
    message: "이미 처리되었거나 처리할 수 없는 환전 요청입니다.",
  },
  processing_note_required: {
    code: "processing_note_required",
    message: "반려 사유를 입력해주세요.",
  },
  processing_note_too_long: {
    code: "processing_note_too_long",
    message: "처리 메모는 500자 이하로 입력해주세요.",
  },
};

const GENERIC_ERROR: PublicError = {
  code: "internal_error",
  message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
};

/** RPC/vendor 원문 메시지를 안전한 공개 에러(code+한국어 message)로 변환한다. */
export function toPublicError(rawMessage: string | null | undefined): PublicError {
  if (rawMessage && Object.prototype.hasOwnProperty.call(KNOWN_ERRORS, rawMessage)) {
    return KNOWN_ERRORS[rawMessage];
  }
  return GENERIC_ERROR;
}

/** 화이트리스트에 있는 에러에 한해 의미있는 HTTP status를 매핑한다. 그 외 500. */
export function toPublicHttpStatus(rawMessage: string | null | undefined): number {
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
