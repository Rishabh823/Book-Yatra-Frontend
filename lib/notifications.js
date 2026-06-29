import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority?.HIGH,
  }),
});

export async function registerPushToken() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "TripKart",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D95D39",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC,
      bypassDnd: false,
      enableVibrate: true,
      showBadge: true,
    });
    // High priority channel for broadcast alerts
    await Notifications.setNotificationChannelAsync("alerts", {
      name: "Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D95D39",
    });
  }

  try {
    // Try FCM token first (works for locally built release APKs)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData?.data;
    if (fcmToken) {
      await api
        .post("/users/push-token", {
          token: fcmToken,
          platform: Platform.OS,
          type: "fcm",
        })
        .catch(() => {});
    }
  } catch {}

  try {
    // Also register Expo push token as fallback
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "e68c5a74-98fb-490c-acaf-408352457a61",
    });
    const token = tokenData.data;
    await api.post("/users/push-token", {
      token,
      platform: Platform.OS,
      type: "expo",
    });
    return token;
  } catch {
    return null;
  }
}

export async function registerTokenIfGranted() {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return null;
  return registerPushToken();
}

export function addNotificationListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
