import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomNav, Brand, Button, Card, Screen, typography } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/tokens";
import { unregisterPushToken } from "@/lib/notifications";

const rows = [
  ["나의 활동", "받은 응원과 워드맵"],
  ["환전·선물", "사용 가능한 클로버 확인"],
  ["알림 설정", "응원과 목표 소식"],
  ["회원 탈퇴", "앱 안에서 계정 삭제"]
] as const;

export default function MyScreen() {
  function open(label: string) {
    if (label === "환전·선물") router.push("/cashout");
    else if (label === "알림 설정") router.push("/settings/notifications");
    else if (label === "회원 탈퇴") router.push("/settings/delete-account");
  }
  return <View style={styles.root}><Screen><Brand /><View style={styles.hero}><Text style={typography.meta}>마이</Text><Text style={typography.title}>내가 쌓은 마음과 기록</Text></View><Card><View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>나</Text></View><View><Text style={typography.heading}>해낼 사람</Text><Text style={typography.muted}>목표를 향해 가는 중</Text></View></View></Card><Card>{rows.map(([label, help]) => <Pressable key={label} style={styles.row} onPress={() => open(label)}><View><Text style={styles.rowLabel}>{label}</Text><Text style={typography.meta}>{help}</Text></View><Text style={styles.arrow}>›</Text></Pressable>)}</Card><Button variant="secondary" label="로그아웃" onPress={async () => { await unregisterPushToken().catch(() => undefined); await supabase.auth.signOut(); router.replace("/auth"); }} /></Screen><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, hero: { gap: space.sm, paddingVertical: space.lg }, profile: { flexDirection: "row", gap: space.md, alignItems: "center" }, avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cloverSoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.cloverDark, fontSize: 20, fontWeight: "900" }, row: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border }, rowLabel: { color: colors.ink, fontSize: 16, fontWeight: "800" }, arrow: { color: colors.muted, fontSize: 28 } });
