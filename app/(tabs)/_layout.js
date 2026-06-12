import { useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Image, View, DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts } from "../../lib/theme";

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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
          marginTop: -2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
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
