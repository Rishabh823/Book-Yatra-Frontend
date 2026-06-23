import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Toast from "../components/Toast";
import { useToast } from "../lib/hooks/useToast";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fonts } from "../lib/theme";
import { feedback as feedbackApi, auth as authApi } from "../lib/api";
import { useLang } from "../lib/LanguageContext";

const CATEGORIES = [
  { id: "service-quality", label: "Service Quality" },
  { id: "bus-booking", label: "Bus Booking" },
  { id: "website-experience", label: "App Experience" },
  { id: "event-organization", label: "Event Org." },
  { id: "complaint", label: "Complaint" },
];

export default function Feedback() {
  const router = useRouter();
  const { t } = useLang();
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "service-quality",
    subject: "",
    message: "",
    rating: 5,
  });
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // ── Auth check + pre-fill ──────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const ok = await authApi.isAuthenticated();
      setAuthed(ok);
      setAuthChecked(true);
      if (ok) {
        try {
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            const u = JSON.parse(stored);
            setForm((f) => ({
              ...f,
              name: u.name || f.name,
              email: u.email || f.email,
              phone: u.phone || f.phone,
            }));
          }
        } catch {}
      }
    };
    init();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.email || !form.message) {
      showToast("Name, email and message are required.");
      return;
    }
    setLoading(true);
    try {
      await feedbackApi.create(form);
      showToast("Feedback submitted. Thank you!", "success");
      setTimeout(() => router.back(), 1800);
    } catch (e) {
      showToast(e.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (authChecked && !authed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
        <View style={s.head}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.title}>Share Feedback</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.grayBand} />
        <View style={s.gateWrap}>
          <View style={s.gateCard}>
            <View style={s.gateIcon}>
              <Ionicons name="chatbubbles-outline" size={36} color="#D95D39" />
            </View>
            <Text style={s.gateTitle}>Sign in to share feedback</Text>
            <Text style={s.gateSub}>
              Your feedback helps us improve. Please sign in to continue.
            </Text>
            <TouchableOpacity
              style={s.gateBtn}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={s.gateBtnTxt}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/auth/register")}
              style={{ marginTop: 14 }}
            >
              <Text style={s.gateLink}>Don't have an account? Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.head}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.iconBtn}
            testID="feedback-back"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={s.title}>Share Feedback</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.grayBand} />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Rating */}
          <Text style={s.sectionLabel}>YOUR RATING</Text>
          <View style={s.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => set("rating", n)}
                testID={`star-${n}`}
              >
                <Ionicons
                  name="star"
                  size={36}
                  color={n <= form.rating ? "#D97706" : "#E5E7EB"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Category */}
          <Text style={[s.sectionLabel, { marginTop: 20 }]}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.catChip, form.category === c.id && s.catChipActive]}
                  onPress={() => set("category", c.id)}
                  testID={`cat-${c.id}`}
                >
                  <Text
                    style={[
                      s.catText,
                      form.category === c.id && { color: "#fff" },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Fields */}
          {[
            { k: "name", label: "Full Name *", icon: "person-outline" },
            {
              k: "email",
              label: "Email *",
              icon: "mail-outline",
              kb: "email-address",
            },
            {
              k: "phone",
              label: "Phone (optional)",
              icon: "call-outline",
              kb: "phone-pad",
            },
            {
              k: "subject",
              label: "Subject (optional)",
              icon: "document-text-outline",
            },
          ].map((f) => (
            <View key={f.k} style={s.field}>
              <Text style={s.fieldLabel}>{f.label}</Text>
              <View style={s.inputWrap}>
                <Ionicons name={f.icon} size={18} color="#6B7280" />
                <TextInput
                  testID={`fb-${f.k}`}
                  style={s.input}
                  placeholder={f.label.replace(" *", "")}
                  placeholderTextColor="#9CA3AF"
                  keyboardType={f.kb || "default"}
                  value={form[f.k]}
                  onChangeText={(v) => set(f.k, v)}
                />
              </View>
            </View>
          ))}

          <View style={s.field}>
            <Text style={s.fieldLabel}>Your Message *</Text>
            <TextInput
              testID="fb-message"
              style={s.textarea}
              placeholder="Share your experience with us..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={form.message}
              onChangeText={(v) => set("message", v)}
            />
          </View>

          <TouchableOpacity
            style={s.cta}
            onPress={submit}
            disabled={loading}
            testID="feedback-submit"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                <Text style={s.ctaText}>Submit Feedback</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.note}>{t.feedbackNote}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F4",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.heading,
    fontSize: 20,
    color: "#111827",
  },
  grayBand: { height: 10, backgroundColor: "#F2F2F2" },

  // ── Auth gate ──────────────────────────────────
  gateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  gateCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  gateIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#FEE8E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  gateTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  gateSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  gateBtn: {
    height: 52,
    paddingHorizontal: 40,
    backgroundColor: "#D95D39",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  gateBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
  gateLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#D95D39" },

  // ── Form ──────────────────────────────────────
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#9CA3AF",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  stars: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
    justifyContent: "center",
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: "#F2F0ED",
  },
  catChipActive: {
    backgroundColor: "#D95D39",
  },
  catText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#111827",
  },

  field: { marginBottom: 16 },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#111827",
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    height: 56,
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#111827",
    height: 56,
  },
  textarea: {
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#111827",
    minHeight: 120,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#D95D39",
    marginTop: 8,
  },
  ctaText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 15 },
  note: {
    textAlign: "center",
    marginTop: 20,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#6B7280",
  },
});
