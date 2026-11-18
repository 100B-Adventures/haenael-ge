export type DeepLinkTarget =
  | { kind: "invite"; token: string }
  | { kind: "external"; url: string }
  | { kind: "home" };

export function parseDeepLink(url: string): DeepLinkTarget {
  const normalized = url.replace(/^haenael:\/\//, "https://haenael.app/");
  const parsed = new URL(normalized);
  const [first, second] = parsed.pathname.split("/").filter(Boolean);
  if (first === "g" && second) return { kind: "external", url };
  if (first === "invite" && second) return { kind: "invite", token: decodeURIComponent(second) };
  return { kind: "home" };
}
