import { Link, usePathname } from "expo-router";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, space } from "../lib/tokens";
import { useApp } from "../providers/AppProvider";

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const { online, demoMode } = useApp();
  const body = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {!online && <Banner tone="warning">오프라인이에요. 연결되면 자동으로 다시 이어갈게요.</Banner>}
      {demoMode && <Banner>데모 자료를 보고 있어요. 쓰기 기능은 안전하게 잠겨 있어요.</Banner>}
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{body}</ScrollView> : body}
    </SafeAreaView>
  );
}

export function Banner({ children, tone = "info" }: PropsWithChildren<{ tone?: "info" | "warning" }>) {
  return <Text style={[styles.banner, tone === "warning" && styles.bannerWarning]}>{children}</Text>;
}

export function Brand() {
  return <Text style={styles.brand}>해낼게<Text style={styles.brandDot}>.</Text></Text>;
}

export function Button({ label, variant = "primary", loading, ...props }: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; loading?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={props.disabled || loading}
      style={({ pressed }) => [styles.button, variant === "secondary" && styles.buttonSecondary, variant === "danger" && styles.buttonDanger, (props.disabled || loading) && styles.buttonDisabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator color={variant === "secondary" ? colors.cloverDark : colors.card} /> : <Text style={[styles.buttonText, variant === "secondary" && styles.buttonTextSecondary]}>{label}</Text>}
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const nav = [
  ["/home", "⌂", "홈"],
  ["/friends", "♧", "친구"],
  ["/invite", "+", "초대"],
  ["/my", "●", "마이"]
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <View style={styles.nav}>
      {nav.map(([href, icon, label]) => {
        const active = pathname.startsWith(href);
        return (
          <Link key={href} href={href} asChild>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} style={styles.navItem}>
              <Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text>
              <Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

export const typography = StyleSheet.create({
  title: { color: colors.ink, fontSize: 30, lineHeight: 39, fontWeight: "800", letterSpacing: -0.8 },
  heading: { color: colors.ink, fontSize: 22, lineHeight: 30, fontWeight: "800", letterSpacing: -0.4 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18 }
});

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { flexGrow: 1 },
  content: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 104, gap: space.lg },
  banner: { backgroundColor: colors.cloverSoft, color: colors.cloverDark, fontSize: 13, lineHeight: 18, paddingHorizontal: space.lg, paddingVertical: space.sm, textAlign: "center" },
  bannerWarning: { backgroundColor: colors.warningSoft, color: colors.warning },
  brand: { color: colors.ink, fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  brandDot: { color: colors.clover },
  button: { minWidth: 44, minHeight: 52, borderRadius: 16, backgroundColor: colors.clover, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.card, fontSize: 16, fontWeight: "800" },
  buttonTextSecondary: { color: colors.cloverDark },
  pressed: { opacity: 0.76 },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: space.lg, gap: space.md },
  nav: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 76, paddingBottom: 10, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-around" },
  navItem: { flex: 1, minHeight: 60, alignItems: "center", justifyContent: "center", gap: 2 },
  navIcon: { color: colors.muted, fontSize: 22, fontWeight: "700" },
  navLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  navActive: { color: colors.cloverDark }
});
