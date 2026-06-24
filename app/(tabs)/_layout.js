import { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Platform,
  Image,
  View,
  Text,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../lib/theme";
import { useTheme } from "../../lib/ThemeContext";
import { publicSettings } from "../../lib/api";
import { registerPushToken } from "../../lib/notifications";

// Profile tab icon — shows user's photo when available, refreshes when focused or when photo changes
function ProfileTabIcon({ color, focused }) {
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          setPhotoUrl(u?.photoUrl || null);
        } else {
          setPhotoUrl(null);
        }
      } catch {
        setPhotoUrl(null);
      }
    };
    load();
  }, [focused]); // re-check every time tab gains focus

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("userPhotoChanged", (url) => {
      setPhotoUrl(url || null);
    });
    return () => sub.remove();
  }, []);

  if (photoUrl) {
    return (
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: focused ? 2 : 1.5,
          borderColor: focused ? colors.primary : colors.textDisabled,
          overflow: "hidden",
        }}
      >
        <Image
          source={{ uri: photoUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <Ionicons
      name={focused ? "person-circle" : "person-circle-outline"}
      size={24}
      color={color}
    />
  );
}

function MaintenanceScreen() {
  return (
    <View style={ms.root}>
      <LinearGradient
        colors={["#0D0507", "#1E0A0A", "#2D1010"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={ms.iconWrap}>
        <Ionicons name="construct-outline" size={48} color={colors.primary} />
      </View>
      <Text style={ms.title}>Under Maintenance</Text>
      <Text style={ms.body}>
        We're making improvements to serve you better.{"\n"}The app will be back
        shortly.
      </Text>
      <View style={ms.divider} />
      <Text style={ms.brand}>Shyam Sawariya Parivar</Text>
    </View>
  );
}

const ms = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#1E0A0A",
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(217,93,57,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(217,93,57,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: "white",
    textAlign: "center",
    marginBottom: 14,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 290,
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginVertical: 36,
  },
  brand: {
    fontFamily: fonts.accent,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    // Re-register push token here — tabs only render when the user is authenticated,
    // so this guarantees the FCM token is saved to the backend after every login.
    registerPushToken().catch(() => {});

    const init = async () => {
      const role = await AsyncStorage.getItem("role").catch(() => null);
      setIsSuperAdmin(role === "super_admin");
      try {
        const settings = await publicSettings.get();
        setMaintenanceMode(settings?.maintenanceMode ?? false);
      } catch {}
    };
    init();

    const sub = DeviceEventEmitter.addListener("appSettingsChanged", (cfg) => {
      setMaintenanceMode(cfg.maintenanceMode ?? false);
    });
    return () => sub.remove();
  }, []);

  if (maintenanceMode && !isSuperAdmin) {
    return <MaintenanceScreen />;
  }

  const bottomPad = Math.max(insets.bottom, 8);
  const tabHeight = 64 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textDisabled,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          marginTop: 2,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingTop: 10,
          paddingBottom: bottomPad,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tours"
        options={{
          title: "Tours",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bus" : "bus-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      {/* <Tabs.Screen name="bhajans" options={{ href: null }} /> */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "ticket" : "ticket-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <ProfileTabIcon color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
