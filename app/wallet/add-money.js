import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fonts, radius } from "../../lib/theme";
import { useColors } from "../../lib/ThemeContext";
import { walletApi } from "../../lib/api";
import Toast from "../../components/Toast";
import { useToast } from "../../lib/hooks/useToast";
import RazorpayCheckout from "../../components/RazorpayCheckout";

const PRESETS = [100, 200, 500, 1000, 2000, 5000];

const PAYMENT_METHODS = [
  { icon: "card-outline",          label: "Credit / Debit Card" },
  { icon: "phone-portrait-outline",label: "UPI (GPay, PhonePe, Paytm)" },
  { icon: "business-outline",      label: "Net Banking" },
  { icon: "wallet-outline",        label: "Razorpay Wallet" },
];

export default function AddMoneyScreen() {
  const colors = useColors();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState(null);

  const parsed = parseInt(amount) || 0;
  const isValid = parsed >= 10 && parsed <= 100000;

  const handleAddMoney = async () => {
    if (!isValid) {
      showToast(
        parsed < 10 ? "Minimum amount is ₹10" : "Maximum amount is ₹1,00,000",
        "error",
      );
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
          name: "TripKart Wallet",
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
        amount: parsed * 100,
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
      {/* Header */}
      <View style={s.head}>
        <TouchableOpacity
          onPress={() => router.replace("/wallet")}
          style={s.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Add Money</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Amount input card */}
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
          {parsed >= 10 && isValid && (
            <View style={s.amtValidRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.amtValid}>₹{parsed.toLocaleString("en-IN")} will be added</Text>
            </View>
          )}
        </View>

        {/* Quick select */}
        <Text style={s.sectionLabel}>Quick Select</Text>
        <View style={s.presetsGrid}>
          {PRESETS.map((p) => {
            const active = String(parsed) === String(p);
            return (
              <TouchableOpacity
                key={p}
                style={[s.presetBtn, active && s.presetBtnActive]}
                onPress={() => setAmount(String(p))}
              >
                <Text style={[s.presetTxt, active && s.presetTxtActive]}>
                  ₹{p.toLocaleString("en-IN")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payment methods */}
        <View style={s.methodsCard}>
          <View style={s.methodsHeader}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={s.methodsTitle}>Accepted Payment Methods</Text>
          </View>
          {PAYMENT_METHODS.map(({ icon, label }) => (
            <View key={label} style={s.methodRow}>
              <View style={[s.methodIcon, { backgroundColor: colors.primary + "18" }]}>
                <Ionicons name={icon} size={15} color={colors.primary} />
              </View>
              <Text style={s.methodLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.payBtn, (!isValid || loading) && s.payBtnDisabled]}
          onPress={handleAddMoney}
          disabled={!isValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={s.payBtnTxt}>
                Add {parsed > 0 ? `₹${parsed.toLocaleString("en-IN")}` : "Money"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <RazorpayCheckout
        visible={!!checkout}
        options={checkout}
        onSuccess={onPaid}
        onClose={() => setCheckout(null)}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </SafeAreaView>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    // Header
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingBottom: 12,
      paddingTop: 4,
      backgroundColor: colors.bg,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      marginBottom: 4,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.elevated,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    title: {
      fontFamily: fonts.heading,
      fontSize: 20,
      color: colors.textPrimary,
    },

    scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },

    // Amount card
    amtCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      padding: 28,
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    amtLabel: {
      fontFamily: fonts.accent,
      fontSize: 11,
      color: colors.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    amtInputRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    rupee: {
      fontFamily: fonts.heading,
      fontSize: 32,
      color: colors.primary,
    },
    amtInput: {
      fontFamily: fonts.heading,
      fontSize: 52,
      color: colors.textPrimary,
      minWidth: 120,
      textAlign: "center",
    },
    amtError: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.error,
    },
    amtValidRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    amtValid: {
      fontFamily: fonts.bodyMedium,
      fontSize: 12,
      color: colors.success,
    },

    // Quick select
    sectionLabel: {
      fontFamily: fonts.accent,
      fontSize: 10,
      color: colors.textSecondary,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    presetsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    presetBtn: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.borderSubtle,
    },
    presetBtnActive: {
      backgroundColor: colors.primary + "18",
      borderColor: colors.primary,
    },
    presetTxt: {
      fontFamily: fonts.bodyMedium,
      fontSize: 14,
      color: colors.textSecondary,
    },
    presetTxtActive: {
      color: colors.primary,
      fontFamily: fonts.bodyBold,
    },

    // Payment methods
    methodsCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    methodsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    methodsTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    methodRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    methodIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    methodLabel: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },

    // Footer CTA
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    payBtn: {
      height: 54,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    payBtnDisabled: { opacity: 0.45 },
    payBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  });
