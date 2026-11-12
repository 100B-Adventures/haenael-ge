import generated from "@/generated/public-release-notes.json";

export const WHATS_NEW_LAST_SEEN_KEY = "haenael_whats_new_last_seen_version";
export const WHATS_NEW_USER_METADATA_KEY = "haenael_whats_new_last_seen_version";

export function newerReleaseVersion(left: string | null, right: string | null): string | null {
  const versions = [left, right].filter((value): value is string => /^\d+\.\d+\.\d+$/.test(value ?? ""));
  if (versions.length === 0) return null;
  return versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
}

export interface PublicReleaseNote {
  version: string;
  releaseTag: string;
  date: string;
  title: string;
  summary: string;
  notify: boolean;
  tryHref: string;
  feedbackHref: string;
}

export const publicReleaseNotes = generated.releases satisfies PublicReleaseNote[];
export const latestPublicRelease = publicReleaseNotes[0];
