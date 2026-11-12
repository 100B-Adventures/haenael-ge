import generated from "@/generated/public-release-notes.json";

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
