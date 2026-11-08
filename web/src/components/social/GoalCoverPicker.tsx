"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setGoalCoverPresetAction } from "@/app/(receiver)/social-actions";
import { createClient } from "@/lib/supabase/client";
import {
  isValidGoalCoverFile,
  uploadGoalCoverFile,
  type GoalCoverUploadFailureStage,
} from "@/lib/goal-cover/upload";
import { GoalCover } from "./GoalCover";
import { automaticGoalCoverKey, GOAL_COVER_PRESETS, resolveGoalCoverPreset } from "./goal-cover-presets";
import { PRODUCT_COPY } from "@/lib/copy/generated/components-social-goalcoverpicker";

type FailureStage = GoalCoverUploadFailureStage | "preset";

const FAILURE_COPY: Record<FailureStage, string> = {
  format: "JPG, PNG, WEBP 형식의 5MB 이하 사진을 선택해 주세요.",
  preset: "기본 커버를 저장하지 못했어요. 잠시 후 다시 선택해 주세요.",
  sign: "업로드를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
  put: "사진 전송이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.",
  finalize: "사진은 전송됐지만 검수 요청을 마치지 못했어요. 다시 시도해 주세요.",
};

export function GoalCoverPicker(
  { goalId, title, initialPreset, imageUrl }: {
    goalId: number;
    title: string;
    initialPreset: string;
    imageUrl?: string | null;
  },
) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preset, setPreset] = useState(resolveGoalCoverPreset(initialPreset, title).key);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [state, setState] = useState<
    "idle" | "saving" | "uploading" | "review" | "error"
  >("idle");
  const [failureStage, setFailureStage] = useState<FailureStage | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const automaticPreset = automaticGoalCoverKey(title);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  function fail(stage: FailureStage, code: string, status: number | null = null) {
    console.error(JSON.stringify({ event: "goal_cover_failed", stage, code, status }));
    setFailureStage(stage);
    setState("error");
  }
  async function pick(next: typeof GOAL_COVER_PRESETS[number]["key"]) {
    if (state === "saving" || state === "uploading") return;
    setFailureStage(null);
    setState("saving");
    const result = await setGoalCoverPresetAction(goalId, next);
    if (!result.ok) return fail("preset", result.code);
    setPendingFile(null);
    setPreviewUrl(null);
    setPreset(next);
    setState("idle");
    router.refresh();
  }
  function prepareUpload(file: File) {
    if (!isValidGoalCoverFile(file)) {
      fail("format", "invalid_file");
      return;
    }
    setFailureStage(null);
    setState("idle");
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }
  async function upload(file: File) {
    if (!isValidGoalCoverFile(file)) return fail("format", "invalid_file");
    setFailureStage(null);
    setState("uploading");
    try {
      const supabase = createClient();
      const result = await uploadGoalCoverFile(supabase, goalId, file);
      if (!result.ok) {
        return fail(result.stage, result.code, result.status);
      }
      setPendingFile(null);
      setPreviewUrl(null);
      setState("review");
    } catch {
      fail("put", "network_error");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }
  return (
    <section className="goal-cover-picker" data-testid="goal-cover-picker">
      <div className="goal-cover-picker-preview">
        <GoalCover
          presetKey={preset}
          imageUrl={imageUrl}
          title={title}
          size="hero"
        />
        <button
          type="button"
          className="goal-cover-picker-toggle"
          aria-expanded={pickerOpen}
          aria-controls={`goal-cover-options-${goalId}`}
          onClick={() => setPickerOpen((value) => !value)}
        >
          <span aria-hidden="true">✎</span>
          {pickerOpen ? PRODUCT_COPY.TEXT_001 : PRODUCT_COPY.TEXT_002}
        </button>
      </div>
      {pickerOpen && (
        <div id={`goal-cover-options-${goalId}`} data-testid="goal-cover-options">
          <div className="cover-picker-heading">
            <strong>{PRODUCT_COPY.TEXT_003}</strong><span>{PRODUCT_COPY.TEXT_004}</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) prepareUpload(file);
            }}
          />
          <button type="button" className="cover-picker-upload-entry" disabled={state === "uploading" || state === "saving"} onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">↑</span>{pendingFile ? PRODUCT_COPY.TEXT_005 : PRODUCT_COPY.TEXT_006}
          </button>
          {pendingFile && previewUrl && (
            <div className="cover-picker-upload-preview" data-testid="goal-cover-upload-preview">
              <GoalCover presetKey={preset} imageUrl={previewUrl} title={PRODUCT_COPY.TEXT_007} size="hero" />
              <button type="button" disabled={state === "uploading"} onClick={() => void upload(pendingFile)}>
                {state === "uploading" ? PRODUCT_COPY.TEXT_008 : failureStage ? PRODUCT_COPY.TEXT_009 : PRODUCT_COPY.TEXT_010}
              </button>
            </div>
          )}
          <div
            className="cover-preset-grid"
            role="group"
            aria-label={PRODUCT_COPY.TEXT_011}
          >
            {GOAL_COVER_PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => pick(item.key)}
                className={preset === item.key ? "is-selected" : undefined}
                aria-pressed={preset === item.key}
                disabled={state === "saving" || state === "uploading"}
              >
                <GoalCover presetKey={item.key} title={item.label} />
                {preset === item.key && (
                  <Check className="selection-check" data-testid="selection-check" aria-hidden="true" />
                )}
                <span>{item.label}{item.key === automaticPreset && <small>{PRODUCT_COPY.TEXT_012}</small>}</span>
              </button>
            ))}
          </div>
          <p className="social-muted">{PRODUCT_COPY.TEXT_013}</p>
          {state === "review" && (
            <p className="social-success" role="status">{PRODUCT_COPY.TEXT_014}</p>
          )}
          {state === "error" && (
            <p className="social-error" role="alert">
              {FAILURE_COPY[failureStage ?? "format"]}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
