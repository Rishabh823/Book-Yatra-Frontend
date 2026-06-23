import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import Toast from "../components/Toast";
import { useToast } from "../lib/hooks/useToast";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "../lib/theme";
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
  const { toast, showToast, hideToast } = useToast();

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
      showToast("Please select or enter a valid amount.", "error");
      return;
    }
    if (!donorName.trim()) {
      showToast("Please enter your name.", "error");
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
          name: "TripKart — Seva Daan",
          description: `${category?.label || "Donation"} · ₹${finalAmount}`,
          prefill: { name: donorName, email: donorEmail, contact: donorPhone },
        });
      } else {
        setCompletedDonation({ amount: finalAmount, type: selectedCategory });
        setStep(STEP_SUCCESS);
      }
    } catch (e) {
      showToast(e.message || "Could not initiate payment. Try again.", "error");
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
      showToast("Payment received! Our team will verify and contact you shortly.", "info");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (step === STEP_SUCCESS) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: insets.bottom + 32 }}>
          {/* Success hero */}
          <View style={s.successHero}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark" size={40} color="#22C55E" />
            </View>
            <Text style={s.successTitle}>Daan Sweekar!</Text>
            <Text style={s.successSub}>
              Your donation of{" "}
              <Text style={{ color: "#D95D39", fontFamily: fonts.bodyBold }}>
                ₹{completedDonation?.amount?.toLocaleString("en-IN")}
              </Text>{" "}
              has been received.
            </Text>
            <Text style={s.successMeta}>
              {CATEGORIES.find((c) => c.id === completedDonation?.type)?.label || "General"}{" "}
              · Shyam Sawariya Parivar
            </Text>
          </View>

          {/* Receipt card */}
          <View style={s.receiptCard}>
            <Ionicons name="receipt-outline" size={22} color="#D95D39" />
            <View style={{ flex: 1 }}>
              <Text style={s.receiptTitle}>Donation Receipt</Text>
              <Text style={s.receiptMeta}>
                A receipt has been sent to {donorEmail || "your registered email"}.
              </Text>
            </View>
          </View>

          {/* Blessings card */}
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
      <View style={[s.container, { paddingTop: insets.top }]}>
        {/* Flat white header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Donate / Seva</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Gray band */}
        <View style={s.grayBand} />

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
                  <View style={[s.catIconBox, { backgroundColor: cat.color + "20" }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                  </View>
                  <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                  <Text style={[s.catDesc, active && s.catDescActive]}>{cat.description}</Text>
                  {active && (
                    <View style={s.catCheck}>
                      <Ionicons name="checkmark-circle" size={18} color="#D95D39" />
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
    <View style={[s.container, { paddingTop: insets.top }]}>
      <RazorpayCheckout
        visible={!!checkout}
        options={checkout}
        onSuccess={onPaymentSuccess}
        onClose={() => setCheckout(null)}
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      {/* Flat white header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(STEP_CATEGORY)}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Choose Amount</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Gray band */}
      <View style={s.grayBand} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Category summary chip */}
        {category && (
          <View style={s.catSummary}>
            <View style={[s.catSummaryIcon, { backgroundColor: category.color + "20" }]}>
              <Ionicons name={category.icon} size={16} color={category.color} />
            </View>
            <Text style={s.catSummaryLabel}>{category.label}</Text>
          </View>
        )}

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
              placeholderTextColor="#9CA3AF"
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
                  <Ionicons name={field.icon} size={16} color="#6B7280" />
                  <TextInput
                    style={s.formInput}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
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
              <Ionicons name="chatbubble-outline" size={16} color="#6B7280" style={{ marginTop: 3 }} />
              <TextInput
                style={[s.formInput, { height: 72, textAlignVertical: "top" }]}
                placeholder="Message / Sankalp (optional)"
                placeholderTextColor="#9CA3AF"
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
              <Ionicons name={b.icon} size={14} color="#D95D39" />
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
  container: { flex: 1, backgroundColor: "#fff" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: "Philosopher_700Bold",
    fontSize: 18,
    color: "#111827",
    marginLeft: 10,
  },

  // Gray band
  grayBand: { height: 10, backgroundColor: "#F2F2F2" },

  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#6B7280",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  // Category grid
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    overflow: "hidden",
  },
  catCardActive: {
    borderColor: "#D95D39",
    borderWidth: 1.5,
    backgroundColor: "#FEF3F0",
  },
  catIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#111827" },
  catLabelActive: { color: "#111827" },
  catDesc: { fontFamily: fonts.body, fontSize: 11, color: "#9CA3AF", lineHeight: 15 },
  catDescActive: { color: "#6B7280" },
  catCheck: { position: "absolute", top: 10, right: 10 },

  // Category summary
  catSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F2F0ED",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  catSummaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  catSummaryLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#111827" },

  // Amount presets
  presetsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F2F0ED",
  },
  presetChipActive: { backgroundColor: "#D95D39" },
  presetTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#111827" },
  presetTxtActive: { color: "white" },

  amtInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F0ED",
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
  },
  rupeeSign: { fontFamily: fonts.heading, fontSize: 20, color: "#6B7280", marginRight: 6 },
  amtInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 18,
    color: "#111827",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  amtPreview: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#D95D39", marginTop: 6, textAlign: "center" },

  // Donor form
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    overflow: "hidden",
  },
  formField: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 4 },
  formInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#111827",
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginLeft: 40 },

  // Trust badges
  trustRow: { flexDirection: "row", justifyContent: "space-around" },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustTxt: { fontFamily: fonts.body, fontSize: 11, color: "#6B7280" },

  // Buttons
  primaryBtn: {
    backgroundColor: "#D95D39",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "white" },
  btnDisabled: { opacity: 0.5 },
  outlineBtn: {
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#D95D39",
  },
  outlineBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#D95D39" },

  disclaimer: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 17,
  },

  // Success screen
  successHero: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 32,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontFamily: fonts.heading, fontSize: 26, color: "#111827", letterSpacing: 0.5 },
  successSub: { fontFamily: fonts.body, fontSize: 15, color: "#374151", textAlign: "center", lineHeight: 22 },
  successMeta: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#9CA3AF" },

  receiptCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  receiptTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#111827" },
  receiptMeta: { fontFamily: fonts.body, fontSize: 12, color: "#6B7280", marginTop: 2 },

  blessingsCard: {
    backgroundColor: "#FEF3F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECAB7",
    padding: 20,
  },
  blessingsText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#7C2D12",
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
  },
});
