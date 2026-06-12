import { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, fonts, radius, shadow } from "../../lib/theme";
import { walletApi } from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import RazorpayCheckout from "../../components/RazorpayCheckout";

const PRESETS = [100, 200, 500, 1000, 2000, 5000];

export default function AddMoneyScreen() {
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState(null);

  const parsed = parseInt(amount) || 0;
  const isValid = parsed >= 10 && parsed <= 100000;

  const handleAddMoney = async () => {
    if (!isValid) {
      showToast(parsed < 10 ? "Minimum amount is ₹10" : "Maximum amount is ₹1,00,000", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await walletApi.createTopupOrder(parsed);
      const order = res?.data || res;
      if (order?.orderId && order?.key) {
        setCheckout({
          key: order.key,
          orderId: order.orderId,
          amount: order.amount,
          currency: order.currency || "INR",
          name: "Book Yatra Wallet",
          description: `Wallet recharge — ₹${parsed}`,
        });
      } else {
        showToast("Payment gateway unavailable", "error");
      }
    } catch (e) {
      showToast(e.message || "Failed to create order", "error");
    } finally {
      setLoading(false);
    }
  };

  const onPaid = async ({ paymentId, orderId, signature }) => {
    setCheckout(null);
    setLoading(true);
    try {
      await walletApi.verifyTopup({
        orderId,
        paymentId,
        signature,
        amount: parsed * 100, // paise
      });
      showToast(`₹${parsed} added to your wallet!`, "success");
      setTimeout(() => router.replace("/wallet"), 1500);
    } catch (e) {
      showToast(e.message || "Verification failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.head}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={s.title}>Add Money</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Amount input */}
        <View style={s.amtCard}>
          <Text style={s.amtLabel}>Enter Amount</Text>
          <View style={s.amtInputRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput
              style={s.amtInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
              maxLength={6}
            />
          </View>
          {parsed > 0 && !isValid && (
            <Text style={s.amtError}>
              {parsed < 10 ? "Minimum ₹10" : "Maximum ₹1,00,000"}
            </Text>
          )}
        </View>

        {/* Preset amounts */}
        <Text style={s.sectionLabel}>Quick Select</Text>
        <View style={s.presetsGrid}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[s.presetBtn, String(parsed) === String(p) && s.presetBtnActive]}
              onPress={() => setAmount(String(p))}
            >
              <Text style={[s.presetTxt, String(parsed) === String(p) && s.presetTxtActive]}>
                ₹{p.toLocaleString("en-IN")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment methods note */}
        <View style={s.methodsCard}>
          <Text style={s.methodsTitle}>Accepted Payment Methods</Text>
          {[
            { icon: "card", label: "Credit / Debit Card" },
            { icon: "phone-portrait", label: "UPI (GPay, PhonePe, Paytm)" },
            { icon: "business", label: "Net Banking" },
            { icon: "wallet", label: "Razorpay Wallet" },
          ].map(({ icon, label }) => (
            <View key={label} style={s.methodRow}>
              <Ionicons name={icon} size={16} color={colors.primary} />
              <Text style={s.methodLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.payBtn, (!isValid || loading) && s.payBtnDisabled]}
          onPress={handleAddMoney}
          disabled={!isValid || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={s.payBtnTxt}>
                  Add {parsed > 0 ? `₹${parsed.toLocaleString("en-IN")}` : "Money"}
                </Text>
              </>
          }
        </TouchableOpacity>
      </View>

      <RazorpayCheckout
        visible={!!checkout}
        options={checkout}
        onSuccess={onPaid}
        onClose={() => setCheckout(null)}
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, ...shadow.soft },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.secondary },
  scroll: { paddingHorizontal: 20, paddingBottom: 100, gap: 20 },
  amtCard: { backgroundColor: colors.surface, borderRadius: radius.xxl, padding: 28, alignItems: "center", gap: 8, ...shadow.card },
  amtLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 2, textTransform: "uppercase" },
  amtInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rupee: { fontFamily: fonts.heading, fontSize: 32, color: colors.secondary },
  amtInput: { fontFamily: fonts.heading, fontSize: 48, color: colors.secondary, minWidth: 120, textAlign: "center" },
  amtError: { fontFamily: fonts.body, fontSize: 12, color: colors.error },
  sectionLabel: { fontFamily: fonts.accent, fontSize: 11, color: colors.textSecondary, letterSpacing: 2, textTransform: "uppercase" },
  presetsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  presetBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderSubtle, ...shadow.soft },
  presetBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  presetTxt: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textSecondary },
  presetTxtActive: { color: colors.primary, fontFamily: fonts.bodyBold },
  methodsCard: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, gap: 12, ...shadow.soft },
  methodsTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  methodLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  payBtn: { height: 54, borderRadius: radius.pill, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  payBtnDisabled: { opacity: 0.5 },
  payBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
