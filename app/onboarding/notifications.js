import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { colors, fonts, radius, shadow } from "../../lib/theme";

const STEP = 5;
const TOTAL = 11;

const BENEFITS = [
  {
    icon: "ticket-outline",
    color: "#D95D39",
    title: "Booking Alerts",
    sub: "Instant confirmation and updates for your bookings",
  },
  {
    icon: "pricetag-outline",
    color: "#7C3AED",
    title: "Exclusive Offers",
    sub: "Special discounts and cashback just for you",
  },
  {
    icon: "bus-outline",
    color: "#2563EB",
    title: "Bus Arrival Updates",
    sub: "Know exactly when your bus arrives at pickup",
  },
  {
    icon: "warning-outline",
    color: "#DC2626",
    title: "Emergency Alerts",
    sub: "Critical safety notifications during travel",
  },
];

function StepBar({ step, total }) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i < step ? "#D95D39" : "#E8E4DF",
          }}
        />
      ))}
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      // status may be 'granted' or 'denied'; either way proceed
    } catch {}
    setLoading(false);
    router.push("/onboarding/onboard-auth");
  };

  const handleSkip = () => {
    router.push("/onboarding/onboard-auth");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={s.center}>
        <View style={s.bellWrap}>
          <View style={s.bellCircle}>
            <Ionicons name="notifications" size={52} color={colors.primary} />
          </View>
          {/* notification badges */}
          {[
            { top: 8, right: 12 },
            { top: 28, right: -4 },
          ].map((pos, i) => (
            <View key={i} style={[s.badge, pos]} />
          ))}
        </View>

        <Text style={s.title}>Stay in the Loop</Text>
        <Text style={s.sub}>
          Enable notifications to get real-time updates about your bookings and
          travel
        </Text>

        <View style={s.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={s.benefit}>
              <View
                style={[s.benefitIcon, { backgroundColor: b.color + "15" }]}
              >
                <Ionicons name={b.icon} size={20} color={b.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.benefitTitle}>{b.title}</Text>
                <Text style={s.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleEnable}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="notifications-outline" size={18} color="#fff" />
          <Text style={s.btnText}>
            {loading ? "Enabling..." : "Enable Notifications"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipTxt}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    marginLeft: 20,
    marginBottom: 4,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  bellWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 8,
    position: "relative",
  },
  bellCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: colors.bg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  benefits: { width: "100%", gap: 10 },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  benefitSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bottom: { padding: 20, paddingBottom: 8, gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: 16,
    ...shadow.card,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
