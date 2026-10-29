"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ReportButton } from "@/components/common/ReportButton";

export function GoalPublicMenu({ goalId }: { goalId: number }) {
  const [open, setOpen] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("링크를 복사했어요.");
      setOpen(false);
    } catch {
      toast.error("링크를 복사하지 못했어요.");
    }
  }

  return (
    <div className="goal-public-menu">
      <button
        type="button"
        className="goal-public-menu-trigger"
        aria-label="이 목표 더보기"
        aria-expanded={open}
        aria-controls="goal-public-menu-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {open && (
        <div
          id="goal-public-menu-panel"
          className="goal-public-menu-panel"
          role="menu"
        >
          <button type="button" role="menuitem" onClick={copyLink}>
            링크 복사
          </button>
          <div role="none">
            <ReportButton targetType="GOAL" targetId={goalId} variant="text" />
          </div>
        </div>
      )}
    </div>
  );
}
