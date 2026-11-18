export type DeepLinkTarget =
  | { kind: "goal"; slug: string }
  | { kind: "invite"; token: string }
  | { kind: "home" };

export function parseDeepLink(url: string): DeepLinkTarget {
  const normalized = url.replace(/^haenael:\/\//, "https://haenael.app/");
  const parsed = new URL(normalized);
  const [first, second] = parsed.pathname.split("/").filter(Boolean);
  if (first === "g" && second) return { kind: "goal", slug: decodeURIComponent(second) };
  if (first === "invite" && second) return { kind: "invite", token: decodeURIComponent(second) };
  return { kind: "home" };
}
