import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { BottomNav, Brand, Button, Card, Screen, typography } from "@/components/ui";
import { loadMyGoals } from "@/lib/data";
import type { Goal } from "@/lib/models";
import { colors, space } from "@/lib/tokens";
import { userMessage } from "@/lib/errors";
import { useApp } from "@/providers/AppProvider";

function daysLeft(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

export default function HomeScreen() {
  const { session, demoMode } = useApp();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    setRefreshing(true);
    try { setGoals(await loadMyGoals()); setError(""); } catch (cause) { setError(userMessage(cause)); }
    finally { setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.root}>
      <Screen scroll={false}>
        <View style={styles.header}><Brand /><Text style={typography.meta}>{session?.user.email ?? (demoMode ? "데모" : "로그인 필요")}</Text></View>
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
          <View style={styles.titleRow}><View><Text style={typography.meta}>나의 목표</Text><Text style={typography.title}>오늘도 한 걸음</Text></View><Link href="/goals/new" asChild><Pressable style={styles.add}><Text style={styles.addText}>＋</Text></Pressable></Link></View>
          <Card style={styles.balance}>
            <Text style={typography.meta}>30일 뒤 사용할 수 있는 응원</Text>
            <Text style={styles.balanceValue}>🍀 19개</Text>
            <Text style={typography.muted}>결제 취소와 환불을 안전하게 반영한 뒤 사용할 수 있어요.</Text>
          </Card>
          {error ? <Card><Text style={typography.body}>{error}</Text><Button variant="secondary" label="다시 불러오기" onPress={load} /></Card> : null}
          {goals.map((goal) => (
            <Pressable key={goal.id} testID={`goal-card-${goal.id}`} onPress={() => router.push(`/goals/${goal.id}`)}>
              <Card>
                <View style={styles.goalTop}><Text style={styles.goalTitle}>{goal.title.replace(/\s*해낼게$/, "")}</Text><Text style={styles.dday}>{daysLeft(goal.due_date) >= 0 ? `D-${daysLeft(goal.due_date)}` : `D+${Math.abs(daysLeft(goal.due_date))}`}</Text></View>
                <Text style={typography.muted}>{goal.reason}</Text>
                <View style={styles.goalBottom}><Text style={styles.cheer}>🍀 {goal.cheer_count ?? 0}번의 응원</Text><Text style={typography.meta}>워드맵 보기 ›</Text></View>
              </Card>
            </Pressable>
          ))}
          {goals.length === 0 && !refreshing ? <Card><Text style={typography.heading}>첫 목표를 적어 볼까요?</Text><Button label="목표 만들기" onPress={() => router.push("/goals/new")} /></Card> : null}
        </ScrollView>
      </Screen>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  list: { gap: space.lg, paddingBottom: 120 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.lg },
  add: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cloverSoft, alignItems: "center", justifyContent: "center" },
  addText: { color: colors.cloverDark, fontSize: 26, fontWeight: "500" },
  balance: { backgroundColor: colors.cloverDark },
  balanceValue: { color: colors.card, fontSize: 30, fontWeight: "900" },
  goalTop: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  goalTitle: { ...typography.heading, flex: 1 },
  dday: { color: colors.cloverDark, backgroundColor: colors.cloverSoft, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 999, fontSize: 13, fontWeight: "800" },
  goalBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: space.sm },
  cheer: { color: colors.cloverDark, fontSize: 14, fontWeight: "800" }
});
