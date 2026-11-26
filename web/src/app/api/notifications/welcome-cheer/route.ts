import { after, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { deliverWelcomeCheerNotification } from "@/lib/welcome-cheer-notification";

export const dynamic = "force-dynamic";

const GOAL_SLUG_PATTERN = /^[a-z0-9]{1,32}$/;

export async function POST(request: Request) {
  let goalSlug: string;
  try {
    const body = await request.json() as { goalSlug?: unknown };
    goalSlug = typeof body.goalSlug === "string" ? body.goalSlug.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!GOAL_SLUG_PATTERN.test(goalSlug)) {
    return NextResponse.json({ error: "invalid_goal" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  let serviceClient: ReturnType<typeof createServiceRoleClient>;
  try {
    serviceClient = createServiceRoleClient();
  } catch (error) {
    console.error("[welcome-cheer-notification] service client unavailable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  const { data: claims, error: claimError } = await supabase.rpc(
    "claim_goal_created_notification",
    { p_goal_slug: goalSlug },
  );
  if (claimError) {
    console.error("[welcome-cheer-notification] claim failed", {
      dbCode: claimError.code ?? "unknown",
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  const claim = Array.isArray(claims) ? claims[0] : claims;
  if (!claim) {
    return NextResponse.json({ accepted: true }, { status: 202 });
  }

  after(async () => {
    await deliverWelcomeCheerNotification(serviceClient, {
      memberId: user.id,
      goalId: claim.goal_id,
      displayName: claim.member_nickname,
      goalTitle: claim.goal_title,
      goalSlug: claim.goal_slug,
      phone: typeof claim.member_phone === "string"
        ? claim.member_phone
        : undefined,
    });
  });

  return NextResponse.json({ accepted: true }, { status: 202 });
}
