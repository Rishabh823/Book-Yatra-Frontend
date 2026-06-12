import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
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
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D95D39",
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "e68c5a74-98fb-490c-acaf-408352457a61",
    });
    const token = tokenData.data;
    await api.post("/users/push-token", { token, platform: Platform.OS });
    return token;
  } catch {
    return null;
  }
}

export function addNotificationListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
