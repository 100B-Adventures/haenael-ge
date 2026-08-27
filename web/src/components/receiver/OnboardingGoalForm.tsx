"use client";

// components/receiver/OnboardingGoalForm.tsx — ① write-first 목표 작성 폼
// DESIGN.md §7-2: write-first 확정. 저장 시에만 LoginSheet 등장.
// 슬라이스 #4: 실구현.
//
// 상태 흐름:
//  idle → filling (사용자 입력) → login-required (미인증) → saving (DB insert) → done (SlinkCard)
//  로그인 후 복귀: 마운트 시 user 있고 draft 있으면 → auto-save

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LoginSheet } from "@/components/auth";
import { ShareLinkCard } from "@/components/goal/ShareLinkCard";
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
} from "@/lib/utils/draft";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface OnboardingGoalFormProps {
  /** 서버에서 전달한 초기 유저 (null = 미인증) */
  initialUser: User | null;
}

interface FormValues {
  title: string;
  reason: string;
  due_date: string;
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
// 회장 결정 A (2026-07-20): 1계정 1목표(활성) 강제. DB엔 partial unique index
// goal_one_active_per_member(member_id) WHERE status != 'DELETED' 가 정본이지만,
// insert 시도 후 23505 에러로 알리는 건 UX가 나쁘다(원인이 안 보임) — 저장 전
// SELECT로 기존 활성 목표를 먼저 확인해 "already-has-goal"로 조기 반환한다.
// 동시요청 레이스는 DB 유니크 인덱스가 최종 방어선(앱레벨은 UX 최적화용).

async function saveGoalToDB(
  values: FormValues,
  userId: string,
): Promise<{ slug: string } | { error: string } | { alreadyHasGoal: true }> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("goal")
    .select("id")
    .eq("member_id", userId)
    .neq("status", "DELETED")
    .is("deleted_at", null)
    .limit(1);

  if (existing && existing.length > 0) {
    return { alreadyHasGoal: true };
  }

  const title = `${values.title.trim()} 해낼게`;
  const { data, error } = await supabase
    .from("goal")
    .insert({
      member_id: userId,
      title,
      reason: values.reason.trim() || null,
      due_date: values.due_date,
    })
    .select("slug")
    .single();

  if (error) {
    // 23505 = unique_violation. DB 인덱스가 레이스를 막은 경우도 "이미 목표 있음"으로 처리.
    if (error.code === "23505") {
      return { alreadyHasGoal: true };
    }
    console.error("[OnboardingGoalForm] insert error:", error);
    return { error: error.message };
  }
  return { slug: data.slug };
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function OnboardingGoalForm({ initialUser }: OnboardingGoalFormProps) {
  const router = useRouter();
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
    if (draft) {
      setValues({
        title: draft.title,
        reason: draft.reason ?? "",
        due_date: draft.due_date || defaultDueDate(),
      });

      // 링크는 로그인 이후에만 발급(회장 2026-07-19): 세션(user)만으로는 자동
      // 커밋하지 않는다 — "저장하고 내 링크 받기" 버튼을 실제로 눌렀던 draft
      // (hasSaveIntent)만, 로그인 후 복귀 시 1회 자동 커밋한다.
      if (user && !autoSaveDone && hasSaveIntent()) {
        setAutoSaveDone(true);
        setIsSaving(true);
        saveGoalToDB(
          {
            title: draft.title,
            reason: draft.reason ?? "",
            due_date: draft.due_date || defaultDueDate(),
          },
          user.id,
        ).then((result) => {
          setIsSaving(false);
          clearSaveIntent();
          if ("alreadyHasGoal" in result) {
            clearDraft();
            router.replace("/me");
          } else if ("error" in result) {
            setSaveError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
          } else {
            clearDraft();
            savePendingSlug(result.slug);
            setSavedSlug(result.slug);
            trackEvent("goal_created", { source: "oauth_return" });
          }
        });
      }
    }
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
        });
        return next;
      });
      // 에러 즉시 해소
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors],
  );

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
      });
      setShowLoginSheet(true);
      return;
    }

    // 인증 상태 → 버튼 클릭 = 명시적 저장 의도. 즉시 DB 저장(정상 플로우).
    setIsSaving(true);
    setSaveError(null);
    const result = await saveGoalToDB(values, user.id);
    setIsSaving(false);

    if ("alreadyHasGoal" in result) {
      // 회장 결정 A: 이미 활성 목표가 있으면 재저장 대신 /me로 유도(dead-end 0).
      clearDraft();
      clearSaveIntent();
      router.replace("/me");
    } else if ("error" in result) {
      setSaveError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
    } else {
      clearDraft();
      clearSaveIntent();
      setSavedSlug(result.slug);
      trackEvent("goal_created", { source: "onboarding" });
    }
  };

  // ── 저장 완료: ShareLinkCard 표시 ────────────────────────────────────────────
  if (savedSlug) {
    return (
      <div className="w-full max-w-sm mx-auto px-[22px] py-10">
        <ShareLinkCard slug={savedSlug} goalTitle={values.title || "목표"} />
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
        <p className="text-[14px] [color:var(--muted-foreground)]!">
          목표를 저장하는 중이에요...
        </p>
      </div>
    );
  }

  // ── 폼 ───────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="w-full max-w-sm mx-auto px-[22px] py-10 flex flex-col gap-6"
        data-testid="onboarding-form"
      >
        {/* 헤더 */}
        <div className="flex flex-col gap-1">
          <p
            className="text-[13px] font-extrabold [color:var(--primary)]!"
            // --clover
          >
            해낼게.
          </p>
          <h1 className="font-black leading-tight [font-size:24px]! [letter-spacing:-0.5px]! [color:var(--foreground)]!">
            무엇을 해낼 거예요?
          </h1>
          <p className="text-[13px] mt-0.5 [color:var(--muted-foreground)]!">
            작성하고 저장하면 나만의 응원 링크가 생겨요.
          </p>
        </div>

        {/* 목표 입력 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-title"
            className="text-[11px] font-bold tracking-wider uppercase [color:var(--muted-foreground)]!"
          >
            목표
          </label>
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
              placeholder="편입 평점 4.0"
              className="flex-1 min-w-0 outline-none text-[14px] font-bold bg-transparent [color:var(--foreground)]!"
              maxLength={60}
              data-testid="goal-title-input"
              autoComplete="off"
              autoFocus
            />
            <span
              className="flex-shrink-0 text-[13px] font-bold [color:var(--accent-foreground)]!"
              // --clover-ink
            >
              해낼게
            </span>
          </div>
          {errors.title && (
            <p className="text-[12px] [color:var(--destructive)]!" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        {/* 마감일 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-due-date"
            className="text-[11px] font-bold tracking-wider uppercase [color:var(--muted-foreground)]!"
          >
            언제까지?
          </label>
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
            <p className="text-[12px] [color:var(--destructive)]!" role="alert">
              {errors.due_date}
            </p>
          )}
        </div>

        {/* 이유 (선택) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="goal-reason"
            className="text-[11px] font-bold tracking-wider uppercase [color:var(--muted-foreground)]!"
          >
            왜요?{" "}
            <span className="text-[10px] font-normal normal-case [color:var(--faint)]!">
              (응원의 이유가 돼요 · 선택)
            </span>
          </label>
          <textarea
            id="goal-reason"
            value={values.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
            placeholder="휴학하고 8개월째 새벽 도서관. 이번엔 진짜 끝을 보려고요."
            rows={3}
            className="w-full rounded-[12px] px-4 py-3 text-[14px] outline-none resize-none [border:1px_solid_var(--border)]! [background-color:var(--card)]! [color:var(--foreground)]! [font-family:inherit]!"
            maxLength={200}
            data-testid="goal-reason-input"
          />
          <p className="text-right text-[11px] [color:var(--faint)]!">
            {values.reason.length}/200
          </p>
        </div>

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
          {user ? "내 링크 받기" : "저장하고 내 링크 받기"}
        </button>

        {/* 안내 */}
        <p className="text-center text-[12px] [color:var(--faint)]!">
          {user
            ? "바로 저장돼요."
            : "저장하면 로그인 화면이 잠깐 뜨고, 작성 중인 목표는 안전하게 보관 중이에요."}
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
