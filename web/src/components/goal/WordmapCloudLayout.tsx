"use client";

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

type Rect = { x: number; y: number; width: number; height: number };

// D-027-E의 부유 모션은 좌표 배치 뒤 각 단어를 서로 다른 위상으로
// 이동·회전시킨다. 정적 rect만 예약하면 긴 단어의 회전 AABB와 최대
// 상대 이동이 이웃 단어를 침범하므로, 전체 모션 envelope를 배치에 포함한다.
export function cloudMotionEnvelope(width: number, height: number) {
  const rotation = 2.5 * Math.PI / 180;
  const rotatedWidth = width * Math.cos(rotation) + height * Math.sin(rotation);
  const rotatedHeight = width * Math.sin(rotation) + height * Math.cos(rotation);
  return {
    x: 3.5 + Math.max(0, rotatedWidth - width) / 2 + 1,
    y: 4.25 + Math.max(0, rotatedHeight - height) / 2 + 1,
  };
}

function seededRandom(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash ^= hash << 13;
    hash >>>= 0;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    hash >>>= 0;
    return hash / 4294967296;
  };
}

function intersects(first: Rect, second: Rect) {
  return !(
    first.x + first.width <= second.x
    || second.x + second.width <= first.x
    || first.y + first.height <= second.y
    || second.y + second.height <= first.y
  );
}

function positionCloud(container: HTMLDivElement, seed: string) {
  const items = Array.from(
    container.querySelectorAll<HTMLElement>("[data-wordmap-item]"),
  );
  if (items.length === 0 || container.clientWidth === 0) return;

  container.style.removeProperty("min-height");
  const computed = getComputedStyle(container);
  const paddingLeft = Number.parseFloat(computed.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(computed.paddingRight) || 0;
  const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
  const heading = container.querySelector<HTMLElement>("[data-wordmap-heading]");
  const headingHeight = heading ? heading.offsetHeight + 8 : 0;
  const left = paddingLeft;
  const right = container.clientWidth - paddingRight;
  const availableWidth = Math.max(right - left, 1);
  const minimumHeight = Number.parseFloat(computed.minHeight) || 236;
  const random = seededRandom(`${seed}:${items.length}`);
  const boxes = items.map((element) => {
    const width = Math.min(element.offsetWidth, availableWidth);
    const height = element.offsetHeight;
    return {
      element,
      width,
      height,
      envelope: cloudMotionEnvelope(width, height),
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize) || 16,
    };
  });
  const requiredArea = boxes.reduce(
    (total, box) => total
      + (box.width + box.envelope.x * 2)
      * (box.height + box.envelope.y * 2),
    0,
  ) * 1.42;
  let height = Math.max(
    minimumHeight,
    paddingTop + headingHeight + paddingBottom
      + Math.ceil(requiredArea / availableWidth),
  );
  container.style.minHeight = `${height}px`;
  const top = paddingTop + headingHeight;
  const bottom = height - paddingBottom;
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const placed: Rect[] = [];

  boxes
    .sort((first, second) => (
      second.fontSize - first.fontSize || second.width - first.width
    ))
    .forEach((box, index) => {
      let angle = random() * Math.PI * 2;
      let radius = index === 0 ? 0 : 8;
      let x: number | null = null;
      let y: number | null = null;

      for (let step = 0; step < 1400; step += 1) {
        const candidateX = centerX + Math.cos(angle) * radius * 1.18 - box.width / 2;
        const candidateY = centerY + Math.sin(angle) * radius * 0.72 - box.height / 2;
        const boundedX = Math.min(Math.max(candidateX, left), Math.max(left, right - box.width));
        const boundedY = Math.min(Math.max(candidateY, top), Math.max(top, bottom - box.height));
        const collisionBox = {
          x: boundedX - box.envelope.x,
          y: boundedY - box.envelope.y,
          width: box.width + box.envelope.x * 2,
          height: box.height + box.envelope.y * 2,
        };
        if (!placed.some((other) => intersects(other, collisionBox))) {
          x = boundedX;
          y = boundedY;
          placed.push(collisionBox);
          break;
        }
        angle += 0.42;
        radius += 0.9;
      }

      if (x === null || y === null) {
        height += box.height + 14;
        container.style.minHeight = `${height}px`;
        x = Math.min(
          Math.max(left + random() * Math.max(availableWidth - box.width, 0), left),
          right - box.width,
        );
        y = height - paddingBottom - box.height;
        placed.push({
          x: x - box.envelope.x,
          y: y - box.envelope.y,
          width: box.width + box.envelope.x * 2,
          height: box.height + box.envelope.y * 2,
        });
      }

      box.element.style.left = `${x}px`;
      box.element.style.top = `${y}px`;
      box.element.style.setProperty("--wordmap-delay", `${index * 52 + 620}ms`);
      box.element.style.setProperty("--wordmap-duration", `${Math.trunc(3900 + random() * 2400)}ms`);
      box.element.style.setProperty("--wordmap-y", `${(-(4.5 + random() * 4)).toFixed(1)}px`);
      box.element.style.setProperty("--wordmap-x", `${(random() * 7 - 3.5).toFixed(1)}px`);
      box.element.style.setProperty("--wordmap-rotation", `${(random() * 5 - 2.5).toFixed(1)}deg`);
    });
  container.dataset.layoutReady = "true";
}

export function WordmapCloudLayout({
  children,
  className,
  seed,
  label,
  testId,
}: {
  children: ReactNode;
  className: string;
  seed: string;
  label: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const generatedId = useId();

  useEffect(() => {
    const container = ref.current;
    if (!container) return undefined;
    container.dataset.layoutReady = "false";
    let animationFrame = 0;
    let disposed = false;
    const layout = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        if (!disposed) positionCloud(container, `${seed}:${generatedId}`);
      });
    };
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(layout);
    observer?.observe(container);
    window.addEventListener("resize", layout);
    void document.fonts?.ready.then(layout);
    layout();
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      observer?.disconnect();
      window.removeEventListener("resize", layout);
    };
  }, [generatedId, seed]);

  return (
    <div
      ref={ref}
      className={className}
      data-wordmap-layout
      data-layout-ready="false"
      data-testid={testId}
      role="group"
      aria-label={label}
    >
      <span className="wordmap-ambient wordmap-ambient--1" aria-hidden="true">🍀</span>
      <span className="wordmap-ambient wordmap-ambient--2" aria-hidden="true">♥</span>
      <span className="wordmap-ambient wordmap-ambient--3" aria-hidden="true">✨</span>
      <span className="wordmap-ambient wordmap-ambient--4" aria-hidden="true">🍀</span>
      <span className="wordmap-ambient wordmap-ambient--5" aria-hidden="true">♥</span>
      {children}
    </div>
  );
}
