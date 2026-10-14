"use client";

import { useMemo, useRef, useState } from "react";
import { Clover, X } from "lucide-react";
import { loadTossPayments } from "@/lib/toss";
import { trackEvent } from "@/lib/analytics";
import { KRW_PER_CLOVER, krwFromClover } from "@/lib/clover";
import { createClient } from "@/lib/supabase/client";

// 클로버 개수 프리셋(2026-07-21, 회장 지시: "1000개가 아니고 1개, 더 큰 금액 예
// 1만개도 보낼수있게") — 프리셋은 1/3/5/10클로버(=1천~1만원), 그 외엔 직접입력으로
// 무제한(서버 상한 100,000클로버=1억원, cheer-order EF와 동일 규약)까지 받는다.
const CLOVER_PRESETS = [1, 3, 5, 10] as const;
const MAX_CLOVER = 100_000; // = 1억원, cheer-order EF MAX_AMOUNT_KRW와 동일 규약

interface CheerPaymentButtonProps {
  goalId: number;
  goalTitle: string;
  goalSlug: string;
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
  if (key) return key;
  const next = `anonymous_${crypto.randomUUID().slice(0, 8)}`;
  window.localStorage.setItem("haenael_ge_customer_key", next);
  return next;
}

export function CheerPaymentButton({
  goalId,
  goalTitle,
  goalSlug,
}: CheerPaymentButtonProps) {
  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === "true";
  const [open, setOpen] = useState(false);
  // 클로버 개수(개)가 진실원 — 결제 금액(원)은 항상 cloverAmount * KRW_PER_CLOVER로 파생.
  const [cloverAmount, setCloverAmount] = useState<number>(3);
  // 프리셋 밖 값을 직접 입력 중인지(프리셋 버튼 활성 표시와 분리하기 위함).
  const [customInput, setCustomInput] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 결제 시트가 열려 있는 동안(같은 결제 의도) 재시도가 같은 requestKey를 재사용하게
  // ref로 유지한다 — 네트워크 재시도/중복 클릭이 중복 주문을 만들지 않도록 하는
  // 멱등키(EF REQUEST_KEY_PATTERN: [A-Za-z0-9_-]{8,128}). 시트를 닫았다 다시 열면(=새
  // 결제 의도) null로 리셋해 다음 결제 시도에서 새 키를 만든다.
  const requestKeyRef = useRef<string | null>(null);

  const canSubmit = useMemo(
    () =>
      !loading &&
      Number.isInteger(cloverAmount) &&
      cloverAmount >= 1 &&
      cloverAmount <= MAX_CLOVER,
    [cloverAmount, loading],
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
    setCloverAmount(3);
    setCustomInput("");
    setOpen(true);
  }

  function closeSheet() {
    requestKeyRef.current = null;
    setOpen(false);
  }

  async function createOrder(): Promise<CheerOrderResponse> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase 환경변수가 필요합니다.");
    }

    const { data: { session } } = await createClient().auth.getSession();
    const accessToken = session?.access_token ?? anonKey;

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
        displayName,
        isAnonymous,
        message,
        customerKey: getCustomerKey(),
        requestKey: getOrCreateRequestKey(),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error?.message ?? "응원 주문 생성 실패");
    }
    return body as CheerOrderResponse;
  }

  async function handlePayment() {
    setError(null);
    setLoading(true);
    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        throw new Error("토스 테스트 클라이언트 키가 필요합니다.");
      }

      const order = await createOrder();
      trackEvent("cheer_started", {
        goal_id: String(goalId),
        amount: order.amountKrw,
        currency: "KRW",
      });
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: order.customerKey });
      const appUrl = getAppUrl();

      await payment.requestPayment({
        method: "CARD",
        amount: { value: order.amountKrw, currency: "KRW" },
        orderId: order.orderId,
        orderName: order.orderName,
        customerName: isAnonymous ? "익명 응원자" : displayName || "응원자",
        successUrl: `${appUrl}/payment/success?goalSlug=${encodeURIComponent(goalSlug)}`,
        failUrl: `${appUrl}/payment/fail`,
        metadata: {
          goalId: String(goalId),
          goalTitle: goalTitle.slice(0, 80),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결제 요청 실패");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 rounded-[16px] font-extrabold p-[17px]! [font-size:16px]! [background-color:var(--primary)]! [color:var(--card)]! [letter-spacing:0]! transition-transform active:translate-y-px disabled:active:translate-y-0"
        data-testid="cheer-cta"
        aria-label="조용히 응원 결제하기"
        onClick={openSheet}
        disabled={!paymentsEnabled}
      >
        <Clover aria-hidden="true" size={20} strokeWidth={2.7} />
        {paymentsEnabled ? "조용히 밀어줄게" : "응원 결제 준비 중"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 [background-color:rgba(22,20,15,0.32)]!"
          data-testid="cheer-payment-sheet"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[430px] rounded-[22px] p-5 [background-color:var(--card)]! [border:1px_solid_var(--border)]!">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-extrabold [color:var(--accent-foreground)]!">
                  조용한 응원
                </p>
                <h2 className="mt-1 text-[19px] font-black [color:var(--foreground)]!">
                  친구의 목표에 클로버를 보냅니다
                </h2>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full [color:var(--muted-foreground)]! [background-color:#F3F0EA]!"
                aria-label="닫기"
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
                      {value}클로버
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{
                        color: selected
                          ? "var(--accent-foreground)"
                          : "var(--faint)",
                      }}
                    >
                      {(value * KRW_PER_CLOVER).toLocaleString("ko-KR")}원
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 직접 입력 — 상한 없음(서버 상한 100,000클로버=1억원까지) */}
            <label className="mt-3 block text-[13px] font-bold [color:#4a4640]!">
              직접 입력 (클로버 개수)
              <div
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
                  placeholder="예: 100"
                  maxLength={6}
                  value={customInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  data-testid="cheer-custom-clover-input"
                  aria-label="클로버 개수 직접 입력"
                />
                <span className="text-[13px] font-bold [color:var(--muted-foreground)]!">
                  클로버
                </span>
              </div>
            </label>

            {/* 선택 요약: 클로버 개수(주) · 금액(보조) */}
            <p
              className="mt-3 text-[13px] font-bold [color:var(--accent-foreground)]!"
              data-testid="cheer-selected-summary"
            >
              🍀 {cloverAmount.toLocaleString("ko-KR")}클로버 ·{" "}
              {amountKrw.toLocaleString("ko-KR")}원
            </p>

            <label className="mt-4 block text-[13px] font-bold [color:#4a4640]!">
              이름
              <input
                className="mt-1 w-full rounded-[13px] border px-3 py-3 text-[15px] [border-color:var(--border)]!"
                maxLength={30}
                value={displayName}
                disabled={isAnonymous}
                placeholder={
                  isAnonymous ? "익명으로 보낼게요" : "친구에게 보일 이름"
                }
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-[13px] [color:var(--muted-foreground)]!">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              익명으로 조용히 응원하기
            </label>

            <label className="mt-3 block text-[13px] font-bold [color:#4a4640]!">
              한 줄 응원
              <textarea
                className="mt-1 w-full resize-none rounded-[13px] border px-3 py-3 text-[15px] [border-color:var(--border)]!"
                maxLength={140}
                rows={3}
                value={message}
                placeholder="말은 짧게, 응원은 진짜로."
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            {error && (
              <p className="mt-3 text-[13px] font-semibold [color:#B3261E]!">
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
              {loading ? "결제창 여는 중..." : "결제하고 응원하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
