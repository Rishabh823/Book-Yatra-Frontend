import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { useLang } from "../../lib/LanguageContext";

const LANGUAGES = [
  { code: "EN", name: "English", native: "English", icon: "🌐" },
  { code: "HI", name: "Hindi", native: "हिंदी", icon: "🇮🇳" },
  { code: "PA", name: "Punjabi", native: "ਪੰਜਾਬੀ", icon: "🇮🇳" },
  { code: "GU", name: "Gujarati", native: "ગુજરાતી", icon: "🇮🇳" },
  { code: "MR", name: "Marathi", native: "मराठी", icon: "🇮🇳" },
  { code: "BN", name: "Bengali", native: "বাংলা", icon: "🇮🇳" },
  { code: "TA", name: "Tamil", native: "தமிழ்", icon: "🇮🇳" },
  { code: "TE", name: "Telugu", native: "తెలుగు", icon: "🇮🇳" },
];

const STEP = 1;
const TOTAL = 11;

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

export default function LanguageScreen() {
  const router = useRouter();
  const { lang, setLanguage } = useLang();
  const [selected, setSelected] = useState("EN");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (lang) setSelected(lang);
  }, [lang]);

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.native.toLowerCase().includes(search.toLowerCase()),
  );

  const handleContinue = async () => {
    if (setLanguage) setLanguage(selected);
    else await AsyncStorage.setItem("app_language", selected);
    router.push("/onboarding/country");
  };

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <StepBar step={STEP} total={TOTAL} />

      <View style={s.header}>
        <View style={s.iconCircle}>
          <Ionicons name="globe-outline" size={36} color={colors.primary} />
        </View>
        <Text style={s.title}>Choose Your Language</Text>
        <Text style={s.sub}>
          Select your preferred language for the best experience
        </Text>
      </View>

      <View style={s.searchWrap}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textSecondary}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Search language..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
      >
        {filtered.map((item) => {
          const active = selected === item.code;
          return (
            <TouchableOpacity
              key={item.code}
              style={[s.langItem, active && s.langItemActive]}
              onPress={() => setSelected(item.code)}
              activeOpacity={0.7}
            >
              <Text style={s.langIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.langNative, active && s.langNativeActive]}>
                  {item.native}
                </Text>
                <Text style={[s.langName, active && s.langNameActive]}>
                  {item.name}
                </Text>
              </View>
              <View style={[s.radio, active && s.radioActive]}>
                {active && <View style={s.radioDot} />}
              </View>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    ...shadow.soft,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
    padding: 0,
  },
  list: { flex: 1 },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 8,
  },
  langItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  langIcon: { fontSize: 22 },
  langNative: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.textPrimary,
  },
  langNativeActive: { color: colors.primary },
  langName: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  langNameActive: { color: colors.secondary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
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
