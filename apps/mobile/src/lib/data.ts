import { appConfig } from "./config";
import { demoGoals, demoWords, type Goal, type Word } from "./models";
import { supabase } from "./supabase";
import { AppError } from "./errors";

export async function loadMyGoals(): Promise<Goal[]> {
  if (appConfig.demoMode) return demoGoals;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new AppError("authentication_required", "로그인이 필요해요.");
  const { data, error } = await supabase
    .from("goal")
    .select("id,slug,title,reason,due_date,status,created_at")
    .eq("member_id", userData.user.id)
    .is("deleted_at", null)
    .neq("status", "DELETED")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Goal[];
}

export async function loadGoalById(id: number): Promise<{ goal: Goal; words: Word[] }> {
  if (appConfig.demoMode) {
    const goal = demoGoals.find((item) => item.id === id) ?? demoGoals[0];
    return { goal, words: demoWords };
  }
  const goalResult = await supabase
    .from("goal_public")
    .select("id,slug,title,reason,due_date,status,cheer_count")
    .eq("id", id)
    .maybeSingle();
  if (goalResult.error) throw goalResult.error;
  if (!goalResult.data) throw new AppError("goal_not_found", "목표를 찾을 수 없어요.");
  const wordsResult = await supabase.rpc("get_wordmap", { p_goal_id: id });
  if (wordsResult.error) throw wordsResult.error;
  return { goal: goalResult.data as Goal, words: (wordsResult.data ?? []) as Word[] };
}

export async function loadGoalBySlug(slug: string) {
  if (appConfig.demoMode) {
    const goal = demoGoals.find((item) => item.slug === slug) ?? demoGoals[0];
    return loadGoalById(goal.id);
  }
  const result = await supabase.from("goal_public").select("id").eq("slug", slug).maybeSingle();
  if (result.error || !result.data) throw new AppError("goal_not_found", "목표를 찾을 수 없어요.");
  return loadGoalById(Number(result.data.id));
}
