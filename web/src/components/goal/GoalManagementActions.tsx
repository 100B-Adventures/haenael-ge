"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GoalManagementActions({ goalId, slug, active }: { goalId: number; slug: string; active: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/g/${slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("링크를 복사하지 못했어요. 다시 시도해 주세요.");
    }
  }

  async function closeGoal() {
    if (!window.confirm("이 목표를 종료하면 다시 진행 상태로 되돌릴 수 없습니다. 종료할까요?")) return;
    setClosing(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase.rpc("close_my_goal", {
        p_goal_id: goalId,
      });
      const result = data as { status?: string } | null;
      if (updateError || result?.status !== "CLOSED") {
        setError("목표를 종료하지 못했어요. 다시 시도해 주세요.");
        return;
      }
      router.push("/me");
      router.refresh();
    } catch {
      setError("목표를 종료하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="goal-management-actions" aria-labelledby="goal-management-actions-title">
      <h2 id="goal-management-actions-title">이 목표 관리</h2>
      <div>
        <Link href={`/g/${slug}`}><Eye aria-hidden="true" />친구 화면 미리보기</Link>
        <button type="button" className="is-primary" onClick={() => void copyLink()}>
          <Share2 aria-hidden="true" />{copied ? "응원 링크 복사됨" : "응원 링크 복사"}
        </button>
      </div>
      {active && (
        <button type="button" className="goal-close-button" disabled={closing} onClick={() => void closeGoal()}>
          {closing ? "종료 중…" : "이 목표 종료하기"}
        </button>
      )}
      {error && <p className="social-error" role="alert">{error}</p>}
    </section>
  );
}
