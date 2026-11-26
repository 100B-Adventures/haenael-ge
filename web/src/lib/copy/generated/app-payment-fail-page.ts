// Centralized user-facing copy extracted from web/src/app/payment/fail/page.tsx.
// Keep wording exact unless the approved UX-writing contract changes.
export const PRODUCT_COPY = {
  TEXT_001: "결제가 멈췄어요", // source line 29
  TEXT_002: "결제가 완료되지 않았어요. 결제 수단을 확인한 뒤 다시 시도해 주세요.", // source line 32
  TEXT_003: "다시 돌아가기", // source line 38
  CANCELED_TITLE: "결제를 취소했어요",
  CANCELED_MESSAGE: "승인 전에 취소되어 돈은 빠져나가지 않았어요. 원하면 다시 시도할 수 있어요.",
  REJECTED_TITLE: "결제 승인이 거절됐어요",
  REJECTED_MESSAGE: "승인되지 않아 돈은 빠져나가지 않았어요. 다른 카드나 간편결제로 다시 시도해 주세요.",
  UNKNOWN_TITLE: "결제 내역을 먼저 확인해 주세요",
  UNKNOWN_MESSAGE: "결제 결과를 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 확인한 뒤 문의해 주세요.",
  UNLISTED_TITLE: "결제가 완료되지 않았어요",
  UNLISTED_MESSAGE: "승인되지 않아 돈은 빠져나가지 않았어요. 결제 수단을 확인한 뒤 다시 시도해 주세요.",
  ORDER_NUMBER: "주문번호",
  RETRY: "다른 결제수단으로 다시 시도하기",
  BACK_TO_GOAL: "친구 목표로 돌아가기",
  HOME: "해낼게 홈으로",
} as const;

export const PRODUCT_COPY_SOURCE = "web/src/app/payment/fail/page.tsx";
