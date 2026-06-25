import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { saveCountryData } from "../../lib/onboarding";

const COUNTRIES = [
  {
    name: "India",
    currency: "INR",
    symbol: "₹",
    timezone: "Asia/Kolkata",
    flag: "🇮🇳",
    popular: true,
  },
  {
    name: "United States",
    currency: "USD",
    symbol: "$",
    timezone: "America/New_York",
    flag: "🇺🇸",
    popular: true,
  },
  {
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    timezone: "Europe/London",
    flag: "🇬🇧",
    popular: true,
  },
  {
    name: "UAE",
    currency: "AED",
    symbol: "د.إ",
    timezone: "Asia/Dubai",
    flag: "🇦🇪",
    popular: true,
  },
  {
    name: "Canada",
    currency: "CAD",
    symbol: "C$",
    timezone: "America/Toronto",
    flag: "🇨🇦",
  },
  {
    name: "Australia",
    currency: "AUD",
    symbol: "A$",
    timezone: "Australia/Sydney",
    flag: "🇦🇺",
  },
  {
    name: "Singapore",
    currency: "SGD",
    symbol: "S$",
    timezone: "Asia/Singapore",
    flag: "🇸🇬",
  },
  {
    name: "Malaysia",
    currency: "MYR",
    symbol: "RM",
    timezone: "Asia/Kuala_Lumpur",
    flag: "🇲🇾",
  },
  {
    name: "Nepal",
    currency: "NPR",
    symbol: "रू",
    timezone: "Asia/Kathmandu",
    flag: "🇳🇵",
  },
  {
    name: "Sri Lanka",
    currency: "LKR",
    symbol: "Rs",
    timezone: "Asia/Colombo",
    flag: "🇱🇰",
  },
  {
    name: "Qatar",
    currency: "QAR",
    symbol: "﷼",
    timezone: "Asia/Qatar",
    flag: "🇶🇦",
  },
  {
    name: "Kuwait",
    currency: "KWD",
    symbol: "د.ك",
    timezone: "Asia/Kuwait",
    flag: "🇰🇼",
  },
  {
    name: "Bahrain",
    currency: "BHD",
    symbol: "BD",
    timezone: "Asia/Bahrain",
    flag: "🇧🇭",
  },
  {
    name: "Oman",
    currency: "OMR",
    symbol: "﷼",
    timezone: "Asia/Muscat",
    flag: "🇴🇲",
  },
  {
    name: "Germany",
    currency: "EUR",
    symbol: "€",
    timezone: "Europe/Berlin",
    flag: "🇩🇪",
  },
  {
    name: "France",
    currency: "EUR",
    symbol: "€",
    timezone: "Europe/Paris",
    flag: "🇫🇷",
  },
  {
    name: "Netherlands",
    currency: "EUR",
    symbol: "€",
    timezone: "Europe/Amsterdam",
    flag: "🇳🇱",
  },
  {
    name: "Switzerland",
    currency: "CHF",
    symbol: "Fr",
    timezone: "Europe/Zurich",
    flag: "🇨🇭",
  },
  {
    name: "Italy",
    currency: "EUR",
    symbol: "€",
    timezone: "Europe/Rome",
    flag: "🇮🇹",
  },
  {
    name: "Japan",
    currency: "JPY",
    symbol: "¥",
    timezone: "Asia/Tokyo",
    flag: "🇯🇵",
  },
  {
    name: "Thailand",
    currency: "THB",
    symbol: "฿",
    timezone: "Asia/Bangkok",
    flag: "🇹🇭",
  },
  {
    name: "Indonesia",
    currency: "IDR",
    symbol: "Rp",
    timezone: "Asia/Jakarta",
    flag: "🇮🇩",
  },
  {
    name: "Philippines",
    currency: "PHP",
    symbol: "₱",
    timezone: "Asia/Manila",
    flag: "🇵🇭",
  },
  {
    name: "New Zealand",
    currency: "NZD",
    symbol: "NZ$",
    timezone: "Pacific/Auckland",
    flag: "🇳🇿",
  },
  {
    name: "South Africa",
    currency: "ZAR",
    symbol: "R",
    timezone: "Africa/Johannesburg",
    flag: "🇿🇦",
  },
  {
    name: "Kenya",
    currency: "KES",
    symbol: "KSh",
    timezone: "Africa/Nairobi",
    flag: "🇰🇪",
  },
  {
    name: "Bangladesh",
    currency: "BDT",
    symbol: "৳",
    timezone: "Asia/Dhaka",
    flag: "🇧🇩",
  },
  {
    name: "Bhutan",
    currency: "BTN",
    symbol: "Nu",
    timezone: "Asia/Thimphu",
    flag: "🇧🇹",
  },
  {
    name: "Maldives",
    currency: "MVR",
    symbol: "Rf",
    timezone: "Indian/Maldives",
    flag: "🇲🇻",
  },
  {
    name: "Israel",
    currency: "ILS",
    symbol: "₪",
    timezone: "Asia/Jerusalem",
    flag: "🇮🇱",
  },
];

const STEP = 1;
const TOTAL = 10;

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
            backgroundColor: i < step ? colors.primary : colors.borderSubtle,
          }}
        />
      ))}
    </View>
  );
}

export default function CountryScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState(COUNTRIES[0]);

  const handleContinue = async () => {
    await saveCountryData({
      country: selected.name,
      currency: selected.currency,
      symbol: selected.symbol,
      timezone: selected.timezone,
    });
    router.push("/onboarding/language");
  };

  const popular = COUNTRIES.filter((c) => c.popular);
  const others = COUNTRIES.filter((c) => !c.popular);

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={s.header}>
        <View style={s.iconCircle}>
          <Ionicons name="earth-outline" size={36} color={colors.primary} />
        </View>
        <Text style={s.title}>Your Region</Text>
        <Text style={s.sub}>
          We'll show prices and content relevant to your location
        </Text>
      </View>

      {/* Selected preview */}
      <View style={s.selectedPreview}>
        <Text style={s.previewFlag}>{selected.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.previewCountry}>{selected.name}</Text>
          <Text style={s.previewCurrency}>
            {selected.symbol} {selected.currency} · {selected.timezone}
          </Text>
        </View>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
      >
        {popular.length > 0 && <Text style={s.sectionLabel}>Popular</Text>}
        {[...popular, ...others].map((item) => {
          const active = selected.name === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[s.item, active && s.itemActive]}
              onPress={() => setSelected(item)}
              activeOpacity={0.7}
            >
              <Text style={s.flag}>{item.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.itemName, active && s.itemNameActive]}>
                  {item.name}
                </Text>
                <Text style={s.itemSub}>
                  {item.symbol} {item.currency}
                </Text>
              </View>
              {active && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
  header: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 16 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  selectedPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EEF9EE",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.success + "40",
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  previewFlag: { fontSize: 28 },
  previewCountry: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  previewCurrency: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  list: { flex: 1 },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: 12,
    marginBottom: 8,
  },
  itemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  flag: { fontSize: 24 },
  itemName: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.textPrimary,
  },
  itemNameActive: { color: colors.primary },
  itemSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
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
