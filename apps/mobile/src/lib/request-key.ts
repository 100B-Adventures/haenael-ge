export function createRequestKey(prefix: string) {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${random}`.slice(0, 128);
}
