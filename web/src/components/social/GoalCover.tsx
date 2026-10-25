import Image from "next/image";
import {
  goalCoverAssetPath,
  resolveGoalCoverPreset,
} from "./goal-cover-presets";

export function GoalCover(
  { presetKey, imageUrl, title, size = "card", caption }: {
    presetKey?: string | null;
    imageUrl?: string | null;
    title: string;
    size?: "card" | "hero" | "banner";
    caption?: string;
  },
) {
  const resolvedPreset = resolveGoalCoverPreset(presetKey, title);
  const resolvedImage = imageUrl || goalCoverAssetPath(resolvedPreset.file);
  return (
    <div
      className={`goal-cover goal-cover--${size} goal-cover--${resolvedPreset.key}`}
      data-testid="goal-cover"
      data-preset={resolvedPreset.key}
    >
      <Image
        src={resolvedImage}
        alt={imageUrl ? `${title} 목표 커버` : resolvedPreset.alt}
        fill
        sizes="(max-width: 1023px) 100vw, 640px"
        className="goal-cover-image"
        unoptimized={Boolean(imageUrl)}
      />
      <span className="goal-cover-shade" aria-hidden="true" />
      {caption && <span className="goal-cover-caption">{caption}</span>}
      <span className="goal-cover-mark" aria-hidden="true">🍀</span>
    </div>
  );
}
