"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setGoalCoverPresetAction } from "@/app/(receiver)/social-actions";
import { createClient } from "@/lib/supabase/client";
import { GoalCover } from "./GoalCover";

const presets = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

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
  const [preset, setPreset] = useState(initialPreset);
  const [state, setState] = useState<
    "idle" | "saving" | "uploading" | "review" | "error"
  >("idle");
  async function pick(next: string) {
    if (state === "saving") return;
    setState("saving");
    const result = await setGoalCoverPresetAction(goalId, next);
    if (!result.ok) return setState("error");
    setPreset(next);
    setState("idle");
    router.refresh();
  }
  async function upload(file: File) {
    if (
      !file.type.match(/^image\/(jpeg|png|webp)$/) || file.size < 1 ||
      file.size > MAX_BYTES
    ) return setState("error");
    setState("uploading");
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
      return setState("error");
    }
    const uploadResponse = await fetch(signData.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type, "x-upsert": "false" },
      body: file,
    });
    if (!uploadResponse.ok) return setState("error");
    const { error: finalizeError } = await supabase.functions.invoke(
      "goal-cover-finalize",
      { body: { asset_id: signData.asset_id, content_sha256: contentSha256 } },
    );
    if (finalizeError) return setState("error");
    setState("review");
  }
  return (
    <section className="social-card" data-testid="goal-cover-picker">
      <GoalCover
        presetKey={preset}
        imageUrl={imageUrl}
        title={title}
        size="hero"
      />
      <div className="social-card-heading">
        <div>
          <p className="social-eyebrow">목표 커버</p>
          <h2>내 해낼게 꾸미기</h2>
        </div>
        <span>
          {state === "saving"
            ? "저장 중"
            : state === "uploading"
            ? "업로드 중"
            : "선택"}
        </span>
      </div>
      <div
        className="cover-preset-grid"
        role="group"
        aria-label="기본 커버 선택"
      >
        {presets.map((key, index) => (
          <button
            key={key}
            type="button"
            onClick={() => pick(key)}
            className={preset === key ? "is-selected" : undefined}
            aria-pressed={preset === key}
          >
            <GoalCover presetKey={key} title={`기본 커버 ${index + 1}`} />
            <span>기본 {index + 1}</span>
          </button>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <button
        type="button"
        className="social-secondary-action"
        disabled={state === "uploading"}
        onClick={() => inputRef.current?.click()}
      >
        내 사진 업로드
      </button>
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
          커버를 저장하지 못했어요. 파일 형식과 크기를 확인해 주세요.
        </p>
      )}
    </section>
  );
}
