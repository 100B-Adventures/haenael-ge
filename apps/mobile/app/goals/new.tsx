import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { appConfig } from "@/lib/config";
import { userMessage } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/tokens";
import { validateGoalDraft } from "@/lib/goal-validation";

export default function NewGoalScreen() {
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const validation = validateGoalDraft({ title, dueDate });
    if (validation) {
      setError(validation);
      return;
    }
    if (appConfig.demoMode) { setError("데모에서는 목표를 저장하지 않아요."); return; }
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc("create_goal", {
        p_title: title.trim(), p_reason: reason.trim(), p_due_date: dueDate
      });
      if (rpcError) throw rpcError;
      router.replace("/home");
    } catch (cause) { setError(userMessage(cause)); }
    finally { setLoading(false); }
  }

  return (
    <Screen>
      <View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View>
      <View style={styles.hero}><Text style={typography.title}>이번에는 무엇을{`\n`}해낼 건가요?</Text><Text style={typography.body}>친구가 한눈에 이해할 수 있게 한 문장으로 적어 주세요.</Text></View>
      <Card>
        <Text style={styles.label}>목표</Text>
        <TextInput testID="goal-title" style={styles.input} value={title} onChangeText={setTitle} maxLength={60} placeholder="예: 봄에 하프 마라톤 완주하기" placeholderTextColor={colors.muted} />
        <Text style={styles.label}>이유</Text>
        <TextInput testID="goal-reason" style={[styles.input, styles.multiline]} value={reason} onChangeText={setReason} maxLength={180} multiline placeholder="왜 이 목표를 이루고 싶은지 적어 주세요" placeholderTextColor={colors.muted} />
        <Text style={styles.label}>마감일</Text>
        <TextInput testID="goal-due-date" style={styles.input} value={dueDate} onChangeText={setDueDate} keyboardType="numbers-and-punctuation" placeholder="2027-04-18" placeholderTextColor={colors.muted} />
      </Card>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <Button testID="goal-submit" label="목표 만들기" loading={loading} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: { gap: space.md, paddingVertical: space.lg },
  label: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, fontSize: 16, color: colors.ink, backgroundColor: colors.paper },
  multiline: { minHeight: 96, paddingTop: space.md, textAlignVertical: "top" },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 }
});
