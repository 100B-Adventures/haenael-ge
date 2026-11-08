"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cropGoalCoverFile,
  isValidGoalCoverInput,
} from "@/lib/goal-cover/client-crop";

type LocalPhoto = { file: File; url: string };

export function GoalCoverUploadEditor({
  busy = false,
  inputTestId,
  onPrepared,
}: {
  busy?: boolean;
  inputTestId?: string;
  onPrepared: (file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = photos[selectedIndex] ?? null;
  const urls = useMemo(() => photos.map((photo) => photo.url), [photos]);

  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const invalid = files.find((file) => !isValidGoalCoverInput(file));
    if (invalid) {
      setError("JPG, PNG, WEBP 형식의 10MB 이하 사진을 선택해 주세요.");
      return;
    }
    const next = files.slice(0, 6).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((previous) => {
      previous.forEach((photo) => URL.revokeObjectURL(photo.url));
      return next;
    });
    setSelectedIndex(0);
    setVerticalPosition(50);
    setError(null);
  }

  async function apply() {
    if (!selected || preparing || busy) return;
    setPreparing(true);
    setError(null);
    try {
      const cropped = await cropGoalCoverFile(selected.file, verticalPosition);
      await onPrepared(cropped);
    } catch {
      setError("사진 위치를 적용하지 못했어요. 다른 사진으로 다시 시도해 주세요.");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <section className="cover-upload-editor" data-testid="goal-cover-upload-editor">
      <div className="cover-picker-heading">
        <strong>내 사진</strong>
        <span>선택한 사진만 기기 안에서 미리 보여요.</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp"
        multiple
        data-testid={inputTestId}
        onChange={(event) => {
          addFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      {photos.length === 0 ? (
        <div className="cover-upload-empty">
          <strong>아직 고른 사진이 없어요</strong>
          <span>사진을 고르면 배너에서 어떻게 보이는지 바로 확인해요.</span>
        </div>
      ) : (
        <>
          <div className="cover-local-library" aria-label="선택한 내 사진">
            {photos.map((photo, index) => (
              <button
                type="button"
                key={`${photo.file.name}-${photo.file.lastModified}-${index}`}
                aria-label={`선택한 사진 ${index + 1}`}
                aria-pressed={selectedIndex === index}
                onClick={() => {
                  setSelectedIndex(index);
                  setVerticalPosition(50);
                }}
              >
                {/* 사용자가 방금 고른 로컬 blob URL이라 Next Image 최적화 대상이 아니다. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" />
              </button>
            ))}
          </div>
          <div className="cover-crop-preview" data-testid="goal-cover-crop-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selected.url}
              alt="고른 사진을 배너 비율로 맞춘 미리보기"
              // design-token-lint-allow: range 입력값을 사진 미리보기의 동적 세로 위치로 반영한다.
              style={{ objectPosition: `center ${verticalPosition}%` }}
            />
            <span>위아래로 위치를 맞춰요</span>
          </div>
          <label className="cover-position-control">
            <span>세로 위치 맞춤</span>
            <input
              type="range"
              min="0"
              max="100"
              value={verticalPosition}
              disabled={busy || preparing}
              onChange={(event) => setVerticalPosition(Number(event.target.value))}
              data-testid="goal-cover-position-input"
            />
          </label>
          <div className="cover-upload-actions">
            <button type="button" disabled={busy || preparing} onClick={() => inputRef.current?.click()}>
              다른 사진 고르기
            </button>
            <button type="button" disabled={busy || preparing} onClick={() => void apply()}>
              {busy || preparing ? "배너 준비 중" : "배너로 쓰기"}
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        className="cover-picker-upload-entry"
        disabled={busy || preparing}
        onClick={() => inputRef.current?.click()}
      >
        <span aria-hidden="true">↑</span>기기에서 사진 찾기
      </button>
      <p className="social-muted">10MB 이하 사진을 고르면 배너 비율로 잘라 기존 5MB 업로드 계약에 맞춰요.</p>
      {error && <p className="social-error" role="alert">{error}</p>}
    </section>
  );
}
