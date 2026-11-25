// Centralized user-facing copy extracted from web/src/components/goal/CheerPaymentButton.tsx.
// Keep wording exact unless the approved UX-writing contract changes.
export const PRODUCT_COPY = {
  TEXT_001: "조용히 밀어줄게", // source line 334
  TEXT_002: "응원 결제 준비 중", // source line 334
  TEXT_003: "조용한 응원", // source line 347
  TEXT_004: "친구의 목표에 클로버를 보냅니다", // source line 350
  TEXT_005: "닫기", // source line 357
  TEXT_006: "클로버", // source line 387
  TEXT_007: "원", // source line 397
  TEXT_008: "직접 입력 (클로버 개수)", // source line 405
  TEXT_009: "예: 100", // source line 427
  TEXT_010: "클로버 개수 직접 입력", // source line 432
  TEXT_011: "클로버", // source line 434
  TEXT_012: "클로버 ·", // source line 445
  TEXT_013: "원", // source line 446
  TEXT_014: "표시 이름", // source line 449
  TEXT_015: "익명으로 보낼게요", // source line 457
  TEXT_016: "해낼게 사용자", // source line 457
  TEXT_017: "익명으로 조용히 응원하기", // source line 468
  TEXT_018: "한 줄 응원", // source line 472
  TEXT_019: "말은 짧게, 응원은 진짜로.", // source line 479
  TEXT_020: "결제창 여는 중...", // source line 501
  TEXT_021: "결제하고 응원하기", // source line 501
  TEXT_022: "로그인한 프로필 이름으로 표시돼요.",
  TEXT_023: "프로필 이름을 정하면 이름으로 보낼 수 있어요.",
  TEXT_024: "프로필 이름이 없어 이번 응원은 익명으로만 보낼 수 있어요.",
  ERROR_PAYMENTS_DISABLED: "응원 결제를 준비하고 있어요.",
  ERROR_INVALID_AMOUNT: "응원 금액을 다시 확인해 주세요.",
  ERROR_PROFILE_NAME_REQUIRED: "프로필 이름을 확인한 뒤 다시 응원해 주세요.",
  ERROR_UNSUPPORTED_METHOD: "카드 또는 간편결제를 선택해 주세요. 돈은 빠져나가지 않았어요.",
  ERROR_CANCELED: "결제를 취소했어요. 돈은 빠져나가지 않았어요. 다시 시도할 수 있어요.",
  ERROR_ABORTED: "결제 승인이 끝나지 않았어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
  ERROR_REJECTED: "결제 수단에서 승인을 거절했어요. 돈은 빠져나가지 않았어요. 다른 카드나 간편결제로 다시 시도해 주세요.",
  ERROR_NETWORK_UNKNOWN: "결제 결과를 확인하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
  ERROR_PAYMENT_UNKNOWN: "결제를 완료하지 못했어요. 돈이 빠져나갔다면 다시 결제하지 말고 결제 내역을 먼저 확인해 주세요.",
  ERROR_GENERIC: "응원 주문을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

export const PRODUCT_COPY_SOURCE = "web/src/components/goal/CheerPaymentButton.tsx";
