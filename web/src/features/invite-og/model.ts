import type { InvitePreview } from "@/lib/social/contracts";

export const INVITE_OG_SIZE = { width: 1200, height: 630 } as const;
export const INVITE_OG_ALT = "해낼게 친구 초대 응원 입장권";

const DEFAULT_NAME = "친구";
const DEFAULT_TITLE = "서로의 목표를 함께 응원해요";

export type InviteOgModel = {
  name: string;
  title: string;
  profileImage: string | null;
  personalized: boolean;
};

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? [...normalized].slice(0, maxLength).join("") : fallback;
}

function safeProfileImage(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function toInviteOgModel(
  preview: InvitePreview | null,
  rawPreview?: unknown,
): InviteOgModel {
  if (!preview) {
    return {
      name: DEFAULT_NAME,
      title: DEFAULT_TITLE,
      profileImage: null,
      personalized: false,
    };
  }

  const raw = rawPreview && typeof rawPreview === "object"
    ? rawPreview as Record<string, unknown>
    : {};
  return {
    name: cleanText(preview.inviter_nickname, DEFAULT_NAME, 40),
    title: cleanText(preview.goal_title, DEFAULT_TITLE, 120),
    // 현재 공개 RPC는 이 필드를 반환하지 않는다. 계약이 승인되어 값이 생긴 경우에만
    // HTTPS 프로필 이미지를 사용하고, 그 전에는 이름 첫 글자 아바타로 안전하게 떨어진다.
    profileImage: safeProfileImage(raw.profile_image),
    personalized: Boolean(
      preview.inviter_nickname?.trim() || preview.goal_title?.trim(),
    ),
  };
}

function visualUnits(value: string) {
  return [...value].reduce((sum, character) => {
    if (character === " ") return sum + 0.3;
    if (/[0-9a-zA-Z.,]/.test(character)) return sum + 0.6;
    return sum + 0.98;
  }, 0);
}

export function fitInviteTitle(title: string) {
  const boxWidth = 600;
  const maxLines = 2;
  const sizes = [76, 66, 56] as const;
  for (const fontSize of sizes) {
    if (visualUnits(title) <= (boxWidth / fontSize) * maxLines * 0.9) {
      return { fontSize, text: title };
    }
  }

  const fontSize = sizes.at(-1)!;
  const budget = (boxWidth / fontSize) * maxLines * 0.86 - 1;
  let text = "";
  let used = 0;
  for (const character of title) {
    const width = visualUnits(character);
    if (used + width > budget) break;
    text += character;
    used += width;
  }
  return { fontSize, text: `${text.trimEnd()}…` };
}

export function clipInviteName(name: string, maximum = 6) {
  const characters = [...name];
  return characters.length > maximum
    ? `${characters.slice(0, maximum - 1).join("")}…`
    : name;
}

export function inviteOgImagePath(token: string) {
  return `/invite/${encodeURIComponent(token)}/opengraph-image`;
}
