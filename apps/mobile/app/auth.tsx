import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Brand, Button, Screen, typography } from "@/components/ui";
import { signInWithApple, sendMagicLink } from "@/lib/auth";
import { userMessage } from "@/lib/errors";
import { colors, space } from "@/lib/tokens";
import { useApp } from "@/providers/AppProvider";

export default function AuthScreen() {
  const { demoMode } = useApp();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  async function run(action: () => Promise<unknown>, success?: string) {
    setLoading(true);
    setNotice("");
    try {
      await action();
      if (success) setNotice(success);
      else router.replace("/home");
    } catch (error) {
      setNotice(userMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Brand />
      <View style={styles.hero}>
        <Text style={typography.title}>내 목표와 응원을{`\n`}한곳에 모아요</Text>
        <Text style={typography.body}>로그인하면 기기를 바꿔도 목표와 워드맵이 그대로 이어져요.</Text>
      </View>
      <Button testID="apple-sign-in" label="Apple로 계속하기" loading={loading} disabled={demoMode} onPress={() => void run(signInWithApple)} />
      <View style={styles.divider}><View style={styles.line} /><Text style={typography.meta}>또는</Text><View style={styles.line} /></View>
      <TextInput
        testID="email-input"
        accessibilityLabel="이메일"
        style={styles.input}
        placeholder="name@example.com"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button variant="secondary" label="로그인 링크 받기" loading={loading} disabled={demoMode} onPress={() => void run(() => sendMagicLink(email), "메일함에서 로그인 링크를 열어 주세요.")} />
      {notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}
      {demoMode && <Button variant="secondary" label="데모 홈 보기" onPress={() => router.replace("/home")} />}
      <Text style={styles.legal}>계속하면 이용약관과 개인정보처리방침에 동의한 것으로 봅니다.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingVertical: space.xl },
  divider: { flexDirection: "row", alignItems: "center", gap: space.md },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: space.lg, fontSize: 16, color: colors.ink },
  notice: { color: colors.cloverDark, fontSize: 14, lineHeight: 21, textAlign: "center" },
  legal: { ...typography.meta, textAlign: "center", marginTop: space.lg }
});
