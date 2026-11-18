import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomNav, Brand, Card, Screen, typography } from "@/components/ui";
import { appConfig } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/tokens";

type FriendGoal = { friend_id?: string; nickname?: string; goal_id?: number; title?: string; recent_message?: string | null };

export default function FriendsScreen() {
  const [items, setItems] = useState<FriendGoal[]>([]);
  useEffect(() => {
    if (appConfig.demoMode) {
      setItems([{ nickname: "도경", goal_id: 101, title: "올해 첫 하프 마라톤 완주", recent_message: "오늘도 한 걸음!" }, { nickname: "서윤", goal_id: 102, title: "첫 전자책 출간", recent_message: "기다리고 있어" }]);
      return;
    }
    void supabase.rpc("my_friend_goals").then(({ data }) => setItems((data ?? []) as FriendGoal[]));
  }, []);
  return (
    <View style={styles.root}><Screen><Brand /><View style={styles.hero}><Text style={typography.meta}>친구의 목표</Text><Text style={typography.title}>같이 가면 오래 가요</Text></View>{items.map((item, index) => <Card key={`${item.friend_id}-${index}`}><View style={styles.row}><View style={styles.avatar}><Text style={styles.avatarText}>{item.nickname?.[0] ?? "친"}</Text></View><View style={styles.text}><Text style={styles.name}>{item.nickname ?? "친구"}</Text><Text style={typography.body}>{item.title}</Text><Text style={typography.muted}>{item.recent_message ?? "첫 응원을 기다리고 있어요."}</Text></View></View></Card>)}{items.length === 0 && <Card><Text style={typography.body}>아직 연결된 친구가 없어요. 초대 링크를 보내 보세요.</Text></Card>}</Screen><BottomNav /></View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, hero: { gap: space.sm, paddingVertical: space.lg }, row: { flexDirection: "row", gap: space.md }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cloverSoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.cloverDark, fontWeight: "900", fontSize: 18 }, text: { flex: 1, gap: space.xs }, name: { color: colors.cloverDark, fontSize: 14, fontWeight: "800" } });
