// payment/success/page.tsx — 토스 successUrl → invoke('toss-confirm')

import Link from "next/link";
import { CircleAlert, Clover } from "lucide-react";
import { AnalyticsEvent } from "@/components/analytics/AnalyticsEvent";

type Props = {
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    goalSlug?: string;
  }>;
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
    throw new Error(body?.error?.message ?? "결제 승인 실패");
  }
  return body as { goalTitle?: string };
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
  const backLabel = goalSlug ? "친구 목표로 돌아가기" : "해낼게 홈으로";

  let status: "success" | "error" = "success";
  let title = "응원이 전달됐어요";
  let message = "친구의 워드맵에 조용한 응원이 쌓였습니다.";

  if (!paymentKey || !orderId || !Number.isInteger(amount)) {
    status = "error";
    title = "결제 정보가 부족해요";
    message = "결제창에서 돌아온 정보가 올바르지 않습니다.";
  } else {
    try {
      const result = await confirmPayment({ paymentKey, orderId, amount });
      if (result.goalTitle) {
        message = `${result.goalTitle.replace(/\s*해낼게\s*$/, "")} 목표에 응원이 전달됐습니다.`;
      }
    } catch (error) {
      console.error("[payment/success] confirmation failed", error);
      status = "error";
      title = "결제 확인이 필요해요";
      message = "결제 상태를 바로 확인하지 못했어요. 잠시 후 다시 확인해 주세요.";
    }
  }

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center [background-color:var(--background)]!"
      data-testid="payment-success-page"
    >
      <div className="w-full max-w-[390px] rounded-[24px] p-7 [background-color:var(--card)]! [border:1px_solid_var(--border)]!">
        {status === "success" && (
          <AnalyticsEvent
            event="payment_success"
            params={{ value: amount, currency: "KRW" }}
          />
        )}
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[26px]"
          style={{
            background: status === "success" ? "var(--accent)" : "#FCEEEE",
            color: status === "success" ? "var(--primary)" : "#B3261E",
          }}
          aria-hidden="true"
        >
          {status === "success" ? (
            <Clover size={28} strokeWidth={2.5} />
          ) : (
            <CircleAlert size={28} strokeWidth={2.5} />
          )}
        </div>
        <h1 className="text-[23px] font-black [color:var(--foreground)]!">
          {title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed [color:var(--muted-foreground)]!">
          {message}
        </p>
        <Link
          href={status === "success" ? backHref : "/"}
          className="mt-6 block rounded-[16px] py-4 text-[15px] font-extrabold [background-color:var(--primary)]! [color:var(--card)]!"
          data-testid="payment-success-back"
        >
          {status === "success" ? backLabel : "해낼게 홈으로"}
        </Link>
      </div>
    </main>
  );
}
