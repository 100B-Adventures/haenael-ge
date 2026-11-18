import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { appConfig } from "./config";
import { AppError } from "./errors";
import { createRequestKey } from "./request-key";
import { supabase } from "./supabase";

const DEVICE_KEY = "haenael.device-id";

export async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const created = createRequestKey("device");
  await AsyncStorage.setItem(DEVICE_KEY, created);
  return created;
}

export async function registerPushToken() {
  if (appConfig.demoMode) throw new AppError("demo_write_blocked", "데모에서는 알림을 켜지 않아요.");
  if (!Device.isDevice) throw new AppError("physical_device_required", "푸시 알림은 실제 기기에서 켤 수 있어요.");
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") throw new AppError("permission_denied", "기기 설정에서 알림을 허용해 주세요.");
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) throw new AppError("push_project_missing", "푸시 프로젝트 연결이 아직 끝나지 않았어요.");
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const deviceId = await getDeviceId();
  const { error } = await supabase.functions.invoke("register-push-token", {
    body: {
      platform: Platform.OS.toUpperCase(),
      expo_push_token: token.data,
      device_id: deviceId,
      request_key: createRequestKey("push")
    }
  });
  if (error) throw error;
  return token.data;
}

export async function unregisterPushToken() {
  if (appConfig.demoMode) return;
  const deviceId = await getDeviceId();
  const { error } = await supabase.functions.invoke("register-push-token", {
    method: "DELETE",
    body: { device_id: deviceId, request_key: createRequestKey("push_delete") }
  });
  if (error) throw error;
}
