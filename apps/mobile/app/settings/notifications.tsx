import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { registerPushToken, unregisterPushToken } from "@/lib/notifications";
import { userMessage } from "@/lib/errors";
import { colors, space } from "@/lib/tokens";

export default function NotificationSettingsScreen() {
  const [enabled, setEnabled] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  async function toggle(value: boolean) {
    setLoading(true); setNotice("");
    try { if (value) await registerPushToken(); else await unregisterPushToken(); setEnabled(value); }
    catch (cause) { setNotice(userMessage(cause)); }
    finally { setLoading(false); }
  }
  return <Screen><View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View><View style={styles.hero}><Text style={typography.title}>놓치고 싶지 않은{`\n`}소식만 받아요</Text><Text style={typography.body}>알림 본문에는 금액과 클로버 수를 넣지 않아요.</Text></View><Card><View style={styles.row}><View style={styles.copy}><Text style={styles.label}>응원·목표 알림</Text><Text style={typography.meta}>새 응원과 목표 마감 소식</Text></View><Switch testID="push-toggle" disabled={loading} value={enabled} onValueChange={(value) => void toggle(value)} trackColor={{ true: colors.clover }} /></View><View style={styles.row}><View style={styles.copy}><Text style={styles.label}>혜택과 소식</Text><Text style={typography.meta}>선택 동의, 언제든 끌 수 있어요</Text></View><Switch value={marketing} onValueChange={setMarketing} trackColor={{ true: colors.clover }} /></View></Card>{notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}<Text style={typography.meta}>기기 알림을 거부했다면 기기 설정에서 직접 허용해야 해요.</Text></Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, hero: { gap: space.md, paddingVertical: space.lg }, row: { minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border }, copy: { flex: 1, gap: space.xs }, label: { color: colors.ink, fontSize: 16, fontWeight: "800" }, notice: { color: colors.warning, backgroundColor: colors.warningSoft, borderRadius: 14, padding: space.md, fontSize: 14 } });
