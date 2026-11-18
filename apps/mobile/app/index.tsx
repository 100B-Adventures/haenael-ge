import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Brand, Button, Card, Screen, typography } from "@/components/ui";
import { WordCloud } from "@/components/WordCloud";
import { demoWords } from "@/lib/models";
import { colors, space } from "@/lib/tokens";
import { useApp } from "@/providers/AppProvider";

export default function IntroScreen() {
  const { introSeen, loading, session, markIntroSeen } = useApp();
  if (!loading && introSeen) {
    router.replace(session ? "/home" : "/auth");
    return null;
  }
  return (
    <Screen>
      <Brand />
      <View style={styles.hero}>
        <Text style={typography.title}>목표를 말하면{`\n`}친구들 응원이{`\n`}단어로 쌓여요</Text>
        <Text style={typography.body}>혼자 버티는 목표가 아니라, 곁에 있는 사람들의 마음이 보이는 목표를 만들어요.</Text>
      </View>
      <WordCloud words={demoWords.slice(0, 5)} />
      <Card>
        <Text style={styles.clover}>🍀</Text>
        <View style={styles.cardText}>
          <Text style={typography.heading}>응원은 실제 힘이 돼요</Text>
          <Text style={typography.muted}>친구가 보낸 클로버는 30일 뒤 환전하거나 선물로 바꿀 수 있어요.</Text>
        </View>
      </Card>
      <Button
        testID="intro-start"
        label="내 목표 시작하기"
        onPress={async () => {
          await markIntroSeen();
          router.replace(session ? "/goals/new" : "/auth");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.md, paddingTop: space.lg },
  clover: { fontSize: 32 },
  cardText: { gap: space.xs },
  word: { color: colors.cloverDark }
});
