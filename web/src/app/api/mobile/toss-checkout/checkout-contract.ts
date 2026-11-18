export type AlternativeCheckoutContract = {
  clientKey: string;
  amount: number;
  orderId: string;
  productId: string;
  accountBinding: string;
  returnUrl: string;
  successUrl?: string;
  failUrl?: string;
};

function safeJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderAlternativeCheckoutHtml(contract: AlternativeCheckoutContract) {
  const paymentRequest = {
    method: "CARD",
    amount: { value: contract.amount, currency: "KRW" },
    orderId: contract.orderId,
    orderName: contract.productId,
    successUrl: contract.successUrl ?? contract.returnUrl,
    failUrl: contract.failUrl ?? contract.returnUrl,
    customerName: "해낼게 사용자",
    metadata: {
      productId: contract.productId,
      accountBinding: contract.accountBinding,
    },
  };
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<title>해낼게 결제</title><script src="https://js.tosspayments.com/v2/standard"></script></head>
<body><main><h1>결제창을 여는 중입니다</h1><p id="status">잠시만 기다려 주세요.</p></main>
<script>
const request = ${safeJson(paymentRequest)};
const clientKey = ${safeJson(contract.clientKey)};
(async () => {
  try {
    const payment = TossPayments(clientKey).payment({ customerKey: ${safeJson(contract.accountBinding)} });
    await payment.requestPayment(request);
  } catch (error) {
    document.getElementById("status").textContent = "결제창을 열지 못했어요. 앱으로 돌아가 다시 시도해 주세요.";
  }
})();
</script></body></html>`;
}
