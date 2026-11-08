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

export default async function PaymentFailPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawSlug = params.goalSlug ?? "";
  const goalSlug = /^[a-z0-9-]{1,80}$/.test(rawSlug) ? rawSlug : "";

  return (
    <main
      className="flex min-h-svh flex-col items-center px-6 pt-16 text-center [background-color:var(--background)]!"
      data-testid="payment-fail-page"
    >
      <div className="w-full max-w-[390px] p-7">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[26px] [background-color:#FCEEEE]! [color:#B3261E]!"
          aria-hidden="true"
        >
          <CircleAlert size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-[23px] font-black [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_001}</h1>
        <p className="mt-3 text-[14px] leading-relaxed [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_002}</p>
        {goalSlug && (
          <Link
            href={`/g/${goalSlug}`}
            className="mt-6 block rounded-[16px] py-4 text-[15px] font-extrabold [background-color:var(--primary)]! [color:var(--card)]!"
          >다시 응원하기</Link>
        )}
        <Link
          href="/"
          className={`${goalSlug ? "mt-2" : "mt-6"} flex min-h-11 items-center justify-center rounded-[16px] text-[14px] font-bold [color:var(--muted-foreground)]!`}
        >해낼게 홈으로</Link>
      </div>
    </main>
  );
}
