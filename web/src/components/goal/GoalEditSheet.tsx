"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { DdayChip, StatusChip } from "@/components/goal/DdayChip";
import { createClient } from "@/lib/supabase/client";

interface GoalEditSheetProps {
  goalId: number;
  initialTitle: string;
  initialReason: string | null;
  initialDueDate: string;
  status: "ACTIVE" | "CLOSED" | "DELETED";
  editable: boolean;
}

interface GoalFormValues {
  title: string;
  reason: string;
  dueDate: string;
}

type GoalField = keyof GoalFormValues;
type GoalFormErrors = Partial<Record<GoalField, string>>;

function normalizeTitle(title: string) {
  return title.trim().replace(/\s*해낼게\s*$/, "").trim();
}

function validateGoal(values: GoalFormValues): GoalFormErrors {
  const errors: GoalFormErrors = {};
  const title = normalizeTitle(values.title);
  if (!title) errors.title = "목표를 입력해 주세요.";
  else if (title.length < 2) errors.title = "목표는 2자 이상 입력해 주세요.";
  if (!values.dueDate || Number.isNaN(new Date(values.dueDate).getTime())) {
    errors.dueDate = "올바른 마감일을 선택해 주세요.";
  }
  return errors;
}

export function GoalEditSheet({
  goalId,
  initialTitle,
  initialReason,
  initialDueDate,
  status,
  editable,
}: GoalEditSheetProps) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<GoalField | null>(null);
  const [savedValues, setSavedValues] = useState<GoalFormValues>({
    title: initialTitle,
    reason: initialReason ?? "",
    dueDate: initialDueDate,
  });
  const [values, setValues] = useState<GoalFormValues>(savedValues);
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const displayTitle = savedValues.title.trim();
  // DESIGN.md D-030-F: 모든 '게' 종결(구두점 허용)은 브랜드 suffix를 더하지 않는다.
  const needsHaenaelSuffix = !/게[.!?]?$/u.test(displayTitle);

  function openField(field: GoalField) {
    setValues(savedValues);
    setErrors({});
    setSaveError(null);
    setEditingField(field);
  }

  function closeField() {
    if (saving) return;
    setEditingField(null);
    setValues(savedValues);
    setErrors({});
    setSaveError(null);
  }

  function updateField(field: GoalField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
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
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_goal", {
        p_goal_id: goalId,
        p_title: normalized.title,
        p_reason: normalized.reason || "",
        p_due_date: normalized.dueDate,
      });
      if (error) {
        console.error("[GoalEditSheet] update_goal error:", error);
        setSaveError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setSavedValues(normalized);
      setValues(normalized);
      setEditingField(null);
      router.refresh();
    } catch (error) {
      console.error("[GoalEditSheet] update_goal request failed:", error);
      setSaveError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  const editorActions = (
    <div className="goal-inline-form-actions">
      <button type="button" onClick={closeField} disabled={saving}>취소</button>
      <button type="button" onClick={() => void saveGoal()} disabled={saving} data-testid="save-goal-edit">
        {saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );

  return (
    <section className="goal-inline-editor" data-testid="goal-details-card">
      <div className="goal-inline-chips">
        {editable
          ? (
            <button type="button" className="goal-inline-date-target" aria-label="마감일 편집" aria-expanded={editingField === "dueDate"} onClick={() => openField("dueDate")}>
              <DdayChip dueDate={savedValues.dueDate} tone="warm" />
            </button>
          )
          : <DdayChip dueDate={savedValues.dueDate} tone="warm" />}
        <StatusChip status={status} tone="public" />
      </div>

      {editingField === "dueDate" && (
        <div className="goal-inline-form" data-testid="goal-edit-sheet">
          <label htmlFor="edit-goal-due-date">마감일</label>
          <input id="edit-goal-due-date" type="date" value={values.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} data-testid="edit-goal-due-date-input" aria-invalid={Boolean(errors.dueDate)} />
          {errors.dueDate && <p role="alert">{errors.dueDate}</p>}
          {saveError && <p role="alert">{saveError}</p>}
          {editorActions}
        </div>
      )}

      {editable
        ? (
          <div className="goal-inline-display-row goal-inline-title">
            <span className="goal-inline-display-copy" data-testid="goal-inline-title">
              {displayTitle}{needsHaenaelSuffix && <> <strong>해낼게</strong></>}
              <button
                type="button"
                className="goal-inline-pencil-button"
                data-testid="open-goal-edit-sheet"
                aria-label="목표 제목 편집"
                aria-expanded={editingField === "title"}
                onClick={() => openField("title")}
              >
                <Pencil aria-hidden="true" />
              </button>
            </span>
          </div>
        )
        : <div className="goal-inline-display-row goal-inline-title"><span data-testid="goal-inline-title">{displayTitle}{needsHaenaelSuffix && <> <strong>해낼게</strong></>}</span></div>}

      {editingField === "title" && (
        <div className="goal-inline-form" data-testid="goal-edit-sheet">
          <label htmlFor="edit-goal-title">목표</label>
          <div className="goal-inline-title-input">
            <input id="edit-goal-title" value={values.title} onChange={(event) => updateField("title", event.target.value)} maxLength={60} autoComplete="off" data-testid="edit-goal-title-input" aria-invalid={Boolean(errors.title)} />
            <span>해낼게</span>
          </div>
          {errors.title && <p role="alert">{errors.title}</p>}
          {saveError && <p role="alert">{saveError}</p>}
          {editorActions}
        </div>
      )}

      {editable
        ? (
          <div className="goal-inline-display-row goal-inline-why">
            <span className="goal-inline-display-copy whitespace-pre-wrap" data-empty={!savedValues.reason} data-testid="goal-reason">
              {savedValues.reason || "아직 이유를 적지 않았어요."}
              <button
                type="button"
                className="goal-inline-pencil-button"
                aria-label="WHY 편집"
                aria-expanded={editingField === "reason"}
                onClick={() => openField("reason")}
              >
                <Pencil aria-hidden="true" />
              </button>
            </span>
          </div>
        )
        : <div className="goal-inline-display-row goal-inline-why"><span className="whitespace-pre-wrap" data-empty={!savedValues.reason} data-testid="goal-reason">{savedValues.reason || "아직 이유를 적지 않았어요."}</span></div>}

      {editingField === "reason" && (
        <div className="goal-inline-form" data-testid="goal-edit-sheet">
          <label htmlFor="edit-goal-reason">WHY <small>응원의 이유가 돼요. 선택</small></label>
          <textarea id="edit-goal-reason" value={values.reason} onChange={(event) => updateField("reason", event.target.value)} rows={3} maxLength={200} data-testid="edit-goal-reason-input" />
          <small className="goal-inline-counter">{values.reason.length}/200</small>
          {saveError && <p role="alert">{saveError}</p>}
          {editorActions}
        </div>
      )}
    </section>
  );
}
