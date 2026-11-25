// Centralized user-facing copy extracted from web/src/app/payment/success/page.tsx.
// Keep wording exact unless the approved UX-writing contract changes.
export const PRODUCT_COPY = {
  TEXT_001: "해낼게 홈으로", // source line 115
  SUCCESS_TITLE: "응원이 전달됐어요",
  SUCCESS_WORDMAP: "친구의 워드맵에 응원 단어가 쌓였어요.",
  BACK_TO_GOAL: "친구 목표로 돌아가기",
  SHOW_RESULT: "응원 결과 보기",
  GROWTH_TITLE_LINE_1: "응원을 보내면",
  GROWTH_TITLE_LINE_2: "내가 쓴 단어가 바로 쌓여요",
  GROWTH_DESCRIPTION: "로그인한 이름으로 보낸 응원이 이 워드맵에 바로 보여요.",
  GROWTH_FEEDBACK: "보낸 응원이 워드맵과 \"내가 응원한 목표\"에 기록됐어요.",
  ERROR_PAYMENTS_DISABLED: "응원 결제를 준비하고 있어요.",
  ERROR_PAYMENT_NOT_FOUND: "결제 주문을 찾을 수 없어요.",
  ERROR_PAYMENT_FAILED: "결제 승인 또는 응원 반영에 실패했어요. 다시 결제하지 말고 주문 내역을 확인해 주세요.",
  ERROR_PAYMENT_CANCELED: "결제가 취소됐어요. 금액이 보이면 취소 반영까지 잠시 기다려 주세요.",
  ERROR_AMOUNT_MISMATCH: "결제 금액이 일치하지 않아요.",
  ERROR_TOSS_CONFIRM_FAILED: "승인 결과를 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
  ERROR_INVALID_TOSS_STATUS: "승인 상태를 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
  ERROR_UNSUPPORTED_PAYMENT_METHOD: "지원하지 않는 결제수단이라 자동 취소했어요. 금액이 보이면 취소 반영까지 잠시 걸릴 수 있어요.",
  ERROR_MANUAL_RECONCILE_REQUIRED: "결제 금액이 빠져나갔을 수 있지만 응원 반영을 확인하지 못했어요. 다시 결제하지 말고 주문번호로 문의해 주세요.",
  ERROR_PAYMENT_CANCELLED_AFTER_CONFIRMATION: "승인 뒤 응원을 반영하지 못해 자동 취소했어요. 금액이 보이면 취소 반영을 기다린 뒤 다시 시도해 주세요.",
  ERROR_GENERIC: "결제 상태를 바로 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
} as const;

export const PRODUCT_COPY_SOURCE = "web/src/app/payment/success/page.tsx";
