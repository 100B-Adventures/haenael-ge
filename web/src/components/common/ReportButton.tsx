"use client";
// ReportButton + ReportSheet — 신고 버튼 + 신고 사유 시트
// F7: target(GOAL/CHEER), target_id, reason → EF `report` R1.
// 게스트·비로그인·인증 유저 모두 신고 가능 (RLS report_insert_any).
// MVP: 신고 접수만. 운영자 수동 → soft-delete.
// GA4: report_submitted 이벤트.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-common-reportbutton";

const REASON_PRESETS = [
  "스팸 또는 광고",
  "욕설·혐오 표현",
  "개인정보 노출",
  "허위 정보",
  "기타",
] as const;

export interface ReportButtonProps {
  /** 신고 대상 타입 */
  targetType: "GOAL" | "CHEER";
  /** 신고 대상 ID */
  targetId: number;
  /** 버튼 스타일 변형 */
  variant?: "icon" | "text";
  className?: string;
}

export function ReportButton({
  targetType,
  targetId,
  variant = "icon",
  className,
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`flex min-h-[var(--tap-min-size)] min-w-[var(--tap-min-size)] items-center justify-center gap-1 rounded-lg transition-opacity hover:opacity-70 active:opacity-70 focus-visible:outline-none focus-visible:ring-2 ${className ?? ""} [font-size:var(--text-wordmark)]! [color:var(--muted-color)]!`}
        onClick={() => setOpen(true)}
        aria-label="신고하기"
        data-testid="report-button"
      >
        {variant === "icon" ? (
          <span aria-hidden="true">🚩</span>
        ) : (
          <>
            <span aria-hidden="true">🚩</span>
            <span>{PRODUCT_COPY.TEXT_001}</span>
          </>
        )}
      </button>

      {open && (
        <ReportSheet
          targetType={targetType}
          targetId={targetId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── ReportSheet (바텀시트) ──────────────────────────────────────────────────

interface ReportSheetProps {
  targetType: "GOAL" | "CHEER";
  targetId: number;
  onClose: () => void;
}

function ReportSheet({ targetType, targetId, onClose }: ReportSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createClient();

  const reason = selectedReason === "기타" ? customReason : selectedReason;
  const canSubmit = reason.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

      // EF report R1 호출
      const res = await fetch(`${supabaseUrl}/functions/v1/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? anonKey}`,
        },
        body: JSON.stringify({
          targetType,
          targetId,
          reason: reason.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const msg =
          (errData as { error?: { message?: string } })?.error?.message ??
          "신고 접수 실패. 잠시 후 재시도해주세요.";
        toast.error(msg);
        return;
      }

      // GA4
      if (typeof window !== "undefined" && "gtag" in window) {
        (window as typeof window & { gtag: Function }).gtag(
          "event",
          "report_submitted",
          {
            // eslint-disable-line @typescript-eslint/ban-types
            target_type: targetType,
            target_id: targetId,
          },
        );
      }

      setDone(true);
    } catch {
      toast.error("신고 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* 시트 */}
      <div
        className="fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl pb-safe-bottom [background-color:var(--background)]!"
        role="dialog"
        aria-modal="true"
        aria-label="신고하기"
        data-testid="report-sheet"
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full [background-color:#D5D0C8]!" />
        </div>

        <div className="px-6 pt-3 pb-6">
          {done ? (
            // 완료 상태
            <div
              className="flex flex-col items-center gap-3 py-8"
              data-testid="report-done"
            >
              <span className="text-4xl" aria-hidden="true">
                ✅
              </span>
              <p className="text-center text-[15px] font-semibold [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_002}</p>
              <p className="text-center text-[13px] [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_003}<br />{PRODUCT_COPY.TEXT_004}</p>
              <button
                type="button"
                className="mt-2 rounded-full px-6 py-2 text-[14px] font-semibold text-white [background-color:var(--accent-foreground)]!"
                onClick={onClose}
              >{PRODUCT_COPY.TEXT_005}</button>
            </div>
          ) : (
            // 신고 폼
            <>
              <h2 className="mb-1 text-[17px] font-bold [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_006}</h2>
              <p className="mb-4 text-[13px] [color:var(--muted-foreground)]!">
                {targetType === "GOAL" ? PRODUCT_COPY.TEXT_007 : PRODUCT_COPY.TEXT_008}{PRODUCT_COPY.TEXT_009}</p>

              {/* 사유 선택 */}
              <div
                className="flex flex-col gap-2 mb-4"
                role="group"
                aria-label={PRODUCT_COPY.TEXT_010}
              >
                {REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-[14px] transition-colors"
                    style={{
                      background:
                        selectedReason === preset ? "var(--accent)" : "#F5F2EE",
                      color:
                        selectedReason === preset
                          ? "var(--accent-foreground)"
                          : "var(--foreground)",
                      border:
                        selectedReason === preset
                          ? "1.5px solid var(--accent-foreground)"
                          : "1.5px solid transparent",
                    }}
                    onClick={() => setSelectedReason(preset)}
                    aria-pressed={selectedReason === preset}
                    data-testid={`report-reason-${preset}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* 기타 사유 입력 */}
              {selectedReason === PRODUCT_COPY.TEXT_011 && (
                <textarea
                  className="mb-4 w-full resize-none rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 [background-color:#F5F2EE]! [color:var(--foreground)]! [border:1.5px_solid_#D5D0C8]! [min-height:80px]!"
                  placeholder={PRODUCT_COPY.TEXT_012}
                  maxLength={500}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  data-testid="report-custom-reason"
                  aria-label={PRODUCT_COPY.TEXT_013}
                />
              )}

              {/* 제출 버튼 */}
              <button
                type="button"
                className="w-full rounded-2xl py-3.5 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
                style={{
                  background: canSubmit
                    ? "var(--accent-foreground)"
                    : "#A09B93",
                }}
                disabled={!canSubmit}
                onClick={handleSubmit}
                data-testid="report-submit"
                aria-disabled={!canSubmit}
              >
                {submitting ? PRODUCT_COPY.TEXT_014 : PRODUCT_COPY.TEXT_015}
              </button>

              <button
                type="button"
                className="mt-3 w-full rounded-2xl py-2.5 text-[14px] [color:#A09B93]!"
                onClick={onClose}
                data-testid="report-cancel"
              >{PRODUCT_COPY.TEXT_016}</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
