import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Button, Card, Screen, typography } from "@/components/ui";

export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  useEffect(() => { if (!token) router.replace("/home"); }, [token]);
  return <Screen><Card><Text style={typography.heading}>친구가 목표를 같이 지켜봐 달래요</Text><Text style={typography.body}>초대를 받으면 친구의 공개 목표와 워드맵을 내 친구 탭에서 볼 수 있어요.</Text><Button label="초대 받기" onPress={() => router.replace("/friends")} /><Button variant="secondary" label="나중에" onPress={() => router.replace("/home")} /></Card></Screen>;
}
