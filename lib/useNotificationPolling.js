import { useEffect, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationsApi, auth as authApi } from "./api";
import { eventBus } from "./eventBus";

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const SEEN_KEY = "seen_notification_ids";

async function getSeenIds() {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

async function saveSeenIds(set) {
  try {
    // Keep only the last 200 IDs to prevent unbounded growth
    const arr = Array.from(set).slice(-200);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {}
}

async function showLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? "high",
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // show immediately
    });
  } catch {}
}

export function useNotificationPolling() {
  const timerRef = useRef(null);
  const pollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const isLoggedIn = await authApi.isAuthenticated().catch(() => false);
      if (!isLoggedIn) return;

      const res = await notificationsApi.list("limit=20&sort=-createdAt");
      const items = Array.isArray(res)
        ? res
        : res?.notifications || res?.data || [];

      if (!items.length) return;

      const seen = await getSeenIds();
      const fresh = items.filter((n) => {
        const id = n._id || n.id;
        return id && !seen.has(id) && !n.isRead;
      });

      if (fresh.length === 0) return;

      // Show a local push notification for each new item
      for (const n of fresh) {
        const title = n.title || n.notification?.title || "TripKart";
        const body =
          n.body || n.message || n.notification?.body || "You have a new notification";
        await showLocalNotification(title, body, { route: n.route || null });
        seen.add(n._id || n.id);
      }

      await saveSeenIds(seen);

      // Emit to update notification screen + bell in real time (no manual refresh needed)
      eventBus.emit("notifications:new", fresh);
    } catch {
      // network errors are silent — polling will retry next interval
    } finally {
      pollingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Poll immediately on mount, then every POLL_INTERVAL_MS
    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);
}
