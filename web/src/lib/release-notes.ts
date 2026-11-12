import generated from "@/generated/public-release-notes.json";

export const WHATS_NEW_LAST_SEEN_KEY = "haenael_whats_new_last_seen_version";

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
