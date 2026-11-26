import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { InviteOgTicket } from "@/features/invite-og/InviteOgTicket";
import {
  INVITE_OG_ALT,
  INVITE_OG_SIZE,
  toInviteOgModel,
} from "@/features/invite-og/model";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { observeInvitePreview } from "@/lib/social/contracts";

export const alt = INVITE_OG_ALT;
export const size = INVITE_OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const pretendard = readFile(
  join(process.cwd(), "assets/Pretendard-Bold.subset.woff"),
);

export default async function InviteOpenGraphImage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("friend_invite_preview", { token });
  const preview = error ? null : observeInvitePreview(data);
  const model = toInviteOgModel(preview, data);

  return new ImageResponse(<InviteOgTicket model={model} />, {
    ...size,
    fonts: [{
      name: "Pretendard",
      data: await pretendard,
      style: "normal",
      weight: 700,
    }],
  });
}
