import {
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { PRODUCT_COPY } from "@/lib/copy/generated/app-receiver-me-loading";

export default function ReceiverHomeLoading() {
  return (
    <ReceiverPageShell testId="receiver-home-loading" bottomSafe>
      <ReceiverTopBar variant="home" />
      <div role="status" aria-busy="true" aria-live="polite">
        <div
          className="receiver-balance-skeleton h-14 w-3/4 rounded-sm"
          aria-hidden="true"
        />
        <p className="mt-6 text-[length:var(--text-label-small)]! font-bold text-muted-foreground">{PRODUCT_COPY.TEXT_001}</p>
        <div className="mt-2 space-y-3" aria-hidden="true">
          <div className="receiver-balance-skeleton h-12 rounded-sm" />
          <div className="receiver-balance-skeleton h-12 rounded-sm" />
        </div>
        <div className="mt-6 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[length:var(--text-meta-micro)]! text-muted-foreground">{PRODUCT_COPY.TEXT_002}</p>
              <div
                className="receiver-balance-skeleton mt-2 h-6 w-28 rounded-sm"
                aria-hidden="true"
              />
              <div
                className="receiver-balance-skeleton mt-2 h-3 w-40 rounded-sm"
                aria-hidden="true"
              />
            </div>
            <span
              className="receiver-spinner text-primary"
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 text-[length:var(--text-label-small)]! leading-relaxed text-muted-foreground">{PRODUCT_COPY.TEXT_003}</p>
        </div>
      </div>
    </ReceiverPageShell>
  );
}
