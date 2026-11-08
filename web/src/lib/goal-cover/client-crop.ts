import { GOAL_COVER_MAX_BYTES } from "./upload";

export const GOAL_COVER_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const GOAL_COVER_ASPECT_RATIO = 16 / 9;

export function isValidGoalCoverInput(file: File) {
  return Boolean(
    file.type.match(/^image\/(jpeg|png|webp)$/) &&
      file.size >= 1 &&
      file.size <= GOAL_COVER_INPUT_MAX_BYTES,
  );
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("cover_crop_failed")),
      "image/jpeg",
      quality,
    );
  });
}

export async function cropGoalCoverFile(file: File, verticalPosition: number) {
  if (!isValidGoalCoverInput(file)) throw new Error("invalid_cover_input");

  const bitmap = await createImageBitmap(file);
  try {
    const outputWidth = Math.min(1600, bitmap.width);
    const outputHeight = Math.round(outputWidth / GOAL_COVER_ASPECT_RATIO);
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("cover_canvas_unavailable");

    const sourceRatio = bitmap.width / bitmap.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = bitmap.width;
    let sourceHeight = bitmap.height;
    if (sourceRatio > GOAL_COVER_ASPECT_RATIO) {
      sourceWidth = bitmap.height * GOAL_COVER_ASPECT_RATIO;
      sourceX = (bitmap.width - sourceWidth) / 2;
    } else {
      sourceHeight = bitmap.width / GOAL_COVER_ASPECT_RATIO;
      const maxY = Math.max(0, bitmap.height - sourceHeight);
      sourceY = maxY * Math.min(100, Math.max(0, verticalPosition)) / 100;
    }

    context.drawImage(
      bitmap,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
    let blob = await canvasBlob(canvas, 0.88);
    if (blob.size > GOAL_COVER_MAX_BYTES) blob = await canvasBlob(canvas, 0.72);
    if (blob.size > GOAL_COVER_MAX_BYTES) throw new Error("cover_crop_too_large");

    const baseName = file.name.replace(/\.[^.]+$/, "") || "goal-cover";
    return new File([blob], `${baseName}-banner.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
