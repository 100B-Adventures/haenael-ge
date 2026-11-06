"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-auth-phoneconsentnotice";

const PHONE_CONSENT_PENDING_KEY = "haenael_phone_consent_pending";

type Props = {
  hasPhone: boolean;
  redirectPath: "/me" | "/cashout";
  context: "me" | "cashout";
};

export function PhoneConsentNotice({ hasPhone, redirectPath, context }: Props) {
  const [returnedWithoutPhone, setReturnedWithoutPhone] = useState(false);

  useEffect(() => {
    const pending = window.sessionStorage.getItem(PHONE_CONSENT_PENDING_KEY);
    if (pending !== redirectPath) return;

    if (hasPhone) {
      window.sessionStorage.removeItem(PHONE_CONSENT_PENDING_KEY);
      setReturnedWithoutPhone(false);
      return;
    }

    // Keep the failed-return marker until Kakao actually supplies a phone number.
    // Next.js can remount this client subtree after hydration; consuming the marker
    // before the state update survives would make the remount show the CTA again.
    setReturnedWithoutPhone(true);
  }, [hasPhone, redirectPath]);

  if (hasPhone) return null;

  if (returnedWithoutPhone) {
    return (
      <section
        className="mb-4 rounded-[14px] border border-[var(--amber-line)] bg-[var(--amber-soft)] px-4 py-3"
        data-testid="phone-consent-notice"
        role="status"
      >
        <p className="text-[13.5px] font-extrabold text-amber-ink">{PRODUCT_COPY.TEXT_001}</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[#8A6218]">
          {context === "cashout"
            ? PRODUCT_COPY.TEXT_002
            : PRODUCT_COPY.TEXT_003}
        </p>
      </section>
    );
  }

  const title =
    context === "me"
      ? "알림 받으려면 전화번호 동의가 필요해요"
      : "환전 안내를 받을 전화번호가 필요해요";
  const description =
    context === "me"
      ? "카카오에서 한 번 동의하면 새 응원과 환전 안내를 받을 수 있어요."
      : "카카오에서 동의하면 전화번호를 바로 불러와요. 안 되면 아래에 직접 입력할 수 있어요.";

  return (
    <section
      className="mb-4 rounded-[14px] border border-[#B7DFC5] bg-[var(--accent)] px-4 py-4"
      data-testid="phone-consent-notice"
      role="status"
    >
      <p className="text-[13.5px] font-extrabold text-[var(--accent-foreground)]">
        {title}
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-[#3D7A5A]">
        {description}
      </p>
      <Link
        href={`/auth/kakao/start?redirect=${encodeURIComponent(redirectPath)}`}
        prefetch={false}
        onClick={() => {
          window.sessionStorage.setItem(
            PHONE_CONSENT_PENDING_KEY,
            redirectPath,
          );
        }}
        className="mt-3 block rounded-[12px] bg-[#FEE500] px-4 py-3 text-center text-[13px] font-extrabold text-[#191600]"
        data-testid="phone-consent-cta"
      >{PRODUCT_COPY.TEXT_004}</Link>
    </section>
  );
}
