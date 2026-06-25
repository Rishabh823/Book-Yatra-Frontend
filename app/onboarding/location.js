import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";

const STEP = 4;
const TOTAL = 10;

const BENEFITS = [
  {
    icon: "compass-outline",
    title: "Nearby Tours",
    sub: "Discover tours departing from your city",
  },
  {
    icon: "bus-outline",
    title: "Pickup Points",
    sub: "Find boarding points closest to you",
  },
  {
    icon: "navigate-outline",
    title: "Live Tracking",
    sub: "Track your bus journey in real time",
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

export default function LocationScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        showToast("You can enable location access later in your phone settings.", "info");
      }
    } catch {}
    setLoading(false);
    router.push("/onboarding/notifications");
  };

  const handleSkip = () => {
    router.push("/onboarding/notifications");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={s.center}>
        {/* Map illustration */}
        <View style={s.mapWrap}>
          <View style={s.mapCircle}>
            <Ionicons name="location" size={52} color={colors.primary} />
          </View>
          <View style={[s.pulse, { width: 120, height: 120, opacity: 0.2 }]} />
          <View style={[s.pulse, { width: 160, height: 160, opacity: 0.1 }]} />
        </View>

        <Text style={s.title}>Enable Location</Text>
        <Text style={s.sub}>
          Allow TripKart to access your location for a personalized experience
        </Text>

        {/* Benefits */}
        <View style={s.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={s.benefit}>
              <View style={s.benefitIcon}>
                <Ionicons name={b.icon} size={20} color={colors.primary} />
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
          onPress={handleAllow}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="location-outline" size={18} color="#fff" />
          <Text style={s.btnText}>
            {loading ? "Requesting..." : "Allow Location"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipTxt}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: {
    marginLeft: 20,
    marginBottom: 8,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", paddingHorizontal: 24 },
  mapWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    marginTop: 16,
  },
  mapCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  pulse: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: colors.primary,
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
    marginBottom: 28,
  },
  benefits: { width: "100%", gap: 12 },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  benefitSub: {
    fontFamily: fonts.body,
    fontSize: 12,
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
