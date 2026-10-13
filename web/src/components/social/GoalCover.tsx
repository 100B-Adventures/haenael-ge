import Image from "next/image";

export function GoalCover(
  { presetKey = "c1", imageUrl, title, size = "card" }: {
    presetKey?: string | null;
    imageUrl?: string | null;
    title: string;
    size?: "card" | "hero" | "banner";
  },
) {
  const resolvedPreset = presetKey ?? "c1";
  return (
    <div
      className={`goal-cover goal-cover--${size} goal-cover--${resolvedPreset}`}
      data-testid="goal-cover"
      data-preset={resolvedPreset}
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={`${title} 목표 커버`}
          fill
          sizes="(max-width: 1023px) 100vw, 640px"
          className="goal-cover-image"
          unoptimized
        />
      )}
      <span className="goal-cover-mark" aria-hidden="true">🍀</span>
    </div>
  );
}
