import { StyleSheet, Text, View } from "react-native";
import type { Word } from "../lib/models";
import { colors, space } from "../lib/tokens";

export function WordCloud({ words }: { words: Word[] }) {
  const max = Math.max(...words.map((word) => word.word_count), 1);
  return (
    <View accessibilityLabel="응원 워드맵" style={styles.cloud}>
      {words.map((word, index) => (
        <Text
          key={`${word.word}-${index}`}
          style={[
            styles.word,
            {
              fontSize: 15 + Math.round((word.word_count / max) * 9),
              color: index % 3 === 0 ? colors.cloverDark : index % 3 === 1 ? colors.clover : colors.ink
            }
          ]}
        >
          {word.word}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cloud: { minHeight: 230, borderRadius: 28, backgroundColor: colors.cloverSoft, padding: space.xl, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: space.md },
  word: { fontWeight: "800", letterSpacing: -0.4 }
});
