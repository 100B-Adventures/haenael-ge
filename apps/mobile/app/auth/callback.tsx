import { useEffect } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { Screen, typography } from "@/components/ui";

export default function AuthCallbackScreen() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace("/home"), 250);
    return () => clearTimeout(timer);
  }, []);
  return <Screen><Text style={typography.body}>로그인을 마무리하고 있어요.</Text></Screen>;
}
