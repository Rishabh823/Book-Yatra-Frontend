import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radius, shadow } from "../lib/theme";
import { donations as donationsApi, auth as authApi } from "../lib/api";
import RazorpayCheckout from "../components/RazorpayCheckout";

const CATEGORIES = [
  {
    id: "temple",
    label: "Temple Seva",
    icon: "flower",
    color: "#D95D39",
    gradient: ["#D95D39", "#B94929"],
    description: "Support temple maintenance, rituals & festivals",
  },
  {
    id: "medical",
    label: "Medical Aid",
    icon: "medkit",
    color: "#EF4444",
    gradient: ["#EF4444", "#B91C1C"],
    description: "Help families with medical emergencies",
  },
  {
    id: "marriage",
    label: "Vivah Sahayata",
    icon: "heart",
    color: "#EC4899",
    gradient: ["#EC4899", "#BE185D"],
    description: "Assist underprivileged families for weddings",
  },
  {
    id: "education",
    label: "Shiksha Daan",
    icon: "school",
    color: "#0284C7",
    gradient: ["#0284C7", "#0369A1"],
    description: "Fund scholarships & school supplies for children",
  },
  {
    id: "festival",
    label: "Festival Utsav",
    icon: "sparkles",
    color: "#F59E0B",
    gradient: ["#F59E0B", "#D97706"],
    description: "Celebrate festivals with the community",
  },
  {
    id: "general",
    label: "Samagra Daan",
    icon: "hand-left",
    color: "#7C3AED",
    gradient: ["#7C3AED", "#5B21B6"],
    description: "General donation for community welfare",
  },
];

const PRESET_AMOUNTS = [51, 101, 251, 501, 1001, 2101];

const STEP_CATEGORY = 0;
const STEP_AMOUNT = 1;
const STEP_SUCCESS = 2;

export default function DonatePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(STEP_CATEGORY);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkout, setCheckout] = useState(null);
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [message, setMessage] = useState("");
  const [completedDonation, setCompletedDonation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const profile = await authApi.getProfile();
        const u = profile?.data || profile?.user || profile;
        if (u?.name) setDonorName(u.name);
        if (u?.email) setDonorEmail(u.email);
        if (u?.phone) setDonorPhone(u.phone);
      } catch {}
    })();
  }, []);

  const finalAmount = selectedPreset || parseInt(customAmount, 10) || 0;
  const category = CATEGORIES.find((c) => c.id === selectedCategory);

  const handleDonate = async () => {
    if (finalAmount < 1) {
      Alert.alert("Enter Amount", "Please select or enter a valid amount.");
      return;
    }
    if (!donorName.trim()) {
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }
    setSubmitting(true);
    try {
      const orderRes = await donationsApi.createOrder({
        amount: finalAmount,
        donationType: selectedCategory,
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        donorPhone: donorPhone.trim(),
        message: message.trim(),
      });
      const order = orderRes?.data || orderRes;
      if (order?.orderId && order?.key) {
        setCheckout({
          key: order.key,
          orderId: order.orderId,
          amount: order.amount ?? finalAmount * 100,
          currency: order.currency || "INR",
          name: "Book Yatra — Seva Daan",
          description: `${category?.label || "Donation"} · ₹${finalAmount}`,
          prefill: { name: donorName, email: donorEmail, contact: donorPhone },
        });
      } else {
        setCompletedDonation({ amount: finalAmount, type: selectedCategory });
        setStep(STEP_SUCCESS);
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Could not initiate payment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onPaymentSuccess = async ({ paymentId, orderId, signature }) => {
    setCheckout(null);
    setSubmitting(true);
    try {
      await donationsApi.submitRazorpay({
        paymentId,
        orderId,
        signature,
        donationType: selectedCategory,
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        donorPhone: donorPhone.trim(),
        message: message.trim(),
        amount: finalAmount,
      });
      setCompletedDonation({ amount: finalAmount, type: selectedCategory });
      setStep(STEP_SUCCESS);
    } catch {
      Alert.alert(
        "Payment Received",
        "Payment was received but confirmation failed. Our team will verify and contact you.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === STEP_SUCCESS) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient
          colors={["#1E0A0A", "#5C1615", "#8B1F1E"]}
          style={[s.successHero, { paddingTop: insets.top + 20 }]}
        >
          <View style={s.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
          </View>
          <Text style={s.successTitle}>Daan Sweekar!</Text>
          <Text style={s.successSub}>
            Your donation of{" "}
            <Text style={{ color: "#FFD700", fontFamily: fonts.bodyBold }}>
              ₹{completedDonation?.amount?.toLocaleString("en-IN")}
            </Text>{" "}
            has been received.
          </Text>
          <Text style={s.successMeta}>
            {CATEGORIES.find((c) => c.id === completedDonation?.type)?.label || "General"}{" "}
            · Shyam Sawariya Parivar
          </Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: insets.bottom + 32 }}>
          <View style={[s.receiptCard, shadow.card]}>
            <Ionicons name="receipt-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.receiptTitle}>Donation Receipt</Text>
              <Text style={s.receiptMeta}>
                A receipt has been sent to {donorEmail || "your registered email"}.
              </Text>
            </View>
          </View>
          <View style={s.blessingsCard}>
            <Text style={s.blessingsText}>
              🙏 "Jo deta hai, use bahut milta hai."{"\n"}May Shyam Baba bless you and your
              family with peace, health and prosperity.
            </Text>
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace("/(tabs)")}>
            <Text style={s.primaryBtnTxt}>Return Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.outlineBtn}
            onPress={() => {
              setStep(STEP_CATEGORY);
              setSelectedCategory(null);
              setSelectedPreset(null);
              setCustomAmount("");
              setMessage("");
              setCompletedDonation(null);
            }}
          >
            <Text style={s.outlineBtnTxt}>Donate Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Category selection ─────────────────────────────────────────────────────
  if (step === STEP_CATEGORY) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <LinearGradient
          colors={["#1E0A0A", "#5C1615"]}
          style={[s.hero, { paddingTop: insets.top + 12 }]}
        >
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text style={s.heroTitle}>Seva Daan</Text>
          <Text style={s.heroSub}>Every donation is an act of devotion. Choose your cause.</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}>
          <Text style={s.sectionLabel}>SELECT CAUSE</Text>
          <View style={s.catGrid}>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catCard, active && s.catCardActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                  activeOpacity={0.8}
                >
                  {active && (
                    <LinearGradient
                      colors={cat.gradient}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <View style={[s.catIconBox, { backgroundColor: active ? "rgba(255,255,255,0.2)" : cat.color + "18" }]}>
                    <Ionicons name={cat.icon} size={22} color={active ? "#fff" : cat.color} />
                  </View>
                  <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                  <Text style={[s.catDesc, active && s.catDescActive]}>{cat.description}</Text>
                  {active && (
                    <View style={s.catCheck}>
                      <Ionicons name="checkmark-circle" size={18} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, !selectedCategory && s.btnDisabled]}
            onPress={() => selectedCategory && setStep(STEP_AMOUNT)}
            disabled={!selectedCategory}
          >
            <Text style={s.primaryBtnTxt}>
              {selectedCategory ? `Continue to Amount` : "Select a Cause"}
            </Text>
            {selectedCategory && <Ionicons name="arrow-forward" size={18} color="white" />}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Amount & details ───────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <RazorpayCheckout
        visible={!!checkout}
        options={checkout}
        onSuccess={onPaymentSuccess}
        onClose={() => setCheckout(null)}
      />

      <LinearGradient
        colors={category?.gradient || ["#D95D39", "#B94929"]}
        style={[s.hero, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(STEP_CATEGORY)}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={s.heroIconBox}>
          <Ionicons name={category?.icon} size={28} color="rgba(255,255,255,0.9)" />
        </View>
        <Text style={s.heroTitle}>{category?.label}</Text>
        <Text style={s.heroSub}>{category?.description}</Text>
      </LinearGradient>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Amount presets */}
        <View>
          <Text style={s.sectionLabel}>SELECT AMOUNT</Text>
          <View style={s.presetsRow}>
            {PRESET_AMOUNTS.map((amt) => {
              const active = selectedPreset === amt && !customAmount;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[s.presetChip, active && s.presetChipActive]}
                  onPress={() => { setSelectedPreset(amt); setCustomAmount(""); }}
                >
                  <Text style={[s.presetTxt, active && s.presetTxtActive]}>
                    ₹{amt.toLocaleString("en-IN")}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[s.amtInputRow, { marginTop: 12 }]}>
            <Text style={s.rupeeSign}>₹</Text>
            <TextInput
              style={s.amtInput}
              placeholder="Enter custom amount"
              placeholderTextColor={colors.textDisabled}
              keyboardType="numeric"
              value={customAmount}
              onChangeText={(v) => { setCustomAmount(v.replace(/[^0-9]/g, "")); setSelectedPreset(null); }}
            />
          </View>
          {finalAmount > 0 && (
            <Text style={s.amtPreview}>
              You are donating ₹{finalAmount.toLocaleString("en-IN")}
            </Text>
          )}
        </View>

        {/* Donor details */}
        <View>
          <Text style={s.sectionLabel}>YOUR DETAILS</Text>
          <View style={s.formCard}>
            {[
              { icon: "person-outline", placeholder: "Your name *", value: donorName, setter: setDonorName, kbType: "default" },
              { icon: "mail-outline", placeholder: "Email (for receipt)", value: donorEmail, setter: setDonorEmail, kbType: "email-address", autoCapOff: true },
              { icon: "call-outline", placeholder: "Phone number", value: donorPhone, setter: setDonorPhone, kbType: "phone-pad" },
            ].map((field, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.formField}>
                  <Ionicons name={field.icon} size={16} color={colors.textSecondary} />
                  <TextInput
                    style={s.formInput}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.textDisabled}
                    keyboardType={field.kbType}
                    autoCapitalize={field.autoCapOff ? "none" : "words"}
                    value={field.value}
                    onChangeText={field.setter}
                  />
                </View>
              </React.Fragment>
            ))}
            <View style={s.divider} />
            <View style={[s.formField, { alignItems: "flex-start" }]}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} style={{ marginTop: 3 }} />
              <TextInput
                style={[s.formInput, { height: 72, textAlignVertical: "top" }]}
                placeholder="Message / Sankalp (optional)"
                placeholderTextColor={colors.textDisabled}
                multiline
                value={message}
                onChangeText={setMessage}
              />
            </View>
          </View>
        </View>

        {/* Trust badges */}
        <View style={s.trustRow}>
          {[
            { icon: "shield-checkmark", text: "Razorpay Secured" },
            { icon: "document-text", text: "80G Receipt" },
            { icon: "lock-closed", text: "100% Safe" },
          ].map((b, i) => (
            <View key={i} style={s.trustBadge}>
              <Ionicons name={b.icon} size={14} color={colors.primary} />
              <Text style={s.trustTxt}>{b.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, (submitting || finalAmount < 1) && s.btnDisabled]}
          onPress={handleDonate}
          disabled={submitting || finalAmount < 1}
        >
          {submitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="heart" size={18} color="white" />
              <Text style={s.primaryBtnTxt}>
                Donate ₹{finalAmount > 0 ? finalAmount.toLocaleString("en-IN") : "—"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Donations are used for community welfare activities of Shyam Sawariya Parivar.
          80G tax benefits may apply where applicable.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28, gap: 6 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  heroIconBox: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  heroTitle: { fontFamily: fonts.heading, fontSize: 26, color: "white", letterSpacing: 0.3 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 20 },

  sectionLabel: {
    fontFamily: fonts.bodyBold, fontSize: 11,
    color: colors.textSecondary, letterSpacing: 1.2, marginBottom: 10,
  },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    width: "47%", backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 14, gap: 8, borderWidth: 1.5, borderColor: colors.borderSubtle,
    overflow: "hidden", ...shadow.soft,
  },
  catCardActive: { borderColor: "transparent" },
  catIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  catLabelActive: { color: "white" },
  catDesc: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, lineHeight: 15 },
  catDescActive: { color: "rgba(255,255,255,0.8)" },
  catCheck: { position: "absolute", top: 10, right: 10 },

  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.borderSubtle, backgroundColor: colors.surface,
  },
  presetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary },
  presetTxtActive: { color: "white" },

  amtInputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.borderSubtle, paddingHorizontal: 14,
  },
  rupeeSign: { fontFamily: fonts.heading, fontSize: 20, color: colors.textSecondary, marginRight: 6 },
  amtInput: {
    flex: 1, fontFamily: fonts.body, fontSize: 18, color: colors.textPrimary,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  amtPreview: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.primary, marginTop: 6, textAlign: "center" },

  formCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, overflow: "hidden", ...shadow.soft,
  },
  formField: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 4 },
  formInput: {
    flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 40 },

  trustRow: { flexDirection: "row", justifyContent: "space-around" },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: 8,
  },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },
  btnDisabled: { opacity: 0.5 },
  outlineBtn: {
    borderRadius: radius.lg, paddingVertical: 14,
    alignItems: "center", borderWidth: 1.5, borderColor: colors.primary,
  },
  outlineBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },

  disclaimer: {
    fontFamily: fonts.body, fontSize: 11,
    color: colors.textSecondary, textAlign: "center", lineHeight: 17,
  },

  successHero: { padding: 32, paddingBottom: 36, alignItems: "center", gap: 10 },
  successIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  successTitle: { fontFamily: fonts.heading, fontSize: 32, color: "white", letterSpacing: 0.5 },
  successSub: { fontFamily: fonts.body, fontSize: 15, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 22 },
  successMeta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "rgba(255,255,255,0.6)" },
  receiptCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
  },
  receiptTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary },
  receiptMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  blessingsCard: {
    backgroundColor: "#FFF7ED", borderRadius: radius.lg,
    padding: 20, borderLeftWidth: 3, borderLeftColor: "#D95D39",
  },
  blessingsText: {
    fontFamily: fonts.body, fontSize: 13, color: "#7C2D12",
    lineHeight: 22, textAlign: "center", fontStyle: "italic",
  },
});
