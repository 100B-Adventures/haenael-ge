"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clover, X } from "lucide-react";
import { loadTossPayments } from "@/lib/toss";
import { trackEvent } from "@/lib/analytics";
import { KRW_PER_CLOVER, krwFromClover } from "@/lib/clover";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-goal-cheerpaymentbutton";
import { KakaoLoginLink } from "@/components/auth/KakaoLoginLink";
import { buildKakaoStartUrl, startKakaoLogin } from "@/lib/auth/kakao-navigation";

// 클로버 개수 프리셋(2026-07-21, 회장 지시: "1000개가 아니고 1개, 더 큰 금액 예
// 1만개도 보낼수있게") — 프리셋은 1/3/5/10클로버(=1천~1만원), 그 외엔 직접입력으로
// 무제한(서버 상한 100,000클로버=1억원, cheer-order EF와 동일 규약)까지 받는다.
const CLOVER_PRESETS = [1, 3, 5, 10] as const;
const MAX_CLOVER = 100_000; // = 1억원, cheer-order EF MAX_AMOUNT_KRW와 동일 규약

interface CheerPaymentButtonProps {
  goalId: number;
  goalTitle: string;
  goalSlug: string;
  isAuthenticated?: boolean;
  supporterName?: string | null;
}

interface CheerOrderResponse {
  orderId: string;
  orderName: string;
  amountKrw: number;
  customerKey: string;
}

function getAppUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

function getCustomerKey() {
  const key = window.localStorage.getItem("haenael_ge_customer_key");
  if (key && /^(?=.{22,50}$)(?=.*[-_=.@])[A-Za-z0-9_=.@-]+$/.test(key)) {
    return key;
  }
  const next = `anonymous_${crypto.randomUUID()}`;
  window.localStorage.setItem("haenael_ge_customer_key", next);
  return next;
}

function paymentErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("cheer_order:")) {
    const code = error.message.slice("cheer_order:".length);
    return CHEER_ORDER_ERROR_COPY[code] ?? PRODUCT_COPY.ERROR_GENERIC;
  }
  if (typeof error === "object" && error !== null) {
    const code =
      "code" in error && typeof error.code === "string" ? error.code : null;
    if (code) return TOSS_ERROR_COPY[code] ?? PRODUCT_COPY.ERROR_PAYMENT_UNKNOWN;
  }
  if (error instanceof TypeError) return PRODUCT_COPY.ERROR_NETWORK_UNKNOWN;
  return PRODUCT_COPY.ERROR_PAYMENT_UNKNOWN;
}

const CHEER_ORDER_ERROR_COPY: Record<string, string> = {
  payments_disabled: PRODUCT_COPY.ERROR_PAYMENTS_DISABLED,
  invalid_amount: PRODUCT_COPY.ERROR_INVALID_AMOUNT,
  profile_name_required: PRODUCT_COPY.ERROR_PROFILE_NAME_REQUIRED,
};

const TOSS_ERROR_COPY: Record<string, string> = {
  USER_CANCEL: PRODUCT_COPY.ERROR_CANCELED,
  PAY_PROCESS_CANCELED: PRODUCT_COPY.ERROR_CANCELED,
  PAY_PROCESS_ABORTED: PRODUCT_COPY.ERROR_ABORTED,
  REJECT_CARD_COMPANY: PRODUCT_COPY.ERROR_REJECTED,
};

function isSupportedWidgetPaymentMethod(paymentMethod: {
  method: string;
  easyPay?: { provider?: string | null } | null;
}) {
  if (paymentMethod.method === "CARD") return true;
  // 위젯 이벤트는 간편결제 provider를 생략할 수 있다. 화면은 EASY_PAY 선택을
  // 허용하고 최종 업체 화이트리스트는 Toss 승인 응답을 받은 서버에서 강제한다.
  return paymentMethod.method === "EASY_PAY";
}

type DestroyablePaymentSurface = {
  destroy: () => void | Promise<unknown>;
};

async function destroyPaymentSurface(
  surface: DestroyablePaymentSurface | null,
) {
  if (!surface) return;
  try {
    await surface.destroy();
  } catch {
    // SDK 정리는 사용자 결제 오류보다 우선하지 않는다.
  }
}

export function CheerPaymentButton({
  goalId,
  goalTitle,
  goalSlug,
  isAuthenticated = true,
  supporterName = null,
}: CheerPaymentButtonProps) {
  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
  const normalizedSupporterName = supporterName?.trim() || null;
  const hasSupporterName = normalizedSupporterName !== null;
  const [open, setOpen] = useState(false);
  // 클로버 개수(개)가 진실원 — 결제 금액(원)은 항상 cloverAmount * KRW_PER_CLOVER로 파생.
  const [cloverAmount, setCloverAmount] = useState<number>(3);
  // 프리셋 밖 값을 직접 입력 중인지(프리셋 버튼 활성 표시와 분리하기 위함).
  const [customInput, setCustomInput] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(!hasSupporterName);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 결제 시트가 열려 있는 동안(같은 결제 의도) 재시도가 같은 requestKey를 재사용하게
  // ref로 유지한다 — 네트워크 재시도/중복 클릭이 중복 주문을 만들지 않도록 하는
  // 멱등키(EF REQUEST_KEY_PATTERN: [A-Za-z0-9_-]{8,128}). 시트를 닫았다 다시 열면(=새
  // 결제 의도) null로 리셋해 다음 결제 시도에서 새 키를 만든다.
  const requestKeyRef = useRef<string | null>(null);
  const sheetOpenRef = useRef(false);
  const paymentAttemptRef = useRef(0);
  const paymentWindowRef = useRef<DestroyablePaymentSurface | null>(null);
  const loginRedirectPath = `/g/${goalSlug}#cheer`;
  const loginHref = buildKakaoStartUrl(loginRedirectPath);
  const fixedSupporterName = normalizedSupporterName ?? PRODUCT_COPY.TEXT_016;

  useEffect(
    () => () => {
      paymentAttemptRef.current += 1;
      const paymentWindow = paymentWindowRef.current;
      paymentWindowRef.current = null;
      void destroyPaymentSurface(paymentWindow);
    },
    [],
  );

  const canSubmit = useMemo(
    () =>
      !loading &&
      Number.isInteger(cloverAmount) &&
      cloverAmount >= 1 &&
      cloverAmount <= MAX_CLOVER &&
      (hasSupporterName || isAnonymous),
    [cloverAmount, hasSupporterName, isAnonymous, loading],
  );

  const amountKrw = krwFromClover(cloverAmount);

  function selectPreset(clover: number) {
    setCustomInput("");
    setCloverAmount(clover);
  }

  function handleCustomInputChange(raw: string) {
    // 숫자만 허용(콤마·공백 등 붙여넣기 대비 제거) — 빈 값은 0으로 두어 canSubmit이 막는다.
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setCustomInput(digitsOnly);
    const parsed = Number(digitsOnly);
    setCloverAmount(digitsOnly === "" ? 0 : Math.min(parsed, MAX_CLOVER));
  }

  function getOrCreateRequestKey(): string {
    if (!requestKeyRef.current) {
      requestKeyRef.current = crypto.randomUUID();
    }
    return requestKeyRef.current;
  }

  function openSheet() {
    requestKeyRef.current = null;
    sheetOpenRef.current = true;
    setCloverAmount(3);
    setCustomInput("");
    setIsAnonymous(!hasSupporterName);
    setError(null);
    setOpen(true);
  }

  function closeSheet() {
    requestKeyRef.current = null;
    sheetOpenRef.current = false;
    paymentAttemptRef.current += 1;
    const paymentWindow = paymentWindowRef.current;
    paymentWindowRef.current = null;
    void destroyPaymentSurface(paymentWindow);
    setLoading(false);
    setOpen(false);
  }

  async function createOrder(): Promise<CheerOrderResponse> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase 환경변수가 필요합니다.");
    }

    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (!session?.access_token) {
      throw new Error("cheer_order:login_required");
    }
    const accessToken = session.access_token;

    const res = await fetch(`${supabaseUrl}/functions/v1/cheer-order`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        goalId,
        amountKrw,
        // cloverAmount는 참고용 전송치일 뿐 서버(EF/RPC)가 amountKrw/1000으로 재계산해
        // 검증한다 — 클라이언트 입력은 신뢰하지 않는다(cheer-order EF 주석 참조).
        cloverAmount,
        isAnonymous,
        message,
        customerKey: getCustomerKey(),
        requestKey: getOrCreateRequestKey(),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const code = typeof body?.error?.code === "string" ? body.error.code : "unknown";
      throw new Error(`cheer_order:${code}`);
    }
    return body as CheerOrderResponse;
  }

  async function handlePayment() {
    const paymentAttempt = ++paymentAttemptRef.current;
    let orderCreated = false;
    setError(null);
    setLoading(true);
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error("토스 테스트 클라이언트 키가 필요합니다.");
      }
      if (!/^(?:test|live)_(?:gck|ck)_/.test(clientKey)) {
        throw new Error("카드 결제용 Toss Payments API 키가 필요합니다.");
      }
      const order = await createOrder();
      orderCreated = true;
      trackEvent("cheer_started", {
        goal_id: String(goalId),
        amount: order.amountKrw,
        currency: "KRW",
      });
      const tossPayments = await loadTossPayments(clientKey);
      const appUrl = getAppUrl();
      const commonRequest = {
        amount: { value: order.amountKrw, currency: "KRW" },
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: isAnonymous ? "익명 응원자" : fixedSupporterName,
        successUrl: `${appUrl}/payment/success?goalSlug=${encodeURIComponent(goalSlug)}`,
        failUrl: `${appUrl}/payment/fail?goalSlug=${encodeURIComponent(goalSlug)}`,
        metadata: {
          goalId: String(goalId),
          goalTitle: goalTitle.slice(0, 80),
        },
      } as const;

      if (/^(?:test|live)_gck_/.test(clientKey)) {
        const widgets = tossPayments.widgets({
          customerKey: order.customerKey,
        });
        await widgets.setAmount(commonRequest.amount);
        const paymentWindow = await widgets.renderPaymentWindow({
          orderName: commonRequest.orderName,
        });
        if (
          !sheetOpenRef.current ||
          paymentAttemptRef.current !== paymentAttempt
        ) {
          await destroyPaymentSurface(paymentWindow);
          return;
        }
        paymentWindowRef.current = paymentWindow;
        let paymentRequestStarted = false;
        paymentWindow.on("paymentRequest", async ({ paymentMethod }) => {
          if (paymentAttemptRef.current !== paymentAttempt) {
            await destroyPaymentSurface(paymentWindow);
            return;
          }
          if (paymentRequestStarted) return;
          paymentRequestStarted = true;
          if (!isSupportedWidgetPaymentMethod(paymentMethod)) {
            if (paymentWindowRef.current === paymentWindow) {
              paymentWindowRef.current = null;
            }
            await destroyPaymentSurface(paymentWindow);
            if (paymentAttemptRef.current !== paymentAttempt) return;
            setError(PRODUCT_COPY.ERROR_UNSUPPORTED_METHOD);
            setLoading(false);
            return;
          }
          const { amount: _amount, ...paymentRequest } = commonRequest;
          const sandboxPaymentResult =
            clientKey.startsWith("test_gck_") &&
            (process.env.NEXT_PUBLIC_TOSS_SANDBOX_RESULT === "SUCCESS" ||
              process.env.NEXT_PUBLIC_TOSS_SANDBOX_RESULT === "FAIL")
              ? process.env.NEXT_PUBLIC_TOSS_SANDBOX_RESULT
              : undefined;
          void widgets
            .requestPayment({
              ...paymentRequest,
              ...(sandboxPaymentResult
                ? { sandbox: { paymentResult: sandboxPaymentResult } }
                : {}),
            })
            .catch(async (paymentError: unknown) => {
              if (paymentWindowRef.current === paymentWindow) {
                paymentWindowRef.current = null;
              }
              await destroyPaymentSurface(paymentWindow);
              if (paymentAttemptRef.current === paymentAttempt) {
                setError(paymentErrorMessage(paymentError));
                setLoading(false);
              }
            });
        });
        paymentWindow.on("cancel", () => {
          if (paymentWindowRef.current === paymentWindow) {
            paymentWindowRef.current = null;
          }
          void destroyPaymentSurface(paymentWindow);
          if (paymentAttemptRef.current === paymentAttempt) {
            setError(PRODUCT_COPY.ERROR_CANCELED);
            setLoading(false);
          }
        });
      } else {
        const payment = tossPayments.payment({
          customerKey: order.customerKey,
        });
        if (
          !sheetOpenRef.current ||
          paymentAttemptRef.current !== paymentAttempt
        ) {
          await destroyPaymentSurface(payment);
          return;
        }
        paymentWindowRef.current = payment;
        try {
          await payment.requestPayment({ method: "CARD", ...commonRequest });
        } finally {
          if (paymentWindowRef.current === payment) {
            paymentWindowRef.current = null;
            await destroyPaymentSurface(payment);
          }
        }
      }
    } catch (e) {
      if (paymentAttemptRef.current === paymentAttempt) {
        if (e instanceof Error && e.message === "cheer_order:login_required") {
          startKakaoLogin(loginHref);
          return;
        }
        setError(
          e instanceof Error && e.message.startsWith("cheer_order:")
            ? paymentErrorMessage(e)
            : !orderCreated
            ? PRODUCT_COPY.ERROR_GENERIC
            : paymentErrorMessage(e),
        );
        setLoading(false);
      }
    }
  }

  return (
    <div>
      {isAuthenticated
        ? (
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-[16px] font-extrabold p-[17px]! [font-size:16px]! [background-color:var(--primary)]! [color:var(--card)]! [letter-spacing:0]! transition-transform active:translate-y-px disabled:active:translate-y-0"
            data-testid="cheer-cta"
            aria-label="조용히 응원 결제하기"
            onClick={openSheet}
            disabled={!paymentsEnabled}
          >
            <span aria-hidden="true">🍀</span>
            {paymentsEnabled ? PRODUCT_COPY.TEXT_001 : PRODUCT_COPY.TEXT_002}
          </button>
        )
        : (
          <KakaoLoginLink
            redirectPath={loginRedirectPath}
            className="w-full flex min-h-[var(--tap-min-size)] items-center justify-center gap-2 rounded-[16px] font-extrabold p-[17px]! [font-size:16px]! [background-color:var(--primary)]! [color:var(--card)]! [letter-spacing:0]! transition-transform active:translate-y-px"
            data-testid="cheer-cta"
            aria-label="카카오 로그인 후 응원하기"
          >
            <span aria-hidden="true">🍀</span>
            카카오 로그인 후 응원하기
          </KakaoLoginLink>
        )}

      {open && (
        <div
          className="cheer-payment-overlay fixed inset-0 z-50 flex items-end justify-center px-4 [background-color:rgba(22,20,15,0.32)]!"
          data-testid="cheer-payment-sheet"
          role="dialog"
          aria-modal="true"
        >
          <div className="cheer-payment-panel w-full max-w-[430px] rounded-[22px] p-5 [background-color:var(--card)]! [border:1px_solid_var(--border)]!">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[length:var(--text-meta-micro)]! font-extrabold [color:var(--accent-foreground)]!">{PRODUCT_COPY.TEXT_003}</p>
                <h2 className="mt-1 text-[19px] font-black [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_004}</h2>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full [color:var(--muted-foreground)]! [background-color:#F3F0EA]!"
                aria-label={PRODUCT_COPY.TEXT_005}
                onClick={closeSheet}
              >
                <X aria-hidden="true" size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* 클로버 개수 프리셋 — 개수가 주(主), 금액(원)은 괄호로 병기 */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {CLOVER_PRESETS.map((value) => {
                const selected = customInput === "" && cloverAmount === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[14px] border px-3 py-2.5 text-[15px] font-extrabold"
                    style={{
                      borderColor: selected
                        ? "var(--primary)"
                        : "var(--border)",
                      background: selected
                        ? "var(--accent)"
                        : "var(--background)",
                      color: selected ? "var(--accent-foreground)" : "#4a4640",
                    }}
                    data-testid={`cheer-preset-${value}`}
                    onClick={() => selectPreset(value)}
                  >
                    <span className="flex items-center gap-1.5">
                      <Clover aria-hidden="true" size={16} strokeWidth={2.5} />
                      {value}{PRODUCT_COPY.TEXT_006}</span>
                    <span
                      className="text-[length:var(--text-meta-micro)]! font-semibold"
                      style={{
                        color: selected
                          ? "var(--accent-foreground)"
                          : "var(--muted-color)",
                      }}
                    >
                      {(value * KRW_PER_CLOVER).toLocaleString("ko-KR")}{PRODUCT_COPY.TEXT_007}</span>
                  </button>
                );
              })}
            </div>

            {/* 직접 입력 — 상한 없음(서버 상한 100,000클로버=1억원까지) */}
            <label className="mt-3 block text-[13px] font-bold [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_008}<div
                className="mt-1 flex items-center gap-2 rounded-[13px] border px-3 py-2.5"
                style={{
                  borderColor:
                    customInput !== "" ? "var(--primary)" : "var(--border)",
                  background:
                    customInput !== "" ? "var(--accent)" : "var(--background)",
                }}
              >
                <Clover
                  aria-hidden="true"
                  size={16}
                  strokeWidth={2.5}
                  color="var(--accent-foreground)"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="w-full bg-transparent text-[15px] font-bold outline-none [color:var(--foreground)]!"
                  placeholder={PRODUCT_COPY.TEXT_009}
                  maxLength={6}
                  value={customInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  data-testid="cheer-custom-clover-input"
                  aria-label={PRODUCT_COPY.TEXT_010}
                />
                <span className="text-[13px] font-bold [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_011}</span>
              </div>
            </label>

            {/* 선택 요약: 클로버 개수(주) · 금액(보조) */}
            <p
              className="mt-3 text-[13px] font-bold [color:var(--accent-foreground)]!"
              data-testid="cheer-selected-summary"
            >
              🍀 {cloverAmount.toLocaleString("ko-KR")}{PRODUCT_COPY.TEXT_012}{" "}
              {amountKrw.toLocaleString("ko-KR")}{PRODUCT_COPY.TEXT_013}</p>

            <div className="mt-4 text-[13px] font-bold [color:var(--foreground)]!">
              <span>{PRODUCT_COPY.TEXT_014}</span>
              <div
                className="mt-1 rounded-[13px] border px-3 py-3 text-[15px] [border-color:var(--border)]! [background-color:var(--background)]!"
                data-testid="cheer-supporter-name"
              >
                {!hasSupporterName
                  ? PRODUCT_COPY.TEXT_023
                  : isAnonymous
                    ? PRODUCT_COPY.TEXT_015
                    : fixedSupporterName}
              </div>
              <p className="mt-1 text-[13px] font-medium [color:var(--muted-foreground)]!">
                {hasSupporterName ? PRODUCT_COPY.TEXT_022 : PRODUCT_COPY.TEXT_024}
              </p>
            </div>

            <label className="mt-3 flex items-center gap-2 text-[13px] [color:var(--muted-foreground)]!">
              <input
                type="checkbox"
                data-testid="cheer-anonymous-toggle"
                checked={isAnonymous}
                disabled={!hasSupporterName}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />{PRODUCT_COPY.TEXT_017}</label>

            <label className="mt-3 block text-[13px] font-bold [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_018}<textarea
                className="mt-1 w-full resize-none rounded-[13px] border px-3 py-3 text-[15px] [border-color:var(--border)]!"
                maxLength={140}
                rows={3}
                value={message}
                placeholder={PRODUCT_COPY.TEXT_019}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            {error && (
              <p
                className="mt-3 text-[13px] font-semibold text-danger-ink"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="button"
              className="mt-4 w-full rounded-[16px] py-4 text-[16px] font-extrabold [color:var(--card)]!"
              style={{ background: canSubmit ? "var(--primary)" : "#A8D0BC" }}
              disabled={!canSubmit}
              data-testid="cheer-payment-submit"
              onClick={handlePayment}
            >
              {loading ? PRODUCT_COPY.TEXT_020 : PRODUCT_COPY.TEXT_021}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
