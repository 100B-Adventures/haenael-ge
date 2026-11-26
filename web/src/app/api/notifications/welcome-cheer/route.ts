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
    "claim_welcome_cheer_notification",
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

  const { data: member, error: phoneError } = await serviceClient
    .from("member")
    .select("phone")
    .eq("id", user.id)
    .maybeSingle();
  if (phoneError) {
    console.error("[welcome-cheer-notification] phone lookup failed", {
      goalId: claim.goal_id,
      dbCode: phoneError.code ?? "unknown",
    });
  }

  after(async () => {
    await deliverWelcomeCheerNotification(serviceClient, {
      memberId: user.id,
      goalId: claim.goal_id,
      goalTitle: claim.goal_title,
      phone: typeof member?.phone === "string" ? member.phone : undefined,
    });
  });

  return NextResponse.json({ accepted: true }, { status: 202 });
}
