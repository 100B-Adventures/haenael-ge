import * as Linking from "expo-linking";
import { StyleSheet, Text, View } from "react-native";
import { colors, space } from "../lib/tokens";
import { useApp } from "../providers/AppProvider";
import { Button, Brand, typography } from "./ui";

export function UpdateGate() {
  const { update } = useApp();
  if (!update.required) return null;
  return (
    <View style={styles.overlay}>
      <Brand />
      <Text style={typography.title}>새 버전으로 이어가요</Text>
      <Text style={typography.body}>안전한 결제와 알림을 위해 {update.minimumVersion} 이상이 필요해요.</Text>
      <Button label="스토어에서 업데이트" disabled={!update.storeUrl} onPress={() => Linking.openURL(update.storeUrl)} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, backgroundColor: colors.paper, padding: space.xl, justifyContent: "center", gap: space.xl }
});
