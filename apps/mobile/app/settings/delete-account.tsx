import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { deleteAccountInApp, loadWithdrawalEligibility, type WithdrawalEligibility } from "@/lib/account";
import { userMessage } from "@/lib/errors";
import { colors, space } from "@/lib/tokens";

export default function DeleteAccountScreen() {
  const [eligibility, setEligibility] = useState<WithdrawalEligibility | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { loadWithdrawalEligibility().then(setEligibility).catch((cause) => setNotice(userMessage(cause))); }, []);
  async function remove() {
    setLoading(true); setNotice("");
    try { await deleteAccountInApp(); setConfirm(false); router.replace("/"); }
    catch (cause) { setNotice(userMessage(cause)); }
    finally { setLoading(false); }
  }
  return <Screen><View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View><View style={styles.hero}><Text style={typography.title}>탈퇴하면 이렇게 돼요</Text><Text style={typography.body}>계정과 공개 목표는 닫히고, 법정 보관이 필요한 결제 기록은 분리 보관해요.</Text></View><Card><Text style={styles.item}>• 목표와 워드맵 공개가 중단돼요.</Text><Text style={styles.item}>• 이 기기의 푸시 토큰을 지워요.</Text><Text style={styles.item}>• 같은 계정으로 되돌릴 수 없어요.</Text></Card>{eligibility && !eligibility.eligible && <Card style={styles.blocked}>{eligibility.blocked_reasons.clover_balance && <Text style={styles.blockText}>남은 클로버 {eligibility.clover_balance}개를 먼저 환전하거나 정리해 주세요.</Text>}{eligibility.blocked_reasons.cashout && <Text style={styles.blockText}>진행 중인 환전이 끝난 뒤 탈퇴를 접수해 주세요.</Text>}<Button variant="secondary" label="환전 상태 보기" onPress={() => router.push("/cashout")} /></Card>}{notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}<Button testID="delete-account" variant="danger" label="회원 탈퇴" disabled={!eligibility?.eligible} onPress={() => setConfirm(true)} /><Modal transparent visible={confirm} animationType="fade"><View style={styles.modalBackdrop}><View style={styles.modal}><Text style={typography.heading}>정말 탈퇴할까요?</Text><Text style={typography.body}>이 작업은 되돌릴 수 없어요.</Text><Button variant="danger" label="탈퇴하기" loading={loading} onPress={remove} /><Button variant="secondary" label="닫기" onPress={() => setConfirm(false)} /></View></View></Modal></Screen>;
}

const styles = StyleSheet.create({ header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, hero: { gap: space.md, paddingVertical: space.lg }, item: { ...typography.body, paddingVertical: space.xs }, blocked: { backgroundColor: colors.warningSoft, borderColor: colors.warning }, blockText: { color: colors.warning, fontSize: 14, lineHeight: 21, fontWeight: "700" }, notice: { color: colors.danger, fontSize: 14, lineHeight: 21 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(31,42,36,0.45)", justifyContent: "flex-end" }, modal: { backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: space.xl, gap: space.lg } });
