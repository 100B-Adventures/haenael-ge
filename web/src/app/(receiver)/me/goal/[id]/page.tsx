import Link from "next/link";
import { notFound } from "next/navigation";
import { CheerList, type ReceiverCheer } from "@/components/receiver/CheerList";
import {
  BackHomeLink,
  ReceiverBrandMark,
  ReceiverPageShell,
  ReceiverTopBar,
} from "@/components/receiver/ReceiverShell";
import { GoalEditSheet } from "@/components/goal/GoalEditSheet";
import { MyLinkCard } from "@/components/goal/MyLinkCard";
import { SplitBalanceCard } from "@/components/goal/SplitBalanceCard";
import { GoalCoverPicker } from "@/components/social/GoalCoverPicker";
import { GoalVisibilityControl } from "@/components/social/GoalVisibilityControl";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export default async function GoalManagementPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const goalId = Number((await params).id);
  if (!Number.isSafeInteger(goalId) || goalId <= 0) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <ReceiverPageShell testId="goal-access-required" bottomSafe>
        <ReceiverBrandMark />
        <section className="social-empty mt-5">
          <h1>권한이 필요한 화면이에요.</h1>
          <p className="social-description">
            내 목표 관리 화면은 로그인한 목표 소유자만 볼 수 있어요.
          </p>
          <Link className="social-primary-action" href="/">
            로그인하러 가기
          </Link>
        </section>
      </ReceiverPageShell>
    );
  }
  const { data: goal, error } = await supabase.from("goal").select(
    "id,slug,title,reason,due_date,status,visibility,cover_preset_key,active_cover_asset_id",
  ).eq("id", goalId).eq("member_id", user.id).is("deleted_at", null)
    .maybeSingle();
  if (error || !goal) notFound();
  const [{ data: cheers }, { data: eligibilityRaw }] = await Promise.all([
    supabase.from("cheer").select(
      "id,display_name,is_anonymous,message,clover_amount,created_at",
    ).eq("goal_id", goal.id).eq("status", "CONFIRMED").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(20),
    supabase.rpc("clover_eligibility", { p_member_id: user.id }),
  ]);
  const eligibility = Array.isArray(eligibilityRaw)
    ? eligibilityRaw[0]
    : eligibilityRaw;
  let imageUrl: string | null = null;
  if (goal.active_cover_asset_id) {
    const service = createServiceRoleClient();
    const { data: asset } = await service.from("goal_cover_asset").select(
      "quarantine_path,public_path,status",
    ).eq("id", goal.active_cover_asset_id).eq("owner_member_id", user.id).eq(
      "status",
      "APPROVED",
    ).maybeSingle();
    if (asset?.public_path) {
      imageUrl = service.storage.from("goal-cover-public").getPublicUrl(
        asset.public_path,
      ).data.publicUrl;
    } else if (asset?.quarantine_path) {
      imageUrl =
        (await service.storage.from("goal-cover-quarantine").createSignedUrl(
          asset.quarantine_path,
          120,
        )).data?.signedUrl ?? null;
    }
  }
  const cleanTitle = goal.title.replace(/\s*해낼게\s*$/, "").trim();
  return (
    <ReceiverPageShell testId="goal-management-page" bottomSafe>
      <ReceiverTopBar variant="detail" />
      <div className="mb-5">
        <p className="social-eyebrow">목표 관리</p>
        <h1 className="receiver-page-title">{cleanTitle}</h1>
      </div>
      <div className="social-stack">
        <GoalCoverPicker
          goalId={goal.id}
          title={cleanTitle}
          initialPreset={goal.cover_preset_key}
          imageUrl={imageUrl}
        />
        <GoalVisibilityControl
          goalId={goal.id}
          initialVisibility={goal.visibility}
        />
        <section className="social-card">
          <div className="social-card-heading">
            <h2>이 목표를 응원한 사람</h2>
            <span>{cheers?.length ?? 0}명</span>
          </div>
          <CheerList
            cheers={(cheers ?? []) as ReceiverCheer[]}
            totalCount={cheers?.length ?? 0}
          />
        </section>
        <section className="social-card">
          <SplitBalanceCard
            total={eligibility?.total_balance ?? 0}
            locked={eligibility?.locked_amount ?? 0}
            available={eligibility?.available_amount ?? 0}
          />
        </section>
        <MyLinkCard slug={goal.slug} />
        <GoalEditSheet
          goalId={goal.id}
          initialTitle={cleanTitle}
          initialReason={goal.reason}
          initialDueDate={goal.due_date}
          editable={goal.status === "ACTIVE"}
        />
      </div>
      <BackHomeLink />
    </ReceiverPageShell>
  );
}
