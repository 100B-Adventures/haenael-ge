import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { appConfig } from "@/lib/config";
import { completeNativePurchase } from "@/lib/native-iap";
import { cloverProducts } from "@/lib/purchases";
import { userMessage } from "@/lib/errors";
import { colors, radius, space, typeScale } from "@/lib/tokens";

export default function SupportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [amount, setAmount] = useState(3);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const product = useMemo(() => cloverProducts.find((item) => item.cloverAmount === amount)!, [amount]);

  async function pay() {
    setLoading(true); setNotice("");
    try {
      const result = await completeNativePurchase({
        goalId: Number(id),
        cloverAmount: amount,
        message,
        anonymous,
      });
      setNotice(`응원이 도착했어요. 🍀 ${result.clover_amount}개는 ${new Date(result.available_at).toLocaleDateString("ko-KR")}부터 사용할 수 있어요.`);
    } catch (cause) { setNotice(userMessage(cause)); }
    finally { setLoading(false); }
  }

  const submitLabel = Platform.OS === "android" &&
      appConfig.googleUserChoiceBillingEnabled
    ? "결제 방법 선택"
    : `${product.storePrice.toLocaleString()}원 응원하기`;
  return (
    <Screen>
      <View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View>
      <View style={styles.hero}><Text style={typography.title}>클로버로{`\n`}마음을 보태요</Text><Text style={typography.body}>서버가 스토어 영수증을 확인한 뒤에만 응원이 쌓여요.</Text></View>
      <View style={styles.products}>{cloverProducts.map((item) => <Pressable key={item.cloverAmount} accessibilityRole="radio" accessibilityState={{ checked: amount === item.cloverAmount }} onPress={() => setAmount(item.cloverAmount)} style={[styles.product, amount === item.cloverAmount && styles.productSelected]}><Text style={styles.productClover}>🍀 {item.cloverAmount}</Text><Text style={typography.meta}>{(item.storePrice).toLocaleString()}원</Text></Pressable>)}</View>
      {Platform.OS === "android" && appConfig.googleUserChoiceBillingEnabled && (
        <Card>
          <Text style={styles.label}>결제 방법 선택</Text>
          <Text style={typography.muted}>결제를 시작하면 Google Play가 Play 결제와 토스페이먼츠 중 사용할 방법을 보여줘요.</Text>
          <Text style={typography.meta}>토스페이먼츠를 고르면 클로버 1개당 1,100원이 적용돼요.</Text>
        </Card>
      )}
      <Card>
        <Text style={styles.label}>응원 한마디</Text>
        <TextInput testID="support-message" style={styles.input} value={message} onChangeText={setMessage} maxLength={140} multiline placeholder="선택 사항이에요" placeholderTextColor={colors.muted} />
        <View style={styles.toggle}><View><Text style={typography.body}>익명으로 응원</Text><Text style={typography.meta}>받는 사람에게 이름을 보여주지 않아요.</Text></View><Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.clover }} /></View>
      </Card>
      <Text style={typography.meta}>앱 결제 응원은 환불 확인을 위해 30일 동안 보류돼요. 그 뒤 환전 또는 선물 교환에 사용할 수 있어요.</Text>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
      <Button testID="purchase-submit" label={submitLabel} loading={loading} onPress={pay} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { gap: space.md, paddingVertical: space.lg },
  products: { flexDirection: "row", gap: space.sm },
  product: { flex: 1, minHeight: 76, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", gap: space.xs },
  productSelected: { borderWidth: 2, borderColor: colors.clover, backgroundColor: colors.cloverSoft },
  productClover: { color: colors.cloverDark, ...typeScale.body, fontWeight: "900" },
  label: { color: colors.ink, ...typeScale.muted, fontWeight: "800" },
  input: { minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, padding: space.md, ...typeScale.body, color: colors.ink, textAlignVertical: "top" },
  toggle: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md },
  notice: { color: colors.cloverDark, backgroundColor: colors.cloverSoft, borderRadius: radius.notice, padding: space.md, ...typeScale.muted }
});
