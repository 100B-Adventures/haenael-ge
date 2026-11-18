import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { BottomNav, Brand, Button, Card, Screen, typography } from "@/components/ui";
import { appConfig } from "@/lib/config";
import { createRequestKey } from "@/lib/request-key";
import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/tokens";

export default function InviteScreen() {
  const [url, setUrl] = useState("https://haenael.app/invite/demo-friend-token");
  const [notice, setNotice] = useState("");
  async function create() {
    if (!appConfig.demoMode) {
      const { data, error } = await supabase.rpc("create_friend_invite", { request_key: createRequestKey("invite") });
      if (error) { setNotice("초대 링크를 만들지 못했어요."); return; }
      const token = typeof data === "string" ? data : data?.token;
      if (token) setUrl(`https://haenael.app/invite/${token}`);
    }
    await Share.share({ message: `내 목표를 같이 지켜봐 줘. ${url}` });
  }
  return <View style={styles.root}><Screen><Brand /><View style={styles.hero}><Text style={typography.title}>응원받고 싶은 친구를{`\n`}한 명 떠올려 보세요</Text><Text style={typography.body}>초대받은 친구는 앱이 없어도 웹에서 목표와 워드맵을 볼 수 있어요.</Text></View><Card><Text style={styles.link}>{url}</Text><Text style={typography.muted}>링크는 내 친구 연결에만 쓰이고, 만료되면 새로 만들 수 있어요.</Text></Card>{notice && <Text style={styles.notice}>{notice}</Text>}<Button label="친구에게 링크 보내기" onPress={create} /></Screen><BottomNav /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, hero: { gap: space.md, paddingVertical: space.xl }, link: { color: colors.cloverDark, fontSize: 15, fontWeight: "700" }, notice: { color: colors.danger, fontSize: 14 } });
