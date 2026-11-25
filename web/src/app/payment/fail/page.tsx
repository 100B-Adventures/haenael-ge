// payment/fail/page.tsx — 토스 failUrl → ErrorState

import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-payment-fail-page";

type Props = {
  searchParams: Promise<{
    code?: string;
    message?: string;
    orderId?: string;
    goalSlug?: string;
  }>;
};

const FAILURE_COPY: Record<string, { title: string; message: string; canRetry: boolean }> = {
  PAY_PROCESS_CANCELED: {
    title: PRODUCT_COPY.CANCELED_TITLE,
    message: PRODUCT_COPY.CANCELED_MESSAGE,
    canRetry: true,
  },
  REJECT_CARD_COMPANY: {
    title: PRODUCT_COPY.REJECTED_TITLE,
    message: PRODUCT_COPY.REJECTED_MESSAGE,
    canRetry: true,
  },
  PAY_PROCESS_ABORTED: {
    title: PRODUCT_COPY.UNKNOWN_TITLE,
    message: PRODUCT_COPY.UNKNOWN_MESSAGE,
    canRetry: false,
  },
};

export default async function PaymentFailPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawSlug = params.goalSlug ?? "";
  const goalSlug = /^[a-z0-9-]{1,80}$/.test(rawSlug) ? rawSlug : "";
  const failure = FAILURE_COPY[params.code ?? ""] ?? {
    title: PRODUCT_COPY.UNKNOWN_TITLE,
    message: PRODUCT_COPY.UNKNOWN_MESSAGE,
    canRetry: false,
  };

  return (
    <main
      className="flex min-h-svh flex-col items-center px-6 pt-16 text-center [background-color:var(--background)]!"
      data-testid="payment-fail-page"
      data-payment-state={failure.canRetry ? "not-approved" : "unknown"}
    >
      <div className="w-full max-w-[390px] p-7">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[26px] [background-color:#FCEEEE]! [color:#B3261E]!"
          aria-hidden="true"
        >
          <CircleAlert size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-[23px] font-black [color:var(--foreground)]!">{failure.title}</h1>
        <p className="mt-3 text-[14px] leading-relaxed [color:var(--muted-foreground)]!">{failure.message}</p>
        {!failure.canRetry && params.orderId && (
          <p className="mt-2 text-[13px] [color:var(--muted-foreground)]!">
            주문번호 {params.orderId}
          </p>
        )}
        {goalSlug && (
          <Link
            href={`/g/${goalSlug}`}
            className="mt-6 block rounded-[16px] py-4 text-[15px] font-extrabold [background-color:var(--primary)]! [color:var(--card)]!"
          >{failure.canRetry ? PRODUCT_COPY.RETRY : PRODUCT_COPY.BACK_TO_GOAL}</Link>
        )}
        <Link
          href="/"
          className={`${goalSlug ? "mt-2" : "mt-6"} flex min-h-11 items-center justify-center rounded-[16px] text-[14px] font-bold [color:var(--muted-foreground)]!`}
        >해낼게 홈으로</Link>
      </div>
    </main>
  );
}
