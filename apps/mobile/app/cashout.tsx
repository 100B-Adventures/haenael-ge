import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { colors, space } from "@/lib/tokens";

export default function CashoutScreen() {
  return <Screen><View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View><View style={styles.hero}><Text style={typography.title}>받은 마음을{`\n`}원하는 방식으로</Text><Text style={typography.body}>환불 보류가 끝난 클로버만 환전하거나 선물로 바꿀 수 있어요.</Text></View><Card style={styles.balance}><Text style={styles.light}>사용 가능</Text><Text style={styles.value}>🍀 19개</Text><Text style={styles.light}>보류 중 🍀 6개 · 다음 해제 12월 18일</Text></Card><Card><Text style={typography.heading}>계좌로 환전</Text><Text style={typography.muted}>본인 확인과 계좌 등록 후 30개부터 신청할 수 있어요.</Text><Button label="환전 신청" disabled /></Card><Card><Text style={typography.heading}>선물로 바꾸기</Text><Text style={typography.muted}>기프티콘 제공사가 연결되면 이곳에서 고를 수 있어요.</Text><Button variant="secondary" label="선물 둘러보기" disabled /></Card></Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, hero: { gap: space.md, paddingVertical: space.lg }, balance: { backgroundColor: colors.cloverDark }, light: { color: colors.cloverSoft, fontSize: 14 }, value: { color: colors.card, fontSize: 32, fontWeight: "900" } });
