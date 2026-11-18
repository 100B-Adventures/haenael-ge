import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import {
  loadMobileCashout,
  submitMobileCashout,
  type MobileCashoutEligibility,
} from "@/lib/cashout";
import { userMessage } from "@/lib/errors";
import { colors, radius, space, typeScale } from "@/lib/tokens";

function maturityLabel(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("ko-KR") : "예정 없음";
}

export default function CashoutScreen() {
  const [eligibility, setEligibility] = useState<MobileCashoutEligibility>();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [cloverAmount, setCloverAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    loadMobileCashout()
      .then((value) => {
        if (!mounted) return;
        setEligibility(value);
        setCloverAmount(String(value.min_cashout_clover));
      })
      .catch((error) => mounted && setNotice(userMessage(error)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const amount = Number(cloverAmount);
  const canSubmit = useMemo(() => Boolean(
    eligibility?.cashout_enabled && eligibility.reached_threshold &&
    Number.isSafeInteger(amount) && amount >= eligibility.min_cashout_clover &&
    amount <= eligibility.payable_amount && /^[0-9]{3}$/.test(bankCode) &&
    /^[0-9]{6,20}$/.test(accountNumber.replace(/[\s-]/g, "")) &&
    accountHolder.trim().length >= 2
  ), [accountHolder, accountNumber, amount, bankCode, eligibility]);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice("");
    try {
      await submitMobileCashout({ cloverAmount: amount, bankCode, accountNumber, accountHolder });
      setNotice("환전 신청을 접수했어요. 진행 상태는 마이 화면에서 확인할 수 있어요.");
      setEligibility(await loadMobileCashout());
    } catch (error) {
      setNotice(userMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /></View>
      <View style={styles.hero}><Text style={typography.title}>받은 마음을{`\n`}원하는 방식으로</Text><Text style={typography.body}>환불 보류가 끝난 클로버만 환전하거나 선물로 바꿀 수 있어요.</Text></View>
      <Card style={styles.balance}><Text style={styles.light}>사용 가능</Text><Text style={styles.value}>🍀 {eligibility?.payable_amount ?? 0}개</Text><Text style={styles.light}>보류 중 🍀 {eligibility?.maturity_locked_amount ?? 0}개 · 다음 해제 {maturityLabel(eligibility?.next_maturity_at ?? null)}</Text></Card>
      <Card>
        <Text style={typography.heading}>계좌로 환전</Text>
        <Text style={typography.muted}>본인 확인을 마친 허용 계정만 {eligibility?.min_cashout_clover ?? 30}개부터 신청할 수 있어요.</Text>
        <TextInput accessibilityLabel="은행 코드" value={bankCode} onChangeText={setBankCode} keyboardType="number-pad" maxLength={3} placeholder="은행 코드 3자리" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput accessibilityLabel="계좌번호" value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" placeholder="계좌번호" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput accessibilityLabel="예금주" value={accountHolder} onChangeText={setAccountHolder} placeholder="예금주" placeholderTextColor={colors.muted} style={styles.input} />
        <TextInput accessibilityLabel="환전 클로버 수" value={cloverAmount} onChangeText={setCloverAmount} keyboardType="number-pad" placeholder="환전할 클로버" placeholderTextColor={colors.muted} style={styles.input} />
        {!eligibility?.cashout_enabled && !loading && <Text style={typography.meta}>현재 이 계정에는 모바일 환전 기능이 열려 있지 않아요.</Text>}
        <Button label="환전 신청" loading={submitting} disabled={!canSubmit} onPress={submit} />
      </Card>
      <Card><Text style={typography.heading}>선물로 바꾸기</Text><Text style={typography.muted}>{eligibility?.gift_exchange_enabled ? "기프티콘 제공사는 연결됐고 앱 교환 화면을 준비하고 있어요." : "기프티콘 제공사 연결 전이라 아직 사용할 수 없어요."}</Text><Button variant="secondary" label={eligibility?.gift_exchange_enabled ? "제공사 연결됨" : "연결 준비 중"} disabled /></Card>
      {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { gap: space.md, paddingVertical: space.lg },
  balance: { backgroundColor: colors.cloverDark },
  light: { color: colors.cloverSoft, ...typeScale.muted },
  value: { color: colors.card, fontSize: 32, lineHeight: 40, fontWeight: "900" },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: space.md, color: colors.ink, ...typeScale.body },
  notice: { color: colors.cloverDark, backgroundColor: colors.cloverSoft, borderRadius: radius.notice, padding: space.md, ...typeScale.muted },
});
