// payment/success/page.tsx — 토스 successUrl → invoke('toss-confirm')

import Link from "next/link";
import { CircleAlert, Clover } from "lucide-react";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-payment-success-page";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { WordmapWord } from "@/components/goal/Wordmap";
import { DopamineGrowthOverlay } from "./DopamineGrowthOverlay";
import { PurchaseConversion, type ConversionLease } from "./PurchaseConversion";

type Props = {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    goalSlug?: string;
  }>;
};

const TOSS_CONFIRM_ERROR_COPY: Record<string, string> = {
  method_not_allowed: PRODUCT_COPY.ERROR_GENERIC,
  payments_disabled: PRODUCT_COPY.ERROR_PAYMENTS_DISABLED,
  unauthorized: PRODUCT_COPY.ERROR_GENERIC,
  invalid_json: PRODUCT_COPY.ERROR_GENERIC,
  validation_error: PRODUCT_COPY.ERROR_GENERIC,
  missing_supabase_env: PRODUCT_COPY.ERROR_GENERIC,
  missing_toss_secret: PRODUCT_COPY.ERROR_GENERIC,
  payment_not_found: PRODUCT_COPY.ERROR_PAYMENT_NOT_FOUND,
  amount_mismatch: PRODUCT_COPY.ERROR_AMOUNT_MISMATCH,
  invalid_payment_status: PRODUCT_COPY.ERROR_GENERIC,
  invalid_payment_key: PRODUCT_COPY.ERROR_GENERIC,
  payment_key_mismatch: PRODUCT_COPY.ERROR_GENERIC,
  payment_already_done: PRODUCT_COPY.ERROR_GENERIC,
  cheer_not_found: PRODUCT_COPY.ERROR_GENERIC,
  internal_error: PRODUCT_COPY.ERROR_GENERIC,
  toss_confirm_failed: PRODUCT_COPY.ERROR_TOSS_CONFIRM_FAILED,
  invalid_toss_status: PRODUCT_COPY.ERROR_INVALID_TOSS_STATUS,
  unsupported_payment_method: PRODUCT_COPY.ERROR_UNSUPPORTED_PAYMENT_METHOD,
  non_card_compensation_failed: PRODUCT_COPY.ERROR_NON_CARD_COMPENSATION_FAILED,
};

async function confirmPayment(params: {
  paymentKey: string;
  orderId: string;
  amount: number;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase 환경변수가 필요합니다.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/toss-confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    cache: "no-store",
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = typeof body?.error?.code === "string" ? body.error.code : "unknown";
    throw new Error(`toss_confirm:${code}`);
  }
  return body as {
    cheerId?: number;
    goalTitle?: string;
    conversionLease?: ConversionLease | null;
  };
}

type GrowthState = {
  goalTitle: string;
  message: string | null;
  words: WordmapWord[];
  coverPresetKey: string | null;
  coverUrl: string | null;
};

async function loadGrowthState(cheerId: number, goalSlug: string): Promise<GrowthState | null> {
  const supabase = await createServerSupabaseClient();
  const { data: cheer, error: cheerError } = await supabase
    .from("cheer_public")
    .select("goal_id, message")
    .eq("id", cheerId)
    .maybeSingle();

  if (cheerError || !cheer?.goal_id) return null;

  const [{ data: goal, error: goalError }, { data: wordmapRaw, error: wordmapError }] =
    await Promise.all([
      supabase
        .from("goal_public")
        .select("id, slug, title, cover_preset_key, cover_public_path")
        .eq("id", cheer.goal_id)
        .maybeSingle(),
      supabase.rpc("get_wordmap", { p_goal_id: cheer.goal_id }),
    ]);

  if (goalError || wordmapError || !goal || goal.slug !== goalSlug) return null;

  const words: WordmapWord[] = (wordmapRaw ?? []).map(
    (word: { word: string; word_count: number }) => ({
      word: word.word,
      word_count: Number(word.word_count),
    }),
  );

  return {
    goalTitle: goal.title ?? "친구의 목표",
    message: cheer.message?.trim() || null,
    words,
    coverPresetKey: goal.cover_preset_key,
    coverUrl: goal.cover_public_path
      ? supabase.storage.from("goal-cover-public").getPublicUrl(goal.cover_public_path).data.publicUrl
      : null,
  };
}

export default async function PaymentSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const paymentKey = params.paymentKey ?? "";
  const orderId = params.orderId ?? "";
  const amount = Number(params.amount);
  // goalSlug: 결제 후 방금 응원한 친구 목표 페이지로 돌려보내 워드맵 반영을 즉시 보여준다.
  // 과거 링크·구버전엔 없을 수 있어 폴백은 홈("/"). slug 포맷(온보딩과 동일 화이트리스트)만 통과.
  const rawSlug = params.goalSlug ?? "";
  const goalSlug = /^[a-z0-9-]{1,80}$/.test(rawSlug) ? rawSlug : "";
  const backHref = goalSlug ? `/g/${goalSlug}` : "/";
  const backLabel = goalSlug ? PRODUCT_COPY.BACK_TO_GOAL : PRODUCT_COPY.TEXT_001;

  let status: "success" | "error" = "success";
  let title: string = PRODUCT_COPY.SUCCESS_TITLE;
  let message = "친구의 워드맵에 조용한 응원이 쌓였습니다.";
  let confirmedGoalTitle = "친구의 목표";
  let conversionLease: ConversionLease | null = null;
  let growthState: GrowthState | null = null;

  if (!paymentKey || !orderId || !Number.isInteger(amount)) {
    status = "error";
    title = "결제 정보가 부족해요";
    message = "결제창에서 돌아온 정보가 올바르지 않습니다.";
  } else {
    try {
      const result = await confirmPayment({ paymentKey, orderId, amount });
      // 브라우저는 provider receipt를 관찰할 수 없어 ack하지 않는다. pending은 만료 뒤 재예약된다.
      conversionLease = result.conversionLease ?? null;
      if (goalSlug && Number.isSafeInteger(result.cheerId) && Number(result.cheerId) > 0) {
        growthState = await loadGrowthState(Number(result.cheerId), goalSlug);
      }
      if (result.goalTitle) {
        confirmedGoalTitle = result.goalTitle.trim();
      }
    } catch (error) {
      console.error("[payment/success] confirmation failed", error);
      status = "error";
      title = "결제 확인이 필요해요";
      const code = error instanceof Error && error.message.startsWith("toss_confirm:")
        ? error.message.slice("toss_confirm:".length)
        : "";
      message = TOSS_CONFIRM_ERROR_COPY[code] ?? PRODUCT_COPY.ERROR_GENERIC;
    }
  }

  return (
    <main
      className={`payment-success-shell${growthState ? " payment-success-shell-growth" : ""}`}
      data-testid="payment-success-page"
    >
      <section className="payment-success-card" data-status={status}>
        {status === "success" && conversionLease && (
          <PurchaseConversion
            orderId={orderId}
            paymentKey={paymentKey}
            value={amount}
            cleanPath={backHref}
            initialLease={conversionLease}
          />
        )}
        <div className="payment-success-icon" aria-hidden="true">
          {status === "success" ? (
            <Clover size={28} strokeWidth={2.5} />
          ) : (
            <CircleAlert size={28} strokeWidth={2.5} />
          )}
        </div>
        <h1>{title}</h1>
        {status === "success" ? (
          <p className="payment-success-message">
            <span>&quot;{confirmedGoalTitle}&quot; 목표에 응원을 보냈어요.</span>
            <span>{PRODUCT_COPY.SUCCESS_WORDMAP}</span>
          </p>
        ) : (
          <p className="payment-success-message"><span>{message}</span></p>
        )}
        <div className="payment-success-actions">
          <Link
            href={status === "success" ? backHref : "/"}
            className="payment-success-primary"
            data-testid="payment-success-back"
          >
            {status === "success" ? backLabel : PRODUCT_COPY.TEXT_001}
          </Link>
          {status === "success" && goalSlug && (
            <Link href="/" className="payment-success-secondary">
              {PRODUCT_COPY.TEXT_001}
            </Link>
          )}
        </div>
      </section>
      {status === "success" && growthState && (
        <DopamineGrowthOverlay {...growthState} />
      )}
    </main>
  );
}
