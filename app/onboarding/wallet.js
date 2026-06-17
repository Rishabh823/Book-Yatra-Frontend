import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { markOnboardingDone } from "../../lib/onboarding";

const STEP = 10;
const TOTAL = 11;

const FEATURES = [
  {
    icon: "wallet-outline",
    color: "#7C3AED",
    title: "TripKart Wallet",
    sub: "Store money and pay instantly for any booking",
  },
  {
    icon: "gift-outline",
    color: "#D97706",
    title: "Rewards & Cashback",
    sub: "Earn points on every booking, redeem for discounts",
  },
  {
    icon: "shield-checkmark-outline",
    color: "#16A34A",
    title: "Secure Payments",
    sub: "Bank-level encryption for all transactions",
  },
  {
    icon: "refresh-outline",
    color: "#2563EB",
    title: "Easy Refunds",
    sub: "Instant wallet refunds on cancellations",
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

export default function WalletScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    await markOnboardingDone();
    router.replace("/(tabs)");
  };

  const handleAddMoney = async () => {
    setLoading(true);
    await markOnboardingDone();
    router.replace("/wallet/add-money");
  };

  const handleSkip = finish;

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      {/* Wallet card illustration */}
      <View style={s.cardWrap}>
        <LinearGradient colors={["#7C3AED", "#5B21B6"]} style={s.walletCard}>
          <View style={s.cardTop}>
            <Ionicons name="wallet" size={28} color="#fff" />
            <Text style={s.cardAppName}>TripKart Pay</Text>
          </View>
          <Text style={s.cardBalance}>₹0.00</Text>
          <Text style={s.cardSub}>Your wallet balance</Text>
          <View style={s.cardDots}>
            {[...Array(3)].map((_, i) => (
              <View key={i} style={s.cardDot} />
            ))}
          </View>
        </LinearGradient>
      </View>

      <View style={s.content}>
        <Text style={s.title}>Your Wallet Awaits</Text>
        <Text style={s.sub}>
          Pay for bookings, earn rewards, and get instant refunds — all in one
          place
        </Text>

        <View style={s.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={s.feature}>
              <View
                style={[s.featureIcon, { backgroundColor: f.color + "15" }]}
              >
                <Ionicons name={f.icon} size={18} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureSub}>{f.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.addBtn}
          onPress={handleAddMoney}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={s.addBtnText}>
            {loading ? "Setting up..." : "Add Money Now"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipBtn} onPress={handleSkip}>
          <Text style={s.skipTxt}>Skip for Later</Text>
          <Text style={s.skipArrow}> →</Text>
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
  cardWrap: { paddingHorizontal: 24, marginBottom: 20 },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 130,
    justifyContent: "space-between",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardAppName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  cardBalance: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: "#fff",
    marginTop: 8,
  },
  cardSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  cardDots: { flexDirection: "row", gap: 4, marginTop: 8 },
  cardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  content: { flex: 1, paddingHorizontal: 24 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  features: { gap: 10 },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  featureSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bottom: { padding: 20, paddingBottom: 8, gap: 10 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    borderRadius: radius.xl,
    paddingVertical: 16,
    ...shadow.card,
  },
  addBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  skipArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.primary,
  },
});
