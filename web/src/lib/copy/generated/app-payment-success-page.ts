// Centralized user-facing copy extracted from web/src/app/payment/success/page.tsx.
// Keep wording exact unless the approved UX-writing contract changes.
export const PRODUCT_COPY = {
  TEXT_001: "해낼게 홈으로", // source line 115
  SUCCESS_TITLE: "응원이 전달됐어요",
  SUCCESS_WORDMAP: "친구의 워드맵에 응원 단어가 쌓였어요.",
  BACK_TO_GOAL: "친구 목표로 돌아가기",
  GROWTH_TITLE_LINE_1: "응원을 보내면",
  GROWTH_TITLE_LINE_2: "내가 쓴 단어가 바로 쌓여요",
  GROWTH_DESCRIPTION: "로그인하지 않아도 응원할 수 있어요. 보낸 단어는 이 워드맵에서 바로 보여요.",
  GROWTH_FEEDBACK: "보낸 응원이 워드맵에 쌓였어요. 로그인하면 \"내가 응원한 목표\"에 기록이 남아요.",
  ERROR_PAYMENTS_DISABLED: "응원 결제를 준비하고 있어요.",
  ERROR_PAYMENT_NOT_FOUND: "결제 주문을 찾을 수 없어요.",
  ERROR_AMOUNT_MISMATCH: "결제 금액이 일치하지 않아요.",
  ERROR_TOSS_CONFIRM_FAILED: "결제 승인 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
  ERROR_INVALID_TOSS_STATUS: "결제 승인 결과를 확인하지 못했어요.",
  ERROR_UNSUPPORTED_PAYMENT_METHOD: "카드 결제만 지원해요.",
  ERROR_NON_CARD_COMPENSATION_FAILED: "허용되지 않은 결제수단을 안전하게 정리하지 못했어요.",
  ERROR_GENERIC: "결제 상태를 바로 확인하지 못했어요. 잠시 후 다시 확인해 주세요.",
} as const;

export const PRODUCT_COPY_SOURCE = "web/src/app/payment/success/page.tsx";
