// payment/fail/page.tsx — 토스 failUrl → ErrorState

import Link from "next/link";
import { CircleAlert } from "lucide-react";

type Props = {
  searchParams: Promise<{
    code?: string;
    message?: string;
    orderId?: string;
  }>;
};

export default async function PaymentFailPage({ searchParams }: Props) {
  const params = await searchParams;
  const message = params.message ?? "결제가 완료되지 않았습니다.";

  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center [background-color:var(--background)]!"
      data-testid="payment-fail-page"
    >
      <div className="w-full max-w-[390px] rounded-[24px] p-7 [background-color:var(--card)]! [border:1px_solid_var(--border)]!">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[26px] [background-color:#FCEEEE]! [color:#B3261E]!"
          aria-hidden="true"
        >
          <CircleAlert size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-[23px] font-black [color:var(--foreground)]!">
          결제가 멈췄어요
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed [color:var(--muted-foreground)]!">
          {message}
        </p>
        <Link
          href="/"
          className="mt-6 block rounded-[16px] py-4 text-[15px] font-extrabold [background-color:var(--primary)]! [color:var(--card)]!"
        >
          다시 돌아가기
        </Link>
      </div>
    </main>
  );
}
