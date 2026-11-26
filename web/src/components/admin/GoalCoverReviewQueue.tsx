"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-admin-goalcoverreviewqueue";

export type CoverReviewItem = {
  asset_id: string;
  goal_id: number;
  goal_title: string;
  owner_nickname: string;
  quarantine_path: string;
  public_path?: string | null;
  status?: "REVIEW" | "APPROVED";
  mime_type: string;
  byte_size: number;
  content_sha256: string;
  created_at: string;
  is_stale?: boolean;
  preview_url?: string | null;
};

export function GoalCoverReviewQueue(
  { initialItems }: { initialItems: CoverReviewItem[] },
) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function decide(assetId: string, decision: "APPROVE" | "REJECT" | "REMOVE") {
    setPending(assetId);
    setError(false);
    const supabase = createClient();
    const { error: invokeError } = await supabase.functions.invoke(
      "admin-review-goal-cover",
      {
        body: {
          asset_id: assetId,
          decision,
          rejection_code: decision === "REJECT" ? "other" : null,
        },
      },
    );
    setPending(null);
    if (invokeError) return setError(true);
    setItems((current) => current.filter((item) => item.asset_id !== assetId));
  }
  return (
    <section
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
      data-testid="goal-cover-review-queue"
    >
      <div className="mb-4">
        <h2 className="text-lg font-extrabold">{PRODUCT_COPY.TEXT_001}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{PRODUCT_COPY.TEXT_002}</p>
      </div>
      {items.length === 0
        ? (
          <p className="py-8 text-center text-muted-foreground">{PRODUCT_COPY.TEXT_003}</p>
        )
        : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.asset_id} className="rounded-xl border p-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:items-center">
                  {item.preview_url ? (
                    <img
                      src={item.preview_url}
                      alt={`${item.owner_nickname}님의 ${item.goal_title} 목표 사진`}
                      className="aspect-video w-full rounded-lg bg-muted object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                      {PRODUCT_COPY.TEXT_008}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong>{item.goal_title}</strong>
                      <p className="text-sm text-muted-foreground">
                        {item.owner_nickname} ·{" "}
                        {(item.byte_size / 1024).toFixed(0)}KB
                      </p>
                      {item.is_stale && (
                        <p className="mt-1 text-sm font-bold text-danger-ink">
                          {PRODUCT_COPY.TEXT_009}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {item.status === "APPROVED" ? (
                        <button
                          className="min-h-11 rounded-lg bg-danger-soft px-4 font-bold text-danger-ink"
                          disabled={pending === item.asset_id}
                          onClick={() => decide(item.asset_id, "REMOVE")}
                        >{PRODUCT_COPY.TEXT_007}</button>
                      ) : <>
                        <button
                          className="min-h-11 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
                          disabled={pending === item.asset_id || item.is_stale}
                          onClick={() => decide(item.asset_id, "APPROVE")}
                        >{PRODUCT_COPY.TEXT_004}</button>
                        <button
                          className="min-h-11 rounded-lg bg-danger-soft px-4 font-bold text-danger-ink"
                          disabled={pending === item.asset_id}
                          onClick={() => decide(item.asset_id, "REJECT")}
                        >{PRODUCT_COPY.TEXT_005}</button>
                      </>}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-ink">{PRODUCT_COPY.TEXT_006}</p>
      )}
    </section>
  );
}
