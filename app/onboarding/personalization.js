import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { savePreferences } from "../../lib/onboarding";

const STEP = 6;
const TOTAL = 11;

const INTERESTS = [
  {
    key: "religious",
    label: "Religious",
    icon: "flower-outline",
    color: "#D97706",
  },
  {
    key: "adventure",
    label: "Adventure",
    icon: "trail-sign-outline",
    color: "#16A34A",
  },
  { key: "family", label: "Family", icon: "people-outline", color: "#2563EB" },
  { key: "beach", label: "Beach", icon: "sunny-outline", color: "#0891B2" },
  {
    key: "international",
    label: "International",
    icon: "globe-outline",
    color: "#7C3AED",
  },
  {
    key: "heritage",
    label: "Heritage",
    icon: "business-outline",
    color: "#B45309",
  },
  {
    key: "hills",
    label: "Hills",
    icon: "trending-up-outline",
    color: "#059669",
  },
  {
    key: "spiritual",
    label: "Spiritual",
    icon: "sparkles-outline",
    color: "#DC2626",
  },
];

const BUDGETS = [
  { key: "budget", label: "Budget", sub: "Under ₹5,000" },
  { key: "standard", label: "Standard", sub: "₹5,000 – ₹15,000" },
  { key: "premium", label: "Premium", sub: "₹15,000 – ₹50,000" },
  { key: "luxury", label: "Luxury", sub: "Above ₹50,000" },
];

const DESTINATIONS = [
  "Kedarnath",
  "Varanasi",
  "Haridwar",
  "Vrindavan",
  "Tirupati",
  "Shirdi",
  "Mathura",
  "Ayodhya",
  "Puri",
  "Dwarka",
  "Amritsar",
  "Rishikesh",
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

export default function PersonalizationScreen() {
  const router = useRouter();
  const [interests, setInterests] = useState([]);
  const [budget, setBudget] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (key) => {
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };
  const toggleDestination = (d) => {
    setDestinations((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  };

  const handleContinue = async () => {
    setSaving(true);
    await savePreferences({ interests, budget, destinations });
    setSaving(false);
    router.push("/onboarding/security");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/onboarding/security")}>
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        <Text style={s.title}>Personalize Your Experience</Text>
        <Text style={s.sub}>Help us recommend tours you'll love</Text>

        {/* Travel Interests */}
        <Text style={s.sectionLabel}>Travel Interests</Text>
        <View style={s.interestsGrid}>
          {INTERESTS.map((item) => {
            const active = interests.includes(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  s.interestChip,
                  active && {
                    borderColor: item.color,
                    backgroundColor: item.color + "12",
                  },
                ]}
                onPress={() => toggleInterest(item.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={active ? item.color : colors.textSecondary}
                />
                <Text
                  style={[
                    s.interestLabel,
                    active && {
                      color: item.color,
                      fontFamily: fonts.bodySemiBold,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {active && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={item.color}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Budget */}
        <Text style={s.sectionLabel}>Preferred Budget</Text>
        <View style={s.budgets}>
          {BUDGETS.map((b) => {
            const active = budget === b.key;
            return (
              <TouchableOpacity
                key={b.key}
                style={[s.budgetItem, active && s.budgetItemActive]}
                onPress={() => setBudget(b.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.budgetLabel, active && s.budgetLabelActive]}>
                  {b.label}
                </Text>
                <Text
                  style={[s.budgetSub, active && { color: colors.primary }]}
                >
                  {b.sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Destinations */}
        <Text style={s.sectionLabel}>Favourite Destinations</Text>
        <View style={s.destWrap}>
          {DESTINATIONS.map((d) => {
            const active = destinations.includes(d);
            return (
              <TouchableOpacity
                key={d}
                style={[s.destChip, active && s.destChipActive]}
                onPress={() => toggleDestination(d)}
                activeOpacity={0.7}
              >
                <Text style={[s.destLabel, active && s.destLabelActive]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={s.btnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  skipTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  interestLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  budgets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  budgetItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: 12,
    alignItems: "center",
  },
  budgetItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  budgetLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  budgetLabelActive: { color: colors.primary },
  budgetSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textSecondary,
  },
  destWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  destChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
  },
  destChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  destLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  destLabelActive: { color: colors.primary, fontFamily: fonts.bodySemiBold },
  bottom: { padding: 20, paddingBottom: 8 },
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
});
