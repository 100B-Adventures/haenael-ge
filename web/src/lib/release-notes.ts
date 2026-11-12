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

// 새로운 기능 카드와 의견 버튼이 가리키는 버전. 버그 수정판(notify:false)이 나와도
// 아직 안 본 가장 최근 notify:true 버전을 띄운다(release-notes-and-whats-new 표준, 2026-11-13 개정).
export function findLatestAnnouncedRelease(notes: readonly PublicReleaseNote[]): PublicReleaseNote | null {
  return notes.find((note) => note.notify) ?? null;
}

export const latestAnnouncedRelease = findLatestAnnouncedRelease(publicReleaseNotes);
