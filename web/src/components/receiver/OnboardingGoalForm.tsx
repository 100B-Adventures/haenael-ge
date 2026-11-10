"use client";

// components/receiver/OnboardingGoalForm.tsx — ① write-first 목표 작성 폼
// DESIGN.md §7-2: write-first 확정. 저장 시에만 LoginSheet 등장.
// 슬라이스 #4: 실구현.
//
// 상태 흐름:
//  idle → filling (사용자 입력) → login-required (미인증) → saving (DB insert) → done (SlinkCard)
//  로그인 후 복귀: 마운트 시 user 있고 draft 있으면 → auto-save

import { useState, useEffect, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { Check } from "lucide-react";
import { LoginSheet } from "@/components/auth";
import { ShareLinkCard } from "@/components/goal/ShareLinkCard";
import { GoalCover } from "@/components/social/GoalCover";
import { GoalCoverUploadEditor } from "@/components/social/GoalCoverUploadEditor";
import {
  automaticGoalCoverKey,
  GOAL_COVER_PRESETS,
  type GoalCoverPresetKey,
} from "@/components/social/goal-cover-presets";
import {
  saveDraft,
  loadDraft,
  clearDraft,
  savePendingSlug,
  loadPendingSlug,
  clearPendingSlug,
  saveSaveIntent,
  hasSaveIntent,
  clearSaveIntent,
  saveDraftCoverFile,
  loadDraftCoverFile,
  clearDraftCoverFile,
} from "@/lib/utils/draft";
import { uploadGoalCoverFile } from "@/lib/goal-cover/upload";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-receiver-onboardinggoalform";

interface OnboardingGoalFormProps {
  /** 서버에서 전달한 초기 유저 (null = 미인증) */
  initialUser: User | null;
}

interface FormValues {
  title: string;
  reason: string;
  due_date: string;
}

type SaveGoalResult =
  | { slug: string; coverUploadWarning?: string }
  | { error: string }
  | { goalLimitReached: true };

const COVER_KEYS = new Set<string>(GOAL_COVER_PRESETS.map((preset) => preset.key));

function coverKeyOrNull(value: string | null | undefined): GoalCoverPresetKey | null {
  return value && COVER_KEYS.has(value) ? value as GoalCoverPresetKey : null;
}

// ─── 유효성 검사 ──────────────────────────────────────────────────────────────

function validate(
  values: FormValues,
): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (!values.title.trim()) {
    errors.title = "목표를 입력해 주세요.";
  } else if (values.title.trim().length < 2) {
    errors.title = "목표는 2자 이상 입력해 주세요.";
  }
  if (!values.due_date) {
    errors.due_date = "마감일을 선택해 주세요.";
  } else {
    const d = new Date(values.due_date);
    if (isNaN(d.getTime())) {
      errors.due_date = "올바른 날짜를 입력해 주세요.";
    }
    // due_date는 과거도 허용 (적립형=달성 무관)
  }
  return errors;
}

// ─── 기본값: 오늘로부터 90일 ─────────────────────────────────────────────────

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().split("T")[0];
}

// ─── DB insert ───────────────────────────────────────────────────────────────
//
// 다중 목표(설계 §4.4~4.6, 2026-09-21): 1계정 1목표 강제를 폐기하고 계정당
// 진행 중 목표 상한 3개로 바꿨다. 상한 원자 보장은 앱이 아니라 create_goal
// RPC(SECURITY DEFINER + advisory lock)가 한다 — 테이블 직접 INSERT 권한은
// DB에서 회수됐으므로(REVOKE) 이 경로가 유일한 생성 경로다.

async function saveGoalToDB(
  values: FormValues,
  coverPresetKey: GoalCoverPresetKey | null,
  coverFile: File | null,
): Promise<SaveGoalResult> {
  const supabase = createClient();
  const baseArgs = {
    p_title: values.title.trim(),
    // DB가 NULLIF(btrim(p_reason), '')로 빈 문자열을 NULL로 정규화한다.
    // gen types가 p_reason을 string(non-null)으로 좁혀 null 리터럴은 타입 에러 —
    // GoalEditSheet(update_goal)와 동일하게 빈 문자열로 맞춘다.
    p_reason: values.reason.trim() || "",
    p_due_date: values.due_date,
  };
  const { data, error } = coverPresetKey
    ? await supabase.rpc("create_goal", {
        ...baseArgs,
        p_cover_preset_key: coverPresetKey,
      })
    : await supabase.rpc("create_goal", baseArgs);

  if (error) {
    // goal_limit_reached: create_goal이 진행 중 목표 3개 초과 시 명시 코드로 던짐.
    if (error.message?.includes("goal_limit_reached")) {
      return { goalLimitReached: true };
    }
    console.error("[OnboardingGoalForm] create_goal error:", error);
    return { error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.slug) {
    console.error("[OnboardingGoalForm] create_goal returned no slug:", data);
    return { error: "목표 생성에 실패했습니다." };
  }

  if (!coverFile) return { slug: row.slug };

  const { data: createdGoal, error: goalLookupError } = await supabase
    .from("goal")
    .select("id")
    .eq("slug", row.slug)
    .single();
  if (goalLookupError || !createdGoal?.id) {
    console.error("[OnboardingGoalForm] created goal lookup failed", goalLookupError);
    return {
      slug: row.slug,
      coverUploadWarning: "목표는 저장됐지만 사진 업로드를 시작하지 못했어요. 목표 관리에서 다시 올려 주세요.",
    };
  }

  const uploadResult = await uploadGoalCoverFile(
    supabase,
    createdGoal.id,
    coverFile,
  );
  if (!uploadResult.ok) {
    console.error("[OnboardingGoalForm] cover upload failed", uploadResult);
    return {
      slug: row.slug,
      coverUploadWarning: "목표는 저장됐지만 사진 검수를 마치지 못했어요. 목표 관리에서 다시 올려 주세요.",
    };
  }
  return { slug: row.slug };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function OnboardingGoalForm({ initialUser }: OnboardingGoalFormProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [values, setValues] = useState<FormValues>({
    title: "",
    reason: "",
    due_date: defaultDueDate(),
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({});
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [autoSaveDone, setAutoSaveDone] = useState(false);
  const [coverPreset, setCoverPreset] = useState<GoalCoverPresetKey | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverUploadWarning, setCoverUploadWarning] = useState<string | null>(null);
  const effectiveCoverPreset = coverPreset ?? automaticGoalCoverKey(values.title);

  useEffect(() => () => {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
  }, [coverPreviewUrl]);

  // ── 마운트: draft 복원 + 로그인 후 자동저장 ─────────────────────────────────
  useEffect(() => {
    // pending slug: 이미 저장된 상태로 돌아온 경우
    const pendingSlug = loadPendingSlug();
    if (pendingSlug) {
      setSavedSlug(pendingSlug);
      clearPendingSlug();
      return;
    }

    const draft = loadDraft();
    void (async () => {
      const restoredCoverFile = await loadDraftCoverFile().catch(() => null);
      if (restoredCoverFile) {
        setCoverFile(restoredCoverFile);
        setCoverPreviewUrl(URL.createObjectURL(restoredCoverFile));
      }
      if (!draft) return;
      const restoredPreset = coverKeyOrNull(draft.cover_preset_key);
      setCoverPreset(restoredPreset);
      setValues({
        title: draft.title,
        reason: draft.reason ?? "",
        due_date: draft.due_date || defaultDueDate(),
      });

      // 링크는 로그인 이후에만 발급(회장 2026-07-19): 세션(user)만으로는 자동
      // 커밋하지 않는다. 저장 의도가 있는 draft만 OAuth 복귀 뒤 한 번 저장한다.
      if (user && !autoSaveDone && hasSaveIntent()) {
        setAutoSaveDone(true);
        setIsSaving(true);
        const result = await saveGoalToDB(
          {
            title: draft.title,
            reason: draft.reason ?? "",
            due_date: draft.due_date || defaultDueDate(),
          },
          restoredPreset,
          restoredCoverFile,
        );
        setIsSaving(false);
        clearSaveIntent();
        if ("goalLimitReached" in result) {
          setSaveError(
            "진행 중인 목표가 이미 3개예요. 하나를 마무리한 뒤 새로 만들어 주세요.",
          );
        } else if ("error" in result) {
          setSaveError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
        } else {
          clearDraft();
          await clearDraftCoverFile().catch(() => undefined);
          savePendingSlug(result.slug);
          setCoverUploadWarning(result.coverUploadWarning ?? null);
          setSavedSlug(result.slug);
          trackEvent("goal_created", { source: "oauth_return" });
        }
      }
    })();
    // user 상태 변화도 감지 (Supabase 세션 변화)
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user && event === "SIGNED_IN") {
          setUser(session.user);
        }
      },
    );
    return () => authListener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 입력 처리 ────────────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        // 실시간 draft 저장
        saveDraft({
          title: next.title,
          reason: next.reason,
          due_date: next.due_date,
          cover_preset_key: coverPreset ?? undefined,
        });
        return next;
      });
      // 에러 즉시 해소
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [coverPreset, errors],
  );

  const selectCoverPreset = (preset: GoalCoverPresetKey) => {
    setCoverPreset(preset);
    setCoverFile(null);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverPreviewUrl(null);
    setCoverError(null);
    void clearDraftCoverFile().catch(() => undefined);
    saveDraft({
      title: values.title,
      reason: values.reason,
      due_date: values.due_date,
      cover_preset_key: preset,
    });
  };

  const prepareCoverFile = (file: File) => {
    setCoverError(null);
    setCoverPreset(null);
    setCoverFile(file);
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
    setCoverPreviewUrl(URL.createObjectURL(file));
    void saveDraftCoverFile(file).catch(() => {
      setCoverError("사진을 임시 보관하지 못했어요. 다시 선택해 주세요.");
    });
  };

  // ── 저장 버튼 ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!user) {
      // 미인증 → 저장 "의도"가 있었음을 마킹 + draft 저장 후 LoginSheet.
      // 이 플래그가 있어야만 로그인 후 복귀 시 자동 커밋된다(§ 마운트 effect).
      saveSaveIntent();
      saveDraft({
        title: values.title,
        reason: values.reason,
        due_date: values.due_date,
        cover_preset_key: coverPreset ?? undefined,
      });
      setShowLoginSheet(true);
      return;
    }

    // 인증 상태 → 버튼 클릭 = 명시적 저장 의도. 즉시 DB 저장(정상 플로우).
    setIsSaving(true);
    setSaveError(null);
    const result = await saveGoalToDB(values, coverPreset, coverFile);
    setIsSaving(false);

    if ("goalLimitReached" in result) {
      // 상한 도달(설계 §4.6): 저장 시점에만 안내하고 입력은 그대로 둔다(날리지 않음).
      setSaveError(
        "진행 중인 목표가 이미 3개예요. 하나를 마무리한 뒤 새로 만들어 주세요.",
      );
    } else if ("error" in result) {
      setSaveError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
    } else {
      clearDraft();
      clearSaveIntent();
      await clearDraftCoverFile().catch(() => undefined);
      setCoverUploadWarning(result.coverUploadWarning ?? null);
      setSavedSlug(result.slug);
      trackEvent("goal_created", { source: "onboarding" });
    }
  };

  // ── 저장 완료: ShareLinkCard 표시 ────────────────────────────────────────────
  if (savedSlug) {
    return (
      <div className="w-full max-w-sm mx-auto px-[22px] py-10">
        <ShareLinkCard slug={savedSlug} goalTitle={values.title || PRODUCT_COPY.TEXT_001} />
        {coverUploadWarning && (
          <p className="mt-3 rounded-md bg-amber-soft p-3 text-sm text-amber-ink" role="status">
            {coverUploadWarning}
          </p>
        )}
      </div>
    );
  }

  // ── 저장 중 ──────────────────────────────────────────────────────────────────
  if (isSaving) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh]"
        data-testid="saving-state"
      >
        <div
          className="w-10 h-10 rounded-full border-4 animate-spin mb-4 [border-color:var(--accent)]! [border-top-color:var(--primary)]!"
          aria-label="저장 중"
        />
        <p className="text-[14px] [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_002}</p>
      </div>
    );
  }

  // ── 폼 ───────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="w-full max-w-sm mx-auto px-[22px] py-6 flex flex-col gap-4"
        data-testid="onboarding-form"
      >
        {/* 헤더 */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[13px] font-extrabold [color:var(--primary)]!"
            // --clover
          >{PRODUCT_COPY.TEXT_003}</p>
          <h1 className="font-black leading-tight [font-size:24px]! [letter-spacing:-0.5px]! [color:var(--foreground)]!">{PRODUCT_COPY.TEXT_004}</h1>
          <p className="text-[13px] mt-0.5 [color:var(--muted-foreground)]!">{PRODUCT_COPY.TEXT_005}</p>
        </div>

        <div className="grid gap-2" aria-label="온보딩 진행 3단계" data-testid="onboarding-progress">
          <div className="flex items-center justify-between text-[length:var(--text-meta-micro)]! font-bold text-muted-foreground">
            <span>목표 작성</span><span>3 중 2</span>
          </div>
          <progress className="w-full" max="3" value="2">3 중 2</progress>
        </div>

        {/* 목표 입력 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-title"
            className="text-[length:var(--text-body)]! font-bold [color:var(--foreground)]!"
          >{PRODUCT_COPY.TEXT_006}</label>
          <div
            className="flex items-center rounded-[12px] px-4 py-3 gap-2 [background-color:var(--card)]!"
            style={{
              border: `1px solid ${errors.title ? "var(--destructive)" : "var(--border)"}`,
            }}
          >
            <input
              id="goal-title"
              type="text"
              value={values.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder={PRODUCT_COPY.TEXT_014}
              className="flex-1 min-w-0 outline-none text-[14px] font-bold bg-transparent [color:var(--foreground)]!"
              maxLength={60}
              data-testid="goal-title-input"
              autoComplete="off"
              autoFocus
            />
          </div>
          {errors.title && (
            <p className="text-[length:var(--text-meta-micro)]! [color:var(--destructive)]!" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        {/* 이유 (선택) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-reason"
            className="text-[length:var(--text-body)]! font-bold [color:var(--foreground)]!"
          >{PRODUCT_COPY.TEXT_009}</label>
          <textarea
            id="goal-reason"
            value={values.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder={PRODUCT_COPY.TEXT_015}
            rows={3}
            className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none resize-none [border:1px_solid_var(--border)]! [background-color:var(--card)]! [color:var(--foreground)]! [font-family:inherit]!"
            maxLength={200}
            data-testid="goal-reason-input"
          />
          <p className="text-right text-[length:var(--text-meta-micro)]! [color:var(--muted-color)]!">
            {values.reason.length}/200
          </p>
        </div>

        {/* 마감일 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-due-date"
            className="text-[length:var(--text-body)]! font-bold [color:var(--foreground)]!"
          >{PRODUCT_COPY.TEXT_008}</label>
          <input
            id="goal-due-date"
            type="date"
            value={values.due_date}
            onChange={(e) => handleChange("due_date", e.target.value)}
            className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none [background-color:var(--card)]! [color:var(--foreground)]! [font-family:inherit]!"
            style={{
              border: `1px solid ${errors.due_date ? "var(--destructive)" : "var(--border)"}`,
            }}
            data-testid="goal-due-date-input"
          />
          {errors.due_date && (
            <p className="text-[length:var(--text-meta-micro)]! [color:var(--destructive)]!" role="alert">
              {errors.due_date}
            </p>
          )}
        </div>

        {/* D-028-A: 목표를 쓰는 흐름 안에서 커버 프리셋과 직접 업로드를 선택한다. */}
        <section className="goal-cover-picker" data-testid="onboarding-cover-picker">
          <div className="cover-picker-heading">
            <strong>목표 배너</strong>
          </div>
          <div className="goal-cover-picker-preview">
            <GoalCover
              presetKey={effectiveCoverPreset}
              imageUrl={coverPreviewUrl}
              title={values.title || "내 목표"}
              size="hero"
              priority
            />
          </div>
          <div className="cover-picker-heading">
            <strong>배너 고르기</strong>
            <span>자동 = 목표에 맞춰 고른 사진</span>
          </div>
          <GoalCoverUploadEditor
            compact
            inputTestId="onboarding-cover-file-input"
            onPrepared={prepareCoverFile}
          />
          <div className="cover-preset-grid" role="group" aria-label="목표 커버 선택">
            {GOAL_COVER_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectCoverPreset(preset.key)}
                className={coverPreset === preset.key ? "is-selected" : undefined}
                aria-pressed={coverPreset === preset.key}
                data-testid={`onboarding-cover-${preset.key}`}
              >
                <GoalCover presetKey={preset.key} title={preset.label} />
                {coverPreset === preset.key && (
                  <Check className="selection-check" data-testid="selection-check" aria-hidden="true" />
                )}
                <span>
                  {preset.label}
                  {!coverPreset && preset.key === effectiveCoverPreset && <small>자동</small>}
                </span>
              </button>
            ))}
          </div>
          {coverError && <p className="social-error" role="alert">{coverError}</p>}
          {coverFile && !coverError && (
            <p className="social-success" role="status">저장하면 사진 검수를 바로 시작해요.</p>
          )}
        </section>

        {/* 저장 에러 */}
        {saveError && (
          <div
            className="rounded-[12px] px-4 py-3 text-[13px] [background-color:var(--danger-soft)]! [color:var(--destructive)]!"
            role="alert"
          >
            {saveError}
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full py-4 rounded-[15px] text-[15.5px] font-extrabold transition-opacity active:opacity-80 [background-color:var(--primary)]! [color:var(--card)]! [box-shadow:0_6px_16px_rgba(27,138,79,.22)]! [letter-spacing:-0.2px]!"
          style={{ opacity: isSaving ? 0.7 : 1 }}
          data-testid="save-goal-button"
        >
          {user ? PRODUCT_COPY.TEXT_010 : PRODUCT_COPY.TEXT_011}
        </button>

        {/* 안내 */}
        <p className="text-center text-[length:var(--text-meta-micro)]! [color:var(--muted-color)]!">
          {user
            ? PRODUCT_COPY.TEXT_012
            : PRODUCT_COPY.TEXT_013}
        </p>
      </div>

      {/* LoginSheet */}
      <LoginSheet
        open={showLoginSheet}
        onClose={() => setShowLoginSheet(false)}
        goalTitle={values.title}
        redirectAfterLogin="/onboarding"
      />
    </>
  );
}
