export type UpdateDecision =
  | { required: false }
  | { required: true; minimumVersion: string; storeUrl: string };

export function compareVersions(current: string, minimum: string) {
  const left = current.split(".").map(Number);
  const right = minimum.split(".").map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta > 0 ? 1 : -1;
  }
  return 0;
}

export function decideUpdate(
  current: string,
  payload: { minimumVersion: string; storeUrl: string }
): UpdateDecision {
  if (compareVersions(current, payload.minimumVersion) >= 0) return { required: false };
  return { required: true, ...payload };
}
