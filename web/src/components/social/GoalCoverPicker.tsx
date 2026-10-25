"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setGoalCoverPresetAction } from "@/app/(receiver)/social-actions";
import { createClient } from "@/lib/supabase/client";
import { GoalCover } from "./GoalCover";
import { automaticGoalCoverKey, GOAL_COVER_PRESETS, resolveGoalCoverPreset } from "./goal-cover-presets";

const MAX_BYTES = 5 * 1024 * 1024;
type FailureStage = "format" | "preset" | "sign" | "put" | "finalize";

const FAILURE_COPY: Record<FailureStage, string> = {
  format: "JPG, PNG, WEBP 형식의 5MB 이하 사진을 선택해 주세요.",
  preset: "기본 커버를 저장하지 못했어요. 잠시 후 다시 선택해 주세요.",
  sign: "업로드를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.",
  put: "사진 전송이 끊겼어요. 네트워크를 확인하고 다시 시도해 주세요.",
  finalize: "사진은 전송됐지만 검수 요청을 마치지 못했어요. 다시 시도해 주세요.",
};

function functionStatus(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;
  return context instanceof Response ? context.status : null;
}

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest)).map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

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
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size < 1 || file.size > MAX_BYTES) {
      fail("format", "invalid_file");
      return;
    }
    setFailureStage(null);
    setState("idle");
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }
  async function upload(file: File) {
    if (
      !file.type.match(/^image\/(jpeg|png|webp)$/) || file.size < 1 ||
      file.size > MAX_BYTES
    ) return fail("format", "invalid_file");
    setFailureStage(null);
    setState("uploading");
    try {
      const contentSha256 = await sha256Hex(file);
      const supabase = createClient();
      const { data: signData, error: signError } = await supabase.functions
        .invoke("goal-cover-sign-upload", {
          body: {
            goal_id: goalId,
            file_name: file.name,
            mime_type: file.type,
            byte_size: file.size,
            content_sha256: contentSha256,
          },
        });
      if (signError || !signData?.upload_url || !signData?.asset_id) {
        return fail("sign", signError ? "edge_function_error" : "invalid_sign_response", functionStatus(signError));
      }
      const uploadResponse = await fetch(signData.upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!uploadResponse.ok) return fail("put", "storage_put_failed", uploadResponse.status);
      const { error: finalizeError } = await supabase.functions.invoke(
        "goal-cover-finalize",
        { body: { asset_id: signData.asset_id, content_sha256: contentSha256 } },
      );
      if (finalizeError) return fail("finalize", "edge_function_error", functionStatus(finalizeError));
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
          {pickerOpen ? "선택 닫기" : "배너 바꾸기"}
        </button>
      </div>
      {pickerOpen && (
        <div id={`goal-cover-options-${goalId}`} data-testid="goal-cover-options">
          <div className="cover-picker-heading">
            <strong>배너 고르기</strong><span>자동 = 목표에 맞춰 고른 사진</span>
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
            <span aria-hidden="true">↑</span>{pendingFile ? "다른 내 사진 고르기" : "내 사진 올리기"}
          </button>
          {pendingFile && previewUrl && (
            <div className="cover-picker-upload-preview" data-testid="goal-cover-upload-preview">
              <GoalCover presetKey={preset} imageUrl={previewUrl} title="직접 올린 배너 미리보기" size="hero" />
              <button type="button" disabled={state === "uploading"} onClick={() => void upload(pendingFile)}>
                {state === "uploading" ? "검수 요청 중…" : failureStage ? "검수 요청 다시" : "이 사진으로 배너 만들기"}
              </button>
            </div>
          )}
          <div
            className="cover-preset-grid"
            role="group"
            aria-label="기본 커버 선택"
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
                <span>{item.label}{item.key === automaticPreset && <small>자동</small>}</span>
              </button>
            ))}
          </div>
          <p className="social-muted">
            JPG, PNG, WEBP 5MB 이하. 검수 중에는 현재 커버가 유지돼요.
          </p>
          {state === "review" && (
            <p className="social-success" role="status">
              사진을 검수 대기열에 보냈어요. 승인 전까지 현재 커버를 유지해요.
            </p>
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
