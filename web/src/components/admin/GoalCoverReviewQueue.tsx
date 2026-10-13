"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type CoverReviewItem = {
  asset_id: string;
  goal_id: number;
  goal_title: string;
  owner_nickname: string;
  quarantine_path: string;
  mime_type: string;
  byte_size: number;
  content_sha256: string;
  created_at: string;
};

export function GoalCoverReviewQueue(
  { initialItems }: { initialItems: CoverReviewItem[] },
) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function decide(assetId: string, decision: "APPROVE" | "REJECT") {
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
        <h2 className="text-lg font-extrabold">목표 커버 검수</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          원본은 private bucket에서만 열고, 승인된 PUBLIC 커버만 public
          bucket으로 복사합니다.
        </p>
      </div>
      {items.length === 0
        ? (
          <p className="py-8 text-center text-muted-foreground">
            검수 대기 커버가 없습니다.
          </p>
        )
        : (
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.asset_id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong>{item.goal_title}</strong>
                    <p className="text-sm text-muted-foreground">
                      {item.owner_nickname} ·{" "}
                      {(item.byte_size / 1024).toFixed(0)}KB · {item.mime_type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="min-h-11 rounded-lg bg-primary px-4 font-bold text-primary-foreground"
                      disabled={pending === item.asset_id}
                      onClick={() =>
                        decide(item.asset_id, "APPROVE")}
                    >
                      승인
                    </button>
                    <button
                      className="min-h-11 rounded-lg bg-danger-soft px-4 font-bold text-danger-ink"
                      disabled={pending === item.asset_id}
                      onClick={() =>
                        decide(item.asset_id, "REJECT")}
                    >
                      반려
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-ink">
          검수 결과를 저장하지 못했습니다.
        </p>
      )}
    </section>
  );
}
