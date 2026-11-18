import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Share, StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { WordCloud } from "@/components/WordCloud";
import { loadGoalById } from "@/lib/data";
import { userMessage } from "@/lib/errors";
import type { Goal, Word } from "@/lib/models";
import { colors, space } from "@/lib/tokens";

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { loadGoalById(Number(id)).then((value) => { setGoal(value.goal); setWords(value.words); }).catch((cause) => setError(userMessage(cause))); }, [id]);
  return (
    <Screen>
      <View style={styles.header}><Button variant="secondary" label="‹" onPress={() => router.back()} /><Brand /><Button variant="secondary" label="공유" disabled={!goal} onPress={() => goal && Share.share({ message: `https://haenael.app/g/${goal.slug}` })} /></View>
      {error ? <Card><Text style={typography.body}>{error}</Text></Card> : null}
      {goal ? <>
        <View style={styles.hero}><Text style={typography.meta}>함께 지켜보는 목표</Text><Text style={typography.title}>{goal.title.replace(/\s*해낼게$/, "")}</Text><Text style={typography.body}>{goal.reason}</Text></View>
        <Card><View style={styles.meta}><Text style={styles.cheer}>🍀 {goal.cheer_count ?? words.reduce((sum, word) => sum + word.word_count, 0)}번의 응원</Text><Text style={typography.meta}>{goal.due_date}까지</Text></View></Card>
        <WordCloud words={words} />
        <Button testID="support-goal" label="조용히 밀어줄게" onPress={() => router.push(`/goals/${goal.id}/support`)} />
      </> : <Text style={typography.body}>목표를 불러오고 있어요.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { gap: space.md, paddingVertical: space.lg },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cheer: { color: colors.cloverDark, fontSize: 16, fontWeight: "800" }
});
