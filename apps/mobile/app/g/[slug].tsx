import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Card, Screen, typography } from "@/components/ui";
import { loadGoalBySlug } from "@/lib/data";
import { userMessage } from "@/lib/errors";

export default function GoalDeepLinkScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [error, setError] = useState("");
  useEffect(() => {
    loadGoalBySlug(slug).then(({ goal }) => router.replace(`/goals/${goal.id}`)).catch((cause) => setError(userMessage(cause)));
  }, [slug]);
  return <Screen><Card><Text style={typography.body}>{error || "목표로 이동하고 있어요."}</Text></Card></Screen>;
}
