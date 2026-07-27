"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GoalEditSheetProps {
  goalId: number;
  initialTitle: string;
  initialReason: string | null;
  initialDueDate: string;
  editable: boolean;
}

interface GoalFormValues {
  title: string;
  reason: string;
  dueDate: string;
}

type GoalFormErrors = Partial<Record<keyof GoalFormValues, string>>;

function validateGoal(values: GoalFormValues): GoalFormErrors {
  const errors: GoalFormErrors = {};
  const title = normalizeTitle(values.title);

  if (!title) {
    errors.title = "목표를 입력해 주세요.";
  } else if (title.length < 2) {
    errors.title = "목표는 2자 이상 입력해 주세요.";
  }

  if (!values.dueDate || Number.isNaN(new Date(values.dueDate).getTime())) {
    errors.dueDate = "올바른 마감일을 선택해 주세요.";
  }

  return errors;
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s*해낼게\s*$/, "").trim();
}

export function GoalEditSheet({
  goalId,
  initialTitle,
  initialReason,
  initialDueDate,
  editable,
}: GoalEditSheetProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savedValues, setSavedValues] = useState<GoalFormValues>({
    title: initialTitle,
    reason: initialReason ?? "",
    dueDate: initialDueDate,
  });
  const [values, setValues] = useState<GoalFormValues>(savedValues);
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openSheet() {
    setValues(savedValues);
    setErrors({});
    setSaveError(null);
    setOpen(true);
  }

  function closeSheet() {
    if (saving) return;
    setOpen(false);
  }

  function updateField(field: keyof GoalFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function saveGoal() {
    const nextErrors = validateGoal(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setSaveError(null);

    const normalized: GoalFormValues = {
      title: normalizeTitle(values.title),
      reason: values.reason.trim(),
      dueDate: values.dueDate,
    };
    const supabase = createClient();
    const { error } = await supabase.rpc("update_goal", {
      p_goal_id: goalId,
      p_title: normalized.title,
      p_reason: normalized.reason || null,
      p_due_date: normalized.dueDate,
    });

    setSaving(false);

    if (error) {
      console.error("[GoalEditSheet] update_goal error:", error);
      setSaveError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setSavedValues(normalized);
    setValues(normalized);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <section
        className="mb-3 rounded-[14px] p-4"
        style={{ background: "#fff", border: "1px solid #E8E4DC" }}
        data-testid="goal-details-card"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold" style={{ color: "#6F6A60" }}>
            왜요?
          </p>
          {editable && (
            <button
              type="button"
              onClick={openSheet}
              className="flex min-h-10 items-center gap-1 rounded-[12px] px-3 text-[11.5px] font-bold"
              style={{ background: "#F4EFE6", color: "#14613A" }}
              data-testid="open-goal-edit-sheet"
            >
              <Pencil size={14} aria-hidden="true" />
              목표 편집
            </button>
          )}
        </div>
        <p
          className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed"
          style={{ color: savedValues.reason ? "#16140F" : "#9C968B" }}
          data-testid="goal-reason"
        >
          {savedValues.reason || "아직 이유를 적지 않았어요."}
        </p>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4"
          style={{ background: "rgba(22,20,15,0.32)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-edit-title"
          data-testid="goal-edit-sheet"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSheet();
          }}
        >
          <div
            className="w-full max-w-[430px] rounded-[20px] p-5"
            style={{
              background: "#fff",
              border: "1px solid #E8E4DC",
              boxShadow: "0 8px 30px rgba(0,0,0,.12)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-extrabold" style={{ color: "#14613A" }}>
                  내 목표
                </p>
                <h2
                  id="goal-edit-title"
                  className="mt-1 text-[19px] font-black"
                  style={{ color: "#16140F" }}
                >
                  목표를 편집할게요
                </h2>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                disabled={saving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ color: "#6F6A60", background: "#F3F0EA" }}
                aria-label="목표 편집 닫기"
              >
                <X size={18} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-goal-title"
                  className="text-[11px] font-bold tracking-wider"
                  style={{ color: "#6F6A60" }}
                >
                  목표
                </label>
                <div
                  className="flex items-center gap-2 rounded-[12px] px-4 py-3"
                  style={{
                    background: "#fff",
                    border: `1px solid ${errors.title ? "#D9483B" : "#E8E4DC"}`,
                  }}
                >
                  <input
                    id="edit-goal-title"
                    value={values.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-bold outline-none"
                    style={{ color: "#16140F" }}
                    maxLength={60}
                    autoComplete="off"
                    data-testid="edit-goal-title-input"
                  />
                  <span className="shrink-0 text-[13px] font-bold" style={{ color: "#14613A" }}>
                    해낼게
                  </span>
                </div>
                {errors.title && (
                  <p className="text-[12px]" style={{ color: "#D9483B" }} role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-goal-due-date"
                  className="text-[11px] font-bold tracking-wider"
                  style={{ color: "#6F6A60" }}
                >
                  언제까지?
                </label>
                <input
                  id="edit-goal-due-date"
                  type="date"
                  value={values.dueDate}
                  onChange={(event) => updateField("dueDate", event.target.value)}
                  className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none"
                  style={{
                    background: "#fff",
                    color: "#16140F",
                    border: `1px solid ${errors.dueDate ? "#D9483B" : "#E8E4DC"}`,
                    fontFamily: "inherit",
                  }}
                  data-testid="edit-goal-due-date-input"
                />
                {errors.dueDate && (
                  <p className="text-[12px]" style={{ color: "#D9483B" }} role="alert">
                    {errors.dueDate}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="edit-goal-reason"
                  className="text-[11px] font-bold tracking-wider"
                  style={{ color: "#6F6A60" }}
                >
                  왜요?{" "}
                  <span className="text-[10px] font-normal" style={{ color: "#9C968B" }}>
                    (응원의 이유가 돼요 · 선택)
                  </span>
                </label>
                <textarea
                  id="edit-goal-reason"
                  value={values.reason}
                  onChange={(event) => updateField("reason", event.target.value)}
                  rows={3}
                  maxLength={200}
                  className="w-full resize-none rounded-[12px] px-4 py-3 text-[14px] outline-none"
                  style={{
                    background: "#fff",
                    color: "#16140F",
                    border: "1px solid #E8E4DC",
                    fontFamily: "inherit",
                  }}
                  data-testid="edit-goal-reason-input"
                />
                <p className="text-right text-[11px]" style={{ color: "#9C968B" }}>
                  {values.reason.length}/200
                </p>
              </div>

              {saveError && (
                <p
                  className="rounded-[12px] px-4 py-3 text-[12.5px]"
                  style={{ background: "#FBEAE7", color: "#D9483B" }}
                  role="alert"
                >
                  {saveError}
                </p>
              )}

              <button
                type="button"
                onClick={saveGoal}
                disabled={saving}
                className="w-full rounded-[14px] py-4 text-[15px] font-extrabold text-white"
                style={{ background: "#1B8A4F", opacity: saving ? 0.7 : 1 }}
                data-testid="save-goal-edit"
              >
                {saving ? "저장 중…" : "변경사항 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
