export function normalizeProfileImageUrl(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate, "https://haenael-ge.local");
    if (
      url.protocol === "http:" &&
      (url.hostname === "kakaocdn.net" || url.hostname.endsWith(".kakaocdn.net"))
    ) {
      url.protocol = "https:";
      return url.toString();
    }
  } catch {
    return candidate;
  }

  return candidate;
}
